/**
 * 遊戲狀態機：純函式，亂數由 RngFactory 注入。
 * 不合法的動作回傳同一個 run 參考，events 為空。
 */

import { calendarOf, isPayday, isWorkday } from "./calendar.ts";
import {
  DECK_SIZE,
  GAMES_TIRED_PENALTY,
  HEROINE_NIGHT_RATE,
  HEROINE_SEED,
  DAYTIME_REPLY_LIMIT,
  HEROINE_UNLOCK_FAILURES,
  IRIS_NIGHT_RATE,
  IRIS_SEED,
  LURE_MATCH_MULT,
  MAX_MONEY,
  MIXUP_MIN_CHATS,
  MIXUP_P,
  MONTHLY_RENT,
  MONTHLY_SALARY,
  NG_PLUS_REPLY_BONUS,
  NOODLE_PRICE,
  START_MONEY,
  STUDIO_MATCH_P,
  SUPER_LIKE_MAX_P,
  SUPER_LIKE_MULT,
  SUPER_LIKE_PRICE,
} from "./constants.ts";
import { dayEventOf } from "./dayEvents.ts";
import type { DayEvent } from "./dayEvents.ts";
import { dexProgress, endingProgress, isDexComplete, recordFailure } from "./dex.ts";
import type { Dex } from "./dex.ts";
import { avoidFixedSeeds, deckSeed, generateGirl } from "./girl.ts";
import { EDUCATIONS } from "./girlData.ts";
import { holidayMatchMult } from "./holidays.ts";
import { matchProbability, nextStreak, rollMatch } from "./match.ts";
import { MEALS } from "./meals.ts";
import type { Meal, MealDish } from "./meals.ts";
import {
  DEFAULT_GROOMING,
  DEFAULT_PROFILE,
  SHOP_ITEM_BY_ID,
  applyPurchase,
  canBuy,
  canUsePhoto,
  isProfileBioId,
  isProfilePhotoId,
  profileCategoryMult,
  profileMatchMult,
} from "./profile.ts";
import type { Grooming, Profile, ProfileBioId, ProfilePhotoId, ShopItemId } from "./profile.ts";
import { createRng, mixSeed, pick, randInt } from "./rng.ts";
import type { Rng } from "./rng.ts";
import {
  HEROINE_STORY_ID,
  IRIS_STORY_ID,
  MIXUP_STORY_ID,
  STORIES,
  STORY_BY_ID,
  STUDIO_STORY_ID,
} from "./stories/index.ts";
import {
  chatScore,
  dueDateChat,
  isChatReady,
  isFinal,
  isWarmOpener,
  pendingDateStep,
  pickStory,
  renderLine,
} from "./story.ts";
import {
  CALM_DELTA,
  applyDelta,
  calmChoice,
  canCalm,
  jumpToEnding,
  replyDelta,
  shouldSoftEnd,
  statsOf,
} from "./chatStats.ts";
import type { Chat, OpenerKind } from "./storyTypes.ts";

export type Phase = "payday" | "daytime" | "evening" | "night" | "swiping" | "matched" | "nightDone";

export const PHASES: readonly Phase[] = ["payday", "daytime", "evening", "night", "swiping", "matched", "nightDone"];

/** memory 只有新遊戲＋能選，放最後，前四個的索引（抽劇情的亂數鍵）不變 */
export const OPENER_KINDS: readonly OpenerKind[] = ["hi", "whatsup", "eaten", "interest", "memory"];

export type SwipeDir = "left" | "right" | "super";

/** 今天白天的狀態；睡覺歸零 */
export interface TodayState {
  /** 白天事件選過了 */
  eventDone: boolean;
  /** 答應加班：下班直接回家，今晚不能滑 */
  overtime: boolean;
  /** 昨晚打電動，今天睡太晚 */
  tired: boolean;
}

export const FRESH_TODAY: TodayState = { eventDone: false, overtime: false, tired: false };

export interface RunState {
  v: 1;
  runSeed: number;
  dayIndex: number;
  money: number;
  phase: Phase;
  rightStreak: number;
  deckIndex: number;
  pendingMatchSeed: number | null;
  offeredMealId: string | null;
  chats: Chat[];
  nextChatId: number;
  /** 這一局已經右滑過小晴（不管還在走還是走回失敗），她就不會再出現 */
  heroineMet: boolean;
  /** 今天白天已認真回過幾則；睡覺歸零 */
  dayReplies: number;
  /** 今晚是否已打手槍／打電動（各一次）；calm：打完手槍之後，今晚還能用一次賢者模式 */
  nightHobby: { solo: boolean; games: boolean; calm: boolean };
  /** 冠宇自己的 Swipy 檔案 */
  profile: Profile;
  /** 買過、還有效的東西 */
  grooming: Grooming;
  today: TodayState;
  /** 新遊戲＋：走過結局之後重開的一局 */
  ngPlus: boolean;
  /** 這一局已經右滑過 Iris，她就不會再出現 */
  irisMet: boolean;
  /** 最後一次配對是哪一天，成就「三十天的沉默」用 */
  lastMatchDay: number;
  /** 今晚右滑了幾張、配對幾個；睡覺歸零 */
  nightLog: { rights: number; matches: number };
}

export type GameAction =
  | { type: "ackPayday" }
  /** calm：賢者模式，只能選 calmChoice 那一句 */
  | { type: "reply"; chatId: number; choice: number; calm?: boolean }
  | { type: "closeChat"; chatId: number }
  | { type: "goOnDate"; choice: number }
  | { type: "endDaytime" }
  | { type: "eatOut" }
  | { type: "goHome" }
  | { type: "openApp" }
  | { type: "swipe"; dir: SwipeDir }
  | { type: "chooseOpener"; opener: OpenerKind }
  | { type: "quitApp" }
  | { type: "jerkOff" }
  | { type: "playGames" }
  | { type: "sleep" }
  | { type: "buy"; item: ShopItemId }
  | { type: "editProfile"; photo: ProfilePhotoId; bio: ProfileBioId }
  | { type: "dayEvent"; choice: number };

export type GameEvent =
  | { type: "payday"; before: number; after: number }
  | { type: "meal"; name: string; price: number; narration: string; dish: MealDish }
  | { type: "swiped"; dir: SwipeDir }
  | { type: "matched"; girlSeed: number }
  | { type: "noMatch" }
  /** 左滑了一張有業績的卡 */
  | { type: "dodged"; girlSeed: number }
  | { type: "chatAdvanced"; chatId: number }
  /** 用了賢者模式 */
  | { type: "calm"; chatId: number }
  /** 傳錯人：要給 chatId 的那句傳到了 toGirlSeed，後面跟著一個 chatEnded */
  | { type: "mixup"; chatId: number; toGirlSeed: number }
  | { type: "bought"; item: ShopItemId; price: number; line: string }
  | { type: "dayEvent"; eventId: string; choice: number; money: number; line: string; overtime: boolean }
  /** 睡了一覺；fromDay 是睡前那天 */
  | { type: "slept"; fromDay: number }
  | {
      type: "chatEnded";
      /** 結束的是哪一個人：傳錯人、睡一覺她走了的時候，不是玩家手上那個聊天 */
      girlSeed: number;
      storyId: string;
      narration: string;
      paid: number;
      firstTime: boolean;
      antiFraud: boolean;
    }
  | { type: "dexCompleted" }
  /** 演得像失敗結局，但沒有記圖鑑，聊天也還在 */
  | { type: "fakeEnding"; storyId: string; narration: string }
  | { type: "dateFinished"; index: number; cost: number }
  /** 這一局走到結局了，存檔要用 settleRun 清掉 */
  | { type: "gameEnding"; endingId: string }
  | { type: "hobby"; kind: "solo" | "games"; narration: string };

export type RngFactory = (purpose: "meal" | "match" | "story", ...keys: number[]) => Rng;

export interface AdvanceResult {
  run: RunState;
  dex: Dex;
  events: GameEvent[];
}

const PURPOSE_KEY = { meal: 1, match: 2, story: 3 } as const;

/** 這個動作之後要存哪一局：走到結局（瓢蟲、真結局）這一局就沒了，null 代表不能再繼續，圖鑑另外留著 */
export function settleRun(result: AdvanceResult): RunState | null {
  return result.events.some((e) => e.type === "gameEnding") ? null : result.run;
}

export const FRESH_NIGHT_HOBBY: RunState["nightHobby"] = { solo: false, games: false, calm: false };

export function createRun(runSeed: number, options: { ngPlus?: boolean } = {}): RunState {
  return {
    v: 1,
    runSeed,
    dayIndex: 0,
    money: START_MONEY,
    phase: "daytime",
    rightStreak: 0,
    deckIndex: 0,
    pendingMatchSeed: null,
    offeredMealId: null,
    chats: [],
    nextChatId: 1,
    heroineMet: false,
    dayReplies: 0,
    nightHobby: { ...FRESH_NIGHT_HOBBY },
    profile: { ...DEFAULT_PROFILE },
    grooming: { ...DEFAULT_GROOMING },
    today: { ...FRESH_TODAY },
    ngPlus: Boolean(options.ngPlus),
    irisMet: false,
    lastMatchDay: 0,
    nightLog: { rights: 0, matches: 0 },
  };
}

/** 今天白天的事件（不管選過沒）；只由 runSeed、dayIndex 決定 */
export function todayEvent(run: RunState): DayEvent | null {
  return dayEventOf(run.runSeed, run.dayIndex);
}

/** 今天白天還沒選的事件 */
export function pendingDayEvent(run: RunState): DayEvent | null {
  return run.phase === "daytime" && !run.today.eventDone ? todayEvent(run) : null;
}

/** 今天白天能認真回幾則：新遊戲＋多一則、颱風假多兩則、昨晚打電動少一則，至少一則 */
export function dayReplyLimit(run: RunState): number {
  const bonus = (run.ngPlus ? NG_PLUS_REPLY_BONUS : 0) + (todayEvent(run)?.replyBonus ?? 0);
  return Math.max(1, DAYTIME_REPLY_LIMIT + bonus - (run.today.tired ? GAMES_TIRED_PENALTY : 0));
}

/** 現在還能認真回幾則：白天有上限，晚上不限（Infinity） */
export function repliesLeft(run: RunState): number {
  return run.phase === "daytime" ? Math.max(0, dayReplyLimit(run) - run.dayReplies) : Infinity;
}

/** 冠宇現在的檔案讓配對率乘上多少（含節日） */
export function runMatchMult(run: RunState): number {
  return profileMatchMult(run.profile, run.grooming, run.dayIndex) * holidayMatchMult(run.dayIndex);
}

/** 週末白天才能出門打理自己；Swipy Gold 拿得起手機就能買 */
export function canShopNow(run: RunState, item: ShopItemId): boolean {
  const where = SHOP_ITEM_BY_ID[item].where;
  if (where === "app") return canUsePhone(run.phase);
  return run.phase === "daytime" && !isWorkday(calendarOf(run.dayIndex));
}

function affordableShopItems(run: RunState): ShopItemId[] {
  return (Object.keys(SHOP_ITEM_BY_ID) as ShopItemId[]).filter(
    (id) => canShopNow(run, id) && canBuy(id, run.grooming) && run.money >= SHOP_ITEM_BY_ID[id].price
  );
}

/** 亂數由 runSeed、用途、鍵值導出，不存游標 */
export function seededRngs(runSeed: number): RngFactory {
  return (purpose, ...keys) => createRng(mixSeed(runSeed, PURPOSE_KEY[purpose], ...keys));
}

export function applyCost(money: number, cost: number): number {
  return Math.max(0, money - cost);
}

export function drawMeal(rng: Rng): Meal {
  return pick(rng, MEALS);
}

export function offeredMeal(run: RunState): Meal | undefined {
  return MEALS.find((m) => m.id === run.offeredMealId);
}

function storyStep(chat: Chat) {
  return STORY_BY_ID[chat.storyId]?.steps[chat.stepIndex];
}

/** 小晴今晚排在牌組第幾張，null 代表今晚沒有她；只由 runSeed、dayIndex 決定，重新載入不能重擲 */
export function heroineCardIndex(run: RunState, dex: Dex): number | null {
  if (run.heroineMet || dexProgress(dex).collected < HEROINE_UNLOCK_FAILURES) return null;
  const rng = createRng(mixSeed(run.runSeed, run.dayIndex, 0x5a1e));
  return rng() < HEROINE_NIGHT_RATE ? randInt(rng, 0, DECK_SIZE - 1) : null;
}

/**
 * 今晚牌組第幾張是誰。
 * 避開已經在聊的 girlSeed，同晚暱稱也不重複——配對回覆完回到下一張時，
 * 才不會因為 40 個暱稱撞名看起來還是同一個人。
 */
/**
 * Iris 今晚排在牌組第幾張：走過任何一個結局之後才會出現，一晚一半機率。
 * 跟小晴排到同一張時往後挪一張。
 */
export function irisCardIndex(run: RunState, dex: Dex): number | null {
  if (run.irisMet || endingProgress(dex).collected === 0) return null;
  const rng = createRng(mixSeed(run.runSeed, run.dayIndex, 0x1215));
  if (rng() >= IRIS_NIGHT_RATE) return null;
  const index = randInt(rng, 0, DECK_SIZE - 1);
  return heroineCardIndex(run, dex) === index ? (index + 1) % DECK_SIZE : index;
}

export function deckCardSeed(run: RunState, dex: Dex, cardIndex: number): number {
  if (heroineCardIndex(run, dex) === cardIndex) return HEROINE_SEED;
  if (irisCardIndex(run, dex) === cardIndex) return IRIS_SEED;

  const takenSeeds = new Set<number>();
  const takenNicks = new Set<string>();
  for (const chat of run.chats) {
    takenSeeds.add(chat.girlSeed);
    takenNicks.add(generateGirl(chat.girlSeed).nickname);
  }
  for (let i = 0; i < cardIndex; i++) {
    const prev = deckCardSeed(run, dex, i);
    takenSeeds.add(prev);
    takenNicks.add(generateGirl(prev).nickname);
  }

  for (let salt = 0; salt < 64; salt++) {
    const raw =
      salt === 0
        ? deckSeed(run.runSeed, run.dayIndex, cardIndex)
        : mixSeed(run.runSeed, run.dayIndex, cardIndex, 0xca4d, salt);
    const seed = avoidFixedSeeds(raw);
    if (takenSeeds.has(seed)) continue;
    if (takenNicks.has(generateGirl(seed).nickname)) continue;
    return seed;
  }
  // 暱稱池幾乎用盡時至少保證 seed 不跟已聊的重複
  for (let salt = 64; salt < 320; salt++) {
    const raw = mixSeed(run.runSeed, run.dayIndex, cardIndex, 0xca4d, salt);
    const seed = avoidFixedSeeds(raw);
    if (!takenSeeds.has(seed)) return seed;
  }
  return deckSeed(run.runSeed, run.dayIndex, cardIndex);
}

/** 今天付得起、可以出門赴約的那一場 */
function affordableDate(run: RunState) {
  const chat = dueDateChat(run.chats, run.dayIndex);
  const step = chat && pendingDateStep(chat);
  return chat && step?.date && run.money >= step.date.cost ? { chat, step, date: step.date } : null;
}

/** 手機拿得起來的階段：白天，還有回到家之後；吃飯、滑卡、配對的畫面中不行 */
export function canUsePhone(phase: Phase): boolean {
  return phase === "daytime" || phase === "night" || phase === "nightDone";
}

function chatActions(run: RunState): GameAction["type"][] {
  const steps = run.chats.filter((c) => isChatReady(c, run.dayIndex, run.phase)).map(storyStep);
  const actions: GameAction["type"][] = [];
  const canReply =
    steps.some((s) => s && !isFinal(s)) &&
    repliesLeft(run) > 0;
  if (canReply) actions.push("reply");
  if (steps.some((s) => s && isFinal(s))) actions.push("closeChat");
  return actions;
}

/** 一般失敗線、還沒走到結局步的聊天：傳錯人只會發生在這些聊天之間 */
function isOpenNormalChat(chat: Chat): boolean {
  const step = storyStep(chat);
  return step !== undefined && !isFinal(step) && STORIES.some((s) => s.id === chat.storyId);
}

/**
 * 回 chat 這一句時，會不會傳到別人那邊；會的話回傳被傳錯的那個聊天。
 * 同時在聊 MIXUP_MIN_CHATS 個以上才會發生。由 runSeed、聊天、步驟決定，重新載入不能重擲。
 */
export function mixupVictim(run: RunState, chat: Chat): Chat | null {
  if (!isOpenNormalChat(chat)) return null;
  const others = run.chats.filter((c) => c !== chat && isOpenNormalChat(c));
  if (others.length + 1 < MIXUP_MIN_CHATS) return null;
  const rng = createRng(mixSeed(run.runSeed, chat.id, chat.stepIndex, 0x313));
  if (rng() >= MIXUP_P) return null;
  return pick(rng, others);
}

/** 有得選的事件，錢不夠的選項不算 */
function canPickDayEvent(run: RunState): boolean {
  const event = pendingDayEvent(run);
  return Boolean(event?.choices.some((c) => run.money + (c.money ?? 0) >= 0));
}

export function legalActions(run: RunState): GameAction["type"][] {
  const shop: GameAction["type"][] = affordableShopItems(run).length > 0 ? ["buy"] : [];
  switch (run.phase) {
    case "payday":
      return ["ackPayday"];
    case "daytime": {
      const actions = chatActions(run);
      if (affordableDate(run)) actions.push("goOnDate");
      if (canPickDayEvent(run)) actions.push("dayEvent");
      actions.push(...shop, "endDaytime");
      return actions;
    }
    case "evening": {
      const meal = offeredMeal(run);
      return meal && run.money >= meal.price ? ["eatOut", "goHome"] : ["goHome"];
    }
    case "night": {
      const actions: GameAction["type"][] = [...chatActions(run), "openApp", "sleep"];
      if (!run.nightHobby.solo) actions.splice(actions.length - 1, 0, "jerkOff");
      if (!run.nightHobby.games) actions.splice(actions.length - 1, 0, "playGames");
      actions.splice(actions.length - 1, 0, "editProfile", ...shop);
      return actions;
    }
    case "swiping":
      return ["swipe", "quitApp"];
    case "matched":
      return ["chooseOpener"];
    case "nightDone":
      return [...chatActions(run), "editProfile", ...shop, "sleep"];
  }
}

export function advance(run: RunState, dex: Dex, action: GameAction, rngs?: RngFactory): AdvanceResult {
  const same: AdvanceResult = { run, dex, events: [] };
  const factory = rngs ?? seededRngs(run.runSeed);

  switch (action.type) {
    case "ackPayday": {
      if (run.phase !== "payday") return same;
      const after = Math.min(MAX_MONEY, run.money + MONTHLY_SALARY - MONTHLY_RENT);
      return {
        run: { ...run, money: after, phase: "daytime" },
        dex,
        events: [{ type: "payday", before: run.money, after }],
      };
    }

    case "reply": {
      if (!canUsePhone(run.phase)) return same;
      if (repliesLeft(run) <= 0) return same;
      const chat = run.chats.find((c) => c.id === action.chatId);
      if (!chat || !isChatReady(chat, run.dayIndex, run.phase)) return same;
      const step = storyStep(chat);
      if (!step || isFinal(step)) return same;
      if (!Number.isInteger(action.choice) || action.choice < 0 || action.choice >= step.replies.length) return same;
      // 賢者模式：打完手槍的那一晚一次，只能選冷靜下來看得出來的那一句
      const calm = action.calm === true;
      if (calm && (!run.nightHobby.calm || !canCalm(step) || action.choice !== calmChoice(step))) return same;
      if (step.decision?.choice === action.choice) {
        const { cost, endingId } = step.decision;
        if (run.money < cost) return same;
        return {
          run: { ...run, money: run.money - cost, chats: run.chats.filter((c) => c !== chat) },
          dex: recordFailure(dex, endingId, run.dayIndex),
          events: [{ type: "gameEnding", endingId }],
        };
      }
      const { heroineNightUsed: _ignored, ...chatRest } = chat;
      const delta = calm ? CALM_DELTA : replyDelta(step, action.choice);
      let stats = applyDelta(statsOf(chat), delta);
      // 最討厭已讀不回的她：回了就不再累積
      if (STORY_BY_ID[chat.storyId]?.patience) stats = { ...stats, pressure: 0 };
      let next: Chat = {
        ...chatRest,
        stepIndex: chat.stepIndex + 1,
        lastAdvancedDay: run.dayIndex,
        replies: [...chat.replies, action.choice],
        stats,
        // 小晴：白天回完清掉標記；晚上回過（含加成）就設 true，避免同一晚連推
        ...(chat.girlSeed === HEROINE_SEED
          ? { heroineNightUsed: run.phase === "night" || run.phase === "nightDone" }
          : {}),
      };
      // 總分不夠就換到失敗路線；兩條路線前面的對話相同，對話紀錄接得起來
      if (step.gate && chatScore(next) < step.gate.minScore) next.storyId = step.gate.failStoryId;
      const story = STORY_BY_ID[next.storyId];
      // 一般失敗線才提早收：隱藏路線／小晴不套這套
      const isNormalFailure = STORIES.some((s) => s.id === next.storyId);
      if (isNormalFailure && story && !step.fakeEnding && !step.date && !step.decision && shouldSoftEnd(stats)) {
        const last = story.steps[story.steps.length - 1];
        if (last && isFinal(last) && next.stepIndex < story.steps.length - 1) {
          next = jumpToEnding(next, story, action.choice);
          next.stats = stats;
        }
      }
      const events: GameEvent[] = [{ type: "chatAdvanced", chatId: chat.id }];
      if (calm) events.push({ type: "calm", chatId: chat.id });
      if (step.fakeEnding) events.push({ type: "fakeEnding", ...step.fakeEnding });
      let chats = run.chats.map((c) => (c === chat ? next : c));
      let nextDex = dex;
      // 同時聊太多人：這句有機會傳到別人那邊。賢者模式很冷靜，不會傳錯
      const victim = calm ? null : mixupVictim(run, chat);
      if (victim) {
        const from = generateGirl(chat.girlSeed);
        const to = generateGirl(victim.girlSeed);
        const text = renderLine(step.replies[action.choice], from);
        chats = chats.filter((c) => c !== victim);
        nextDex = recordFailure(dex, MIXUP_STORY_ID, run.dayIndex);
        events.push(
          { type: "mixup", chatId: chat.id, toGirlSeed: victim.girlSeed },
          {
            type: "chatEnded",
            girlSeed: victim.girlSeed,
            storyId: MIXUP_STORY_ID,
            narration: `我把要給${from.nickname}的「${text}」，傳給了${to.nickname}。我馬上收回，她已經讀了。我重新傳給${from.nickname}，${to.nickname}那邊再也沒有亮過。`,
            paid: 0,
            firstTime: !Object.hasOwn(dex, MIXUP_STORY_ID),
            antiFraud: false,
          }
        );
      }
      return {
        run: {
          ...run,
          dayReplies: run.phase === "daytime" ? run.dayReplies + 1 : run.dayReplies,
          nightHobby: calm ? { ...run.nightHobby, calm: false } : run.nightHobby,
          chats,
        },
        dex: nextDex,
        events,
      };
    }

    case "goOnDate": {
      if (run.phase !== "daytime") return same;
      const due = affordableDate(run);
      if (!due) return same;
      const { chat, step, date } = due;
      if (!Number.isInteger(action.choice) || action.choice < 0 || action.choice >= step.replies.length) return same;
      const money = run.money - date.cost;
      const finished: GameEvent = { type: "dateFinished", index: date.index, cost: date.cost };
      if (date.endingId) {
        return {
          run: { ...run, money, chats: run.chats.filter((c) => c !== chat) },
          dex: recordFailure(dex, date.endingId, run.dayIndex),
          events: [finished, { type: "gameEnding", endingId: date.endingId }],
        };
      }
      const { heroineNightUsed: _ignored, ...chatRest } = chat;
      const next: Chat = {
        ...chatRest,
        stepIndex: chat.stepIndex + 1,
        lastAdvancedDay: run.dayIndex,
        replies: [...chat.replies, action.choice],
        // 約會走白天：回完清掉小晴夜間標記（晚上才會再設）
        ...(chat.girlSeed === HEROINE_SEED ? { heroineNightUsed: false } : {}),
      };
      // 約會佔掉一整天，回到家已經是深夜，晚餐也吃過了
      return {
        run: { ...run, money, phase: "night", offeredMealId: null, chats: run.chats.map((c) => (c === chat ? next : c)) },
        dex,
        events: [finished],
      };
    }

    case "closeChat": {
      if (!canUsePhone(run.phase)) return same;
      const chat = run.chats.find((c) => c.id === action.chatId);
      if (!chat || !isChatReady(chat, run.dayIndex, run.phase)) return same;
      const step = storyStep(chat);
      if (!step || !isFinal(step)) return same;
      const { narration, cost = 0, antiFraud } = step.ending;
      const money = applyCost(run.money, cost);
      const nextDex = recordFailure(dex, chat.storyId, run.dayIndex);
      const events: GameEvent[] = [
        {
          type: "chatEnded",
          girlSeed: chat.girlSeed,
          storyId: chat.storyId,
          narration: renderLine(narration, generateGirl(chat.girlSeed)),
          paid: run.money - money,
          firstTime: !Object.hasOwn(dex, chat.storyId),
          antiFraud: Boolean(antiFraud),
        },
      ];
      if (!isDexComplete(dex) && isDexComplete(nextDex)) events.push({ type: "dexCompleted" });
      return {
        run: { ...run, money, chats: run.chats.filter((c) => c !== chat) },
        dex: nextDex,
        events,
      };
    }

    case "endDaytime": {
      if (run.phase !== "daytime") return same;
      // 加班：公司便當，回到家只剩回訊息的力氣
      if (run.today.overtime) return { run: { ...run, phase: "nightDone", offeredMealId: null }, dex, events: [] };
      const meal = drawMeal(factory("meal", run.dayIndex));
      return { run: { ...run, phase: "evening", offeredMealId: meal.id }, dex, events: [] };
    }

    case "eatOut": {
      if (run.phase !== "evening") return same;
      const meal = offeredMeal(run);
      if (!meal || run.money < meal.price) return same;
      return {
        run: { ...run, phase: "night", money: run.money - meal.price, offeredMealId: null },
        dex,
        events: [{ type: "meal", name: meal.name, price: meal.price, narration: meal.narration, dish: meal.dish }],
      };
    }

    case "goHome":
      if (run.phase !== "evening") return same;
      return {
        run: { ...run, phase: "night", money: applyCost(run.money, NOODLE_PRICE), offeredMealId: null },
        dex,
        events: [],
      };

    case "openApp":
      if (run.phase !== "night") return same;
      return { run: { ...run, phase: "swiping", deckIndex: 0 }, dex, events: [] };

    case "swipe": {
      if (run.phase !== "swiping" || run.deckIndex >= DECK_SIZE) return same;
      if (action.dir !== "left" && action.dir !== "right" && action.dir !== "super") return same;
      const superLike = action.dir === "super";
      if (superLike && run.money < SUPER_LIKE_PRICE) return same;
      const deckIndex = run.deckIndex + 1;
      const swiped: GameEvent = { type: "swiped", dir: action.dir };
      const afterDeck: Phase = deckIndex >= DECK_SIZE ? "nightDone" : "swiping";
      const rightStreak = nextStreak(run.rightStreak, action.dir === "left" ? "left" : "right");
      const seed = deckCardSeed(run, dex, run.deckIndex);
      if (action.dir === "left") {
        // 看得出來是業績，左滑掉
        const events: GameEvent[] = generateGirl(seed).lure ? [swiped, { type: "dodged", girlSeed: seed }] : [swiped];
        return { run: { ...run, deckIndex, rightStreak, phase: afterDeck }, dex, events };
      }
      const money = superLike ? run.money - SUPER_LIKE_PRICE : run.money;
      const rights = run.nightLog.rights + 1;
      const matchedRun = (patch: Partial<RunState>): AdvanceResult => ({
        run: {
          ...run,
          ...patch,
          money,
          deckIndex,
          rightStreak,
          phase: "matched",
          pendingMatchSeed: seed,
          lastMatchDay: run.dayIndex,
          nightLog: { rights, matches: run.nightLog.matches + 1 },
        },
        dex,
        events: [swiped, { type: "matched", girlSeed: seed }],
      });
      // 小晴、Iris 右滑一定配對，不看一般機率；當局不會再出現
      if (seed === HEROINE_SEED) return matchedRun({ heroineMet: true });
      if (seed === IRIS_SEED) return matchedRun({ irisMet: true });
      const girl = generateGirl(seed);
      const eduMod = EDUCATIONS.find((e) => e.id === girl.education)?.matchMod ?? 0;
      const mult = runMatchMult(run) * (girl.lure ? LURE_MATCH_MULT : 1) * (superLike ? SUPER_LIKE_MULT : 1);
      const p = girl.studio
        ? STUDIO_MATCH_P
        : matchProbability({
            pickiness: girl.pickiness,
            rightStreak: run.rightStreak,
            age: girl.age,
            eduMod,
            mult,
            ...(superLike ? { maxP: SUPER_LIKE_MAX_P } : {}),
          });
      if (rollMatch(p, factory("match", run.dayIndex, run.deckIndex))) return matchedRun({});
      return {
        run: { ...run, money, deckIndex, rightStreak, phase: afterDeck, nightLog: { ...run.nightLog, rights } },
        dex,
        events: [swiped, { type: "noMatch" }],
      };
    }

    case "chooseOpener": {
      if (run.phase !== "matched" || run.pendingMatchSeed === null) return same;
      const openerIndex = OPENER_KINDS.indexOf(action.opener);
      if (openerIndex < 0) return same;
      // 上一輪學到的那句，只有新遊戲＋才講得出來
      if (action.opener === "memory" && !run.ngPlus) return same;
      const girlSeed = run.pendingMatchSeed;
      const girl = generateGirl(girlSeed);
      const activeStoryIds = run.chats.map((c) => c.storyId);
      // 個工只走隱藏路線；同時已經有一條在聊，就當一般人抽
      const story =
        girlSeed === HEROINE_SEED
          ? STORY_BY_ID[HEROINE_STORY_ID]
          : girlSeed === IRIS_SEED
            ? STORY_BY_ID[IRIS_STORY_ID]
            : girl.studio && !activeStoryIds.includes(STUDIO_STORY_ID)
              ? STORY_BY_ID[STUDIO_STORY_ID]
              : pickStory(action.opener, dex, activeStoryIds, factory("story", girlSeed, openerIndex), {
                  lure: girl.lure,
                  categoryMult: profileCategoryMult(run.profile),
                });
      const chat: Chat = {
        id: run.nextChatId,
        girlSeed,
        storyId: story.id,
        opener: action.opener,
        stepIndex: 0,
        lastAdvancedDay: run.dayIndex,
        replies: [],
        stats: { affection: isWarmOpener(action.opener) ? 1 : 0, awkward: 0, pressure: 0 },
      };
      return {
        run: {
          ...run,
          phase: run.deckIndex >= DECK_SIZE ? "nightDone" : "swiping",
          pendingMatchSeed: null,
          chats: [...run.chats, chat],
          nextChatId: run.nextChatId + 1,
        },
        dex,
        events: [],
      };
    }

    case "quitApp":
      if (run.phase !== "swiping") return same;
      return { run: { ...run, phase: "nightDone" }, dex, events: [] };

    case "sleep": {
      if (run.phase !== "night" && run.phase !== "nightDone") return same;
      const dayIndex = run.dayIndex + 1;
      // 已讀壓力：今天能回卻沒回的聊天，隔天壓力 +1；打電動的晚上不算（在打排位，沒看到）
      let chats = run.chats.map((chat) => {
        if (run.nightHobby.games) return chat;
        if (!isChatReady(chat, run.dayIndex, run.phase)) return chat;
        const step = storyStep(chat);
        if (!step || isFinal(step)) return chat;
        const stats = applyDelta(statsOf(chat), { affection: 0, awkward: 0, pressure: 1 });
        return { ...chat, stats };
      });
      const events: GameEvent[] = [{ type: "slept", fromDay: run.dayIndex }];
      let nextDex = dex;
      // 最討厭已讀不回的她：壓力滿了，睡一覺起來她就走了
      for (const chat of chats) {
        const patience = STORY_BY_ID[chat.storyId]?.patience;
        if (!patience || statsOf(chat).pressure < patience.max) continue;
        const leave = STORY_BY_ID[patience.leaveStoryId];
        const last = leave?.steps[leave.steps.length - 1];
        if (!last || !isFinal(last)) continue;
        chats = chats.filter((c) => c !== chat);
        events.push({
          type: "chatEnded",
          girlSeed: chat.girlSeed,
          storyId: leave.id,
          narration: renderLine(last.ending.narration, generateGirl(chat.girlSeed)),
          paid: 0,
          firstTime: !Object.hasOwn(nextDex, leave.id),
          antiFraud: false,
        });
        nextDex = recordFailure(nextDex, leave.id, run.dayIndex);
      }
      return {
        run: {
          ...run,
          dayIndex,
          deckIndex: 0,
          dayReplies: 0,
          nightHobby: { ...FRESH_NIGHT_HOBBY },
          today: { ...FRESH_TODAY, tired: run.nightHobby.games },
          nightLog: { rights: 0, matches: 0 },
          phase: isPayday(calendarOf(dayIndex)) ? "payday" : "daytime",
          chats,
        },
        dex: nextDex,
        events,
      };
    }

    case "buy": {
      const item = SHOP_ITEM_BY_ID[action.item];
      if (!item || !canShopNow(run, action.item) || !canBuy(action.item, run.grooming)) return same;
      if (run.money < item.price) return same;
      return {
        run: {
          ...run,
          money: run.money - item.price,
          grooming: applyPurchase(run.grooming, action.item, run.dayIndex),
        },
        dex,
        events: [{ type: "bought", item: action.item, price: item.price, line: item.line }],
      };
    }

    case "editProfile": {
      if (run.phase !== "night" && run.phase !== "nightDone") return same;
      if (!isProfilePhotoId(action.photo) || !isProfileBioId(action.bio)) return same;
      if (!canUsePhoto(action.photo, run.grooming)) return same;
      if (action.photo === run.profile.photo && action.bio === run.profile.bio) return same;
      return { run: { ...run, profile: { photo: action.photo, bio: action.bio } }, dex, events: [] };
    }

    case "dayEvent": {
      const event = pendingDayEvent(run);
      if (!event) return same;
      const choice = event.choices[action.choice];
      if (!Number.isInteger(action.choice) || !choice) return same;
      const delta = choice.money ?? 0;
      if (run.money + delta < 0) return same;
      return {
        run: {
          ...run,
          money: Math.min(MAX_MONEY, run.money + delta),
          today: { ...run.today, eventDone: true, overtime: Boolean(choice.overtime) },
        },
        dex,
        events: [
          {
            type: "dayEvent",
            eventId: event.id,
            choice: action.choice,
            money: delta,
            line: choice.line,
            overtime: Boolean(choice.overtime),
          },
        ],
      };
    }

    case "jerkOff": {
      if (run.phase !== "night" || run.nightHobby.solo) return same;
      return {
        run: { ...run, nightHobby: { ...run.nightHobby, solo: true, calm: true } },
        dex,
        events: [
          {
            type: "hobby",
            kind: "solo",
            narration: "門鎖好。耳機開著。三分鐘後我盯著天花板，突然很想知道她讀了沒有。",
          },
        ],
      };
    }

    case "playGames": {
      if (run.phase !== "night" || run.nightHobby.games) return same;
      return {
        run: { ...run, nightHobby: { ...run.nightHobby, games: true } },
        dex,
        events: [
          {
            type: "hobby",
            kind: "games",
            narration: "開了一局排位。打輸的時候我沒罵隊友，只是把手機翻過來又翻過去。",
          },
        ],
      };
    }

    default:
      return same;
  }
}

/** 回傳違反的規則，空陣列代表狀態正常 */
export function checkInvariants(run: RunState): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(run.money) || run.money < 0) errors.push(`錢不合法：${run.money}`);
  if (!Number.isInteger(run.dayIndex) || run.dayIndex < 0) errors.push(`天數不合法：${run.dayIndex}`);
  if (!Number.isInteger(run.rightStreak) || run.rightStreak < 0) errors.push(`連續次數不合法：${run.rightStreak}`);
  if (!Number.isInteger(run.deckIndex) || run.deckIndex < 0 || run.deckIndex > DECK_SIZE) {
    errors.push(`牌組位置不合法：${run.deckIndex}`);
  }
  if (!PHASES.includes(run.phase)) errors.push(`未知階段：${run.phase}`);
  if (run.phase === "swiping" && run.deckIndex >= DECK_SIZE) errors.push("滑卡階段已經沒有牌了");
  if (run.phase === "matched" && run.pendingMatchSeed === null) errors.push("配對階段沒有對象");
  if (run.phase !== "matched" && run.pendingMatchSeed !== null) errors.push("不是配對階段卻有對象");
  if (run.phase === "evening" && !offeredMeal(run)) errors.push(`晚上的餐點無效：${run.offeredMealId}`);
  if (!run.heroineMet && run.chats.some((c) => c.girlSeed === HEROINE_SEED)) errors.push("和小晴在聊天卻沒有遇過她");
  if (!Number.isInteger(run.dayReplies) || run.dayReplies < 0) errors.push(`白天回覆數不合法：${run.dayReplies}`);
  if (
    !run.nightHobby ||
    typeof run.nightHobby.solo !== "boolean" ||
    typeof run.nightHobby.games !== "boolean" ||
    typeof run.nightHobby.calm !== "boolean"
  ) {
    errors.push("今晚消遣狀態不合法");
  }
  if (run.nightHobby?.calm && !run.nightHobby.solo) errors.push("沒打手槍卻有賢者模式");
  if (!run.irisMet && run.chats.some((c) => c.girlSeed === IRIS_SEED)) errors.push("和 Iris 在聊天卻沒有遇過她");
  if (!isProfilePhotoId(run.profile?.photo) || !isProfileBioId(run.profile?.bio)) errors.push("個人檔案不合法");
  else if (!canUsePhoto(run.profile.photo, run.grooming)) errors.push("用了還沒拍的照片");
  if (!Number.isInteger(run.lastMatchDay) || run.lastMatchDay < 0 || run.lastMatchDay > run.dayIndex) {
    errors.push(`最後配對日不合法：${run.lastMatchDay}`);
  }
  if (run.chats.some((c) => c.opener === "memory") && !run.ngPlus) errors.push("不是新遊戲＋卻用了上一輪的開場白");
  if (run.nightLog.matches > run.nightLog.rights || run.nightLog.rights > DECK_SIZE) errors.push("今晚滑卡紀錄不合法");

  const ids = new Set<number>();
  for (const chat of run.chats) {
    const where = `聊天 ${chat.id}`;
    if (!Number.isInteger(chat.id)) errors.push(`${where} 的 id 不合法`);
    if (ids.has(chat.id)) errors.push(`${where} 的 id 重複`);
    ids.add(chat.id);
    if (chat.id >= run.nextChatId) errors.push(`${where} 的 id 不小於 nextChatId`);
    const story = STORY_BY_ID[chat.storyId];
    if (!story) {
      errors.push(`${where} 的劇情不存在：${chat.storyId}`);
      continue;
    }
    if (!Number.isInteger(chat.stepIndex) || chat.stepIndex < 0 || chat.stepIndex >= story.steps.length) {
      errors.push(`${where} 的步驟超出範圍：${chat.stepIndex}`);
      continue;
    }
    if (!Number.isInteger(chat.lastAdvancedDay) || chat.lastAdvancedDay < 0 || chat.lastAdvancedDay > run.dayIndex) {
      errors.push(`${where} 的推進日不合法：${chat.lastAdvancedDay}`);
    }
    if (chat.replies.length !== chat.stepIndex) errors.push(`${where} 的回覆數和步驟不符`);
    chat.replies.forEach((choice, i) => {
      const step = story.steps[i];
      if (!step || isFinal(step) || !Number.isInteger(choice) || choice < 0 || choice >= step.replies.length) {
        errors.push(`${where} 第 ${i} 步的回覆不合法`);
      }
    });
  }
  return errors;
}
