/**
 * 遊戲狀態機：純函式，亂數由 RngFactory 注入。
 * 不合法的動作回傳同一個 run 參考，events 為空。
 */

import { calendarOf, isPayday } from "./calendar.ts";
import {
  DECK_SIZE,
  HEROINE_NIGHT_RATE,
  HEROINE_SEED,
  HEROINE_UNLOCK_FAILURES,
  MAX_MONEY,
  MONTHLY_RENT,
  MONTHLY_SALARY,
  NOODLE_PRICE,
  START_MONEY,
  STUDIO_MATCH_P,
} from "./constants.ts";
import { dexProgress, isDexComplete, recordFailure } from "./dex.ts";
import type { Dex } from "./dex.ts";
import { deckSeed, generateGirl } from "./girl.ts";
import { EDUCATIONS } from "./girlData.ts";
import { matchProbability, nextStreak, rollMatch } from "./match.ts";
import { MEALS } from "./meals.ts";
import type { Meal, MealDish } from "./meals.ts";
import { createRng, mixSeed, pick, randInt } from "./rng.ts";
import type { Rng } from "./rng.ts";
import { HEROINE_STORY_ID, STORY_BY_ID, STUDIO_STORY_ID } from "./stories/index.ts";
import { chatScore, dueDateChat, isChatReady, isFinal, pendingDateStep, pickStory, renderLine } from "./story.ts";
import type { Chat, OpenerKind } from "./storyTypes.ts";

export type Phase = "payday" | "daytime" | "evening" | "night" | "swiping" | "matched" | "nightDone";

export const PHASES: readonly Phase[] = ["payday", "daytime", "evening", "night", "swiping", "matched", "nightDone"];

export const OPENER_KINDS: readonly OpenerKind[] = ["hi", "whatsup", "eaten", "interest"];

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
}

export type GameAction =
  | { type: "ackPayday" }
  | { type: "reply"; chatId: number; choice: number }
  | { type: "closeChat"; chatId: number }
  | { type: "goOnDate"; choice: number }
  | { type: "endDaytime" }
  | { type: "eatOut" }
  | { type: "goHome" }
  | { type: "openApp" }
  | { type: "swipe"; dir: "left" | "right" }
  | { type: "chooseOpener"; opener: OpenerKind }
  | { type: "quitApp" }
  | { type: "sleep" };

export type GameEvent =
  | { type: "payday"; before: number; after: number }
  | { type: "meal"; name: string; price: number; narration: string; dish: MealDish }
  | { type: "swiped"; dir: "left" | "right" }
  | { type: "matched"; girlSeed: number }
  | { type: "noMatch" }
  | { type: "chatAdvanced"; chatId: number }
  | { type: "chatEnded"; storyId: string; narration: string; paid: number; firstTime: boolean; antiFraud: boolean }
  | { type: "dexCompleted" }
  /** 演得像失敗結局，但沒有記圖鑑，聊天也還在 */
  | { type: "fakeEnding"; storyId: string; narration: string }
  | { type: "dateFinished"; index: number; cost: number }
  /** 這一局走到結局了，存檔由畫面清掉 */
  | { type: "gameEnding"; endingId: string };

export type RngFactory = (purpose: "meal" | "match" | "story", ...keys: number[]) => Rng;

export interface AdvanceResult {
  run: RunState;
  dex: Dex;
  events: GameEvent[];
}

const PURPOSE_KEY = { meal: 1, match: 2, story: 3 } as const;

export function createRun(runSeed: number): RunState {
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
  };
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

/** 今晚牌組第幾張是誰 */
export function deckCardSeed(run: RunState, dex: Dex, cardIndex: number): number {
  return heroineCardIndex(run, dex) === cardIndex ? HEROINE_SEED : deckSeed(run.runSeed, run.dayIndex, cardIndex);
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
  const steps = run.chats.filter((c) => isChatReady(c, run.dayIndex)).map(storyStep);
  const actions: GameAction["type"][] = [];
  if (steps.some((s) => s && !isFinal(s))) actions.push("reply");
  if (steps.some((s) => s && isFinal(s))) actions.push("closeChat");
  return actions;
}

export function legalActions(run: RunState): GameAction["type"][] {
  switch (run.phase) {
    case "payday":
      return ["ackPayday"];
    case "daytime": {
      const actions = chatActions(run);
      if (affordableDate(run)) actions.push("goOnDate");
      actions.push("endDaytime");
      return actions;
    }
    case "evening": {
      const meal = offeredMeal(run);
      return meal && run.money >= meal.price ? ["eatOut", "goHome"] : ["goHome"];
    }
    case "night":
      return [...chatActions(run), "openApp", "sleep"];
    case "swiping":
      return ["swipe", "quitApp"];
    case "matched":
      return ["chooseOpener"];
    case "nightDone":
      return [...chatActions(run), "sleep"];
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
      const chat = run.chats.find((c) => c.id === action.chatId);
      if (!chat || !isChatReady(chat, run.dayIndex)) return same;
      const step = storyStep(chat);
      if (!step || isFinal(step)) return same;
      if (!Number.isInteger(action.choice) || action.choice < 0 || action.choice >= step.replies.length) return same;
      if (step.decision?.choice === action.choice) {
        const { cost, endingId } = step.decision;
        if (run.money < cost) return same;
        return {
          run: { ...run, money: run.money - cost, chats: run.chats.filter((c) => c !== chat) },
          dex: recordFailure(dex, endingId, run.dayIndex),
          events: [{ type: "gameEnding", endingId }],
        };
      }
      const next: Chat = {
        ...chat,
        stepIndex: chat.stepIndex + 1,
        lastAdvancedDay: run.dayIndex,
        replies: [...chat.replies, action.choice],
      };
      // 總分不夠就換到失敗路線；兩條路線前面的對話相同，對話紀錄接得起來
      if (step.gate && chatScore(next) < step.gate.minScore) next.storyId = step.gate.failStoryId;
      const events: GameEvent[] = [{ type: "chatAdvanced", chatId: chat.id }];
      if (step.fakeEnding) events.push({ type: "fakeEnding", ...step.fakeEnding });
      return {
        run: { ...run, chats: run.chats.map((c) => (c === chat ? next : c)) },
        dex,
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
      const next: Chat = {
        ...chat,
        stepIndex: chat.stepIndex + 1,
        lastAdvancedDay: run.dayIndex,
        replies: [...chat.replies, action.choice],
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
      if (!chat || !isChatReady(chat, run.dayIndex)) return same;
      const step = storyStep(chat);
      if (!step || !isFinal(step)) return same;
      const { narration, cost = 0, antiFraud } = step.ending;
      const money = applyCost(run.money, cost);
      const nextDex = recordFailure(dex, chat.storyId, run.dayIndex);
      const events: GameEvent[] = [
        {
          type: "chatEnded",
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
      if (action.dir !== "left" && action.dir !== "right") return same;
      const deckIndex = run.deckIndex + 1;
      const swiped: GameEvent = { type: "swiped", dir: action.dir };
      const afterDeck: Phase = deckIndex >= DECK_SIZE ? "nightDone" : "swiping";
      const rightStreak = nextStreak(run.rightStreak, action.dir);
      if (action.dir === "left") {
        return { run: { ...run, deckIndex, rightStreak, phase: afterDeck }, dex, events: [swiped] };
      }
      const seed = deckCardSeed(run, dex, run.deckIndex);
      // 她右滑一定配對，不看一般機率；當局不會再出現
      if (seed === HEROINE_SEED) {
        return {
          run: { ...run, deckIndex, rightStreak, phase: "matched", pendingMatchSeed: seed, heroineMet: true },
          dex,
          events: [swiped, { type: "matched", girlSeed: seed }],
        };
      }
      const girl = generateGirl(seed);
      const eduMod = EDUCATIONS.find((e) => e.id === girl.education)?.matchMod ?? 0;
      const p = girl.studio
        ? STUDIO_MATCH_P
        : matchProbability({ pickiness: girl.pickiness, rightStreak: run.rightStreak, age: girl.age, eduMod });
      if (rollMatch(p, factory("match", run.dayIndex, run.deckIndex))) {
        return {
          run: { ...run, deckIndex, rightStreak, phase: "matched", pendingMatchSeed: seed },
          dex,
          events: [swiped, { type: "matched", girlSeed: seed }],
        };
      }
      return {
        run: { ...run, deckIndex, rightStreak, phase: afterDeck },
        dex,
        events: [swiped, { type: "noMatch" }],
      };
    }

    case "chooseOpener": {
      if (run.phase !== "matched" || run.pendingMatchSeed === null) return same;
      const openerIndex = OPENER_KINDS.indexOf(action.opener);
      if (openerIndex < 0) return same;
      const girlSeed = run.pendingMatchSeed;
      const activeStoryIds = run.chats.map((c) => c.storyId);
      // 個工只走隱藏路線；同時已經有一條在聊，就當一般人抽
      const story =
        girlSeed === HEROINE_SEED
          ? STORY_BY_ID[HEROINE_STORY_ID]
          : generateGirl(girlSeed).studio && !activeStoryIds.includes(STUDIO_STORY_ID)
            ? STORY_BY_ID[STUDIO_STORY_ID]
            : pickStory(action.opener, dex, activeStoryIds, factory("story", girlSeed, openerIndex));
      const chat: Chat = {
        id: run.nextChatId,
        girlSeed,
        storyId: story.id,
        opener: action.opener,
        stepIndex: 0,
        lastAdvancedDay: run.dayIndex,
        replies: [],
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
      return {
        run: {
          ...run,
          dayIndex,
          deckIndex: 0,
          phase: isPayday(calendarOf(dayIndex)) ? "payday" : "daytime",
        },
        dex,
        events: [],
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
