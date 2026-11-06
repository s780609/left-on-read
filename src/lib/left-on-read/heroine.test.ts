import { test } from "node:test";
import assert from "node:assert/strict";
import { newGameplayAction } from "./testing.ts";
import { calendarOf, isPhoneChatDay, isWorkday } from "./calendar.ts";
import {
  DECK_SIZE,
  HEROINE_DATE_COSTS,
  HEROINE_NIGHT_RATE,
  HEROINE_PASS_SCORE,
  HEROINE_SEED,
  HEROINE_UNLOCK_FAILURES,
  LADYBUG_ENDING_ID,
  NO_SHOW_STORY_ID,
  START_MONEY,
  TRUE_ENDING_ID,
} from "./constants.ts";
import { dexProgress, endingProgress } from "./dex.ts";
import type { Dex } from "./dex.ts";
import { FRESH_TODAY, advance, checkInvariants, createRun, deckCardSeed, heroineCardIndex, legalActions, settleRun } from "./game.ts";
import type { GameAction, GameEvent, RunState } from "./game.ts";
import { deckSeed, generateGirl } from "./girl.ts";
import { INTERESTS } from "./girlData.ts";
import { createRng, pick, randInt } from "./rng.ts";
import { parseMeta, parseRun, serializeMeta, serializeRun } from "./save.ts";
import { HEROINE_ALMOST_STORY_ID, HEROINE_DATES, HEROINE_STORY_ID, LEGACY_HEROINE_STORY_ID, SPECIAL_STORIES, STORIES, STORY_BY_ID } from "./stories/index.ts";
import { COMEBACK_DAYS } from "./stories/heroine.ts";
import {
  chatScore,
  chatTranscript,
  comebackChat,
  dueDateChat,
  isChatReady,
  isFinal,
  openerOptions,
  readyChats,
  scheduledDateDay,
  storyWeights,
  validateStory,
  visibleChats,
} from "./story.ts";
import type { Chat, OpenerKind, ReplyStep } from "./storyTypes.ts";
import { TRUE_ENDING_BEATS } from "./trueEnding.ts";

// ---------- 共用工具 ----------

const STORY = STORY_BY_ID[HEROINE_STORY_ID];
const stepAt = (i: number) => STORY.steps[i] as ReplyStep;
const dateStepIndex = (index: number) => STORY.steps.findIndex((s) => "date" in s && s.date?.index === index);
const FAKE_STEP = STORY.steps.findIndex((s) => "fakeEnding" in s);
const COMEBACK_STEP = STORY.steps.findIndex((s) => "comeback" in s);
/** 假失敗的第一句：「……就這樣了」往前三步 */
const GHOST_STEP = FAKE_STEP - 3;

/** 第二個週六（第 0 天是 9/15 週二，第 4 天是第一個週六）：要等 5 天的約會也趕得上 */
const SATURDAY = 11;

/** 收集了 n 種一般失敗的圖鑑 */
const dexOf = (n: number): Dex =>
  Object.fromEntries(STORIES.slice(0, n).map((s) => [s.id, { count: 1, firstDayIndex: 0 }]));
const UNLOCKED = dexOf(HEROINE_UNLOCK_FAILURES);

/** 找一局今晚第一張就是她的 run */
function heroineNight(): RunState {
  for (let seed = 1; seed < 100_000; seed++) {
    const run: RunState = { ...createRun(seed), phase: "swiping" };
    if (heroineCardIndex(run, UNLOCKED) === 0) return run;
  }
  throw new Error("找不到她");
}

/** 停在約會那一步時，讓約會日剛好是 SATURDAY（約好後第一個週六）；其他步驟從第 0 天起算 */
const isDateStep = (i: number) => "date" in STORY.steps[i] && Boolean((STORY.steps[i] as ReplyStep).date);

function chatAt(stepIndex: number, patch: Partial<Chat> = {}): Chat {
  return {
    id: 1,
    girlSeed: HEROINE_SEED,
    storyId: HEROINE_STORY_ID,
    opener: "hi",
    stepIndex,
    lastAdvancedDay: isDateStep(stepIndex) ? 6 : 0,
    replies: new Array<number>(stepIndex).fill(0),
    ...patch,
  };
}

function nextPhoneDay(from: number): number {
  let d = from;
  while (!isPhoneChatDay(calendarOf(d))) d++;
  return d;
}

function runWith(chat: Chat, patch: Partial<RunState> = {}): RunState {
  return { ...createRun(1), dayIndex: SATURDAY, chats: [chat], nextChatId: 2, heroineMet: true, ...patch };
}

/** 第 i 題選幾分的那一句 */
const choiceFor = (i: number, score: number) => stepAt(i).scores?.indexOf(score) ?? -1;

function act(run: RunState, dex: Dex, action: GameAction) {
  const r = advance(run, dex, action);
  assert.notEqual(r.run, run, `${run.phase} 的 ${action.type} 應該合法`);
  assert.deepEqual(checkInvariants(r.run), []);
  return r;
}

/** 從配對後一路回完四題，回傳第四題回完時的狀態 */
function answerChat(opener: OpenerKind, scores: readonly number[]) {
  let run: RunState = { ...createRun(1), heroineMet: true, phase: "matched", pendingMatchSeed: HEROINE_SEED };
  const dex = UNLOCKED;
  run = advance(run, dex, { type: "chooseOpener", opener }).run;
  let events: GameEvent[] = [];
  for (let i = 0; i < scores.length; i++) {
    run = { ...run, phase: "daytime", dayIndex: nextPhoneDay(run.dayIndex + 1), dayReplies: 0, today: { ...FRESH_TODAY } };
    const r = act(run, dex, { type: "reply", chatId: 1, choice: choiceFor(i, scores[i]) });
    run = r.run;
    events = r.events;
  }
  return { run, chat: run.chats[0], events };
}

// ---------- 觸發條件 ----------

test("常數符合規格", () => {
  assert.equal(HEROINE_UNLOCK_FAILURES, 5);
  assert.equal(HEROINE_NIGHT_RATE, 1);
  assert.equal(HEROINE_PASS_SCORE, 2);
  assert.deepEqual([...HEROINE_DATE_COSTS], [800, 500, 300]);
  assert.equal(TRUE_ENDING_ID, "true-love");
});

test("收集 4 種時她絕對不會出現，5 種時每晚一定出現", () => {
  const four = dexOf(4);
  const nights = 2_000;
  let seen = 0;
  for (let day = 0; day < nights; day++) {
    const run: RunState = { ...createRun(day % 97), dayIndex: day };
    assert.equal(heroineCardIndex(run, four), null);
    for (let i = 0; i < DECK_SIZE; i++) assert.notEqual(deckCardSeed(run, four, i), HEROINE_SEED);
    const index = heroineCardIndex(run, UNLOCKED);
    assert.notEqual(index, null);
    seen++;
    assert.ok(Number.isInteger(index) && index! >= 0 && index! < DECK_SIZE);
    assert.equal(deckCardSeed(run, UNLOCKED, index!), HEROINE_SEED);
  }
  assert.equal(seen, nights);
  assert.equal(HEROINE_NIGHT_RATE, 1);
});

test("隱藏失敗和結局不算進解鎖的 5 種", () => {
  const dex: Dex = { ...dexOf(4), studio: { count: 3, firstDayIndex: 0 }, [HEROINE_ALMOST_STORY_ID]: { count: 3, firstDayIndex: 0 }, [LADYBUG_ENDING_ID]: { count: 1, firstDayIndex: 0 }, [TRUE_ENDING_ID]: { count: 1, firstDayIndex: 0 } };
  for (let day = 0; day < 2000; day++) {
    assert.equal(heroineCardIndex({ ...createRun(1), dayIndex: day }, dex), null);
  }
});

test("同一個 seed、同一天結果相同，換天就可能不同；重新載入不能重擲", () => {
  const pattern = (seed: number) =>
    Array.from({ length: 200 }, (_, day) => heroineCardIndex({ ...createRun(seed), dayIndex: day }, UNLOCKED));
  assert.deepEqual(pattern(5), pattern(5));
  assert.notDeepEqual(pattern(5), pattern(6));
  const run = heroineNight();
  const reloaded = parseRun(serializeRun(run));
  assert.ok(reloaded);
  assert.equal(heroineCardIndex(reloaded, UNLOCKED), 0);
});

test("她的卡片是固定的，是成年人", () => {
  const girl = generateGirl(HEROINE_SEED);
  assert.equal(girl.nickname, "小晴");
  assert.equal(girl.age, 27);
  assert.equal(girl.bio, "週末喜歡去沒去過的地方，也喜歡待在家。");
  assert.equal(girl.studio, false);
  assert.deepEqual([...(girl.photos ?? [])], ["/left-on-read/heroine/08.jpg", "/left-on-read/heroine/09.jpg"]);
  const opener = openerOptions(girl).find((o) => o.kind === "interest");
  assert.match(opener?.text ?? "", /看電影/);
});

test("「看電影」沒有加進一般女角的興趣表，牌組也不會撞到她的 seed", () => {
  assert.ok(!INTERESTS.map((i): string => i.label).includes("看電影"));
  for (let i = 0; i < 2000; i++) assert.notEqual(deckSeed(i, i, i), HEROINE_SEED);
  assert.equal(generateGirl(deckSeed(1, 1, 1)).photos, undefined);
});

test("右滑她一定配對：注入配不到的亂數也一樣，不看一般機率", () => {
  const run = heroineNight();
  const r = advance(run, UNLOCKED, { type: "swipe", dir: "right" }, () => () => 0.999);
  assert.equal(r.run.phase, "matched");
  assert.equal(r.run.pendingMatchSeed, HEROINE_SEED);
  assert.equal(r.run.heroineMet, true);
  assert.ok(r.events.some((e) => e.type === "matched"));
});

test("左滑就錯過：不配對，這局之後的夜晚還可能再遇到", () => {
  const run = heroineNight();
  const r = advance(run, UNLOCKED, { type: "swipe", dir: "left" }, () => () => 0);
  assert.notEqual(r.run.phase, "matched");
  assert.equal(r.run.heroineMet, false);
  const again = Array.from({ length: 200 }, (_, i) => heroineCardIndex({ ...r.run, dayIndex: run.dayIndex + 1 + i }, UNLOCKED));
  assert.ok(again.some((x) => x !== null));
});

test("配對後一定走她的路線，不會被隨機抽到別的，也不算進 27 種", () => {
  for (const opener of ["hi", "whatsup", "eaten", "interest"] as const) {
    const run: RunState = { ...createRun(1), heroineMet: true, phase: "matched", pendingMatchSeed: HEROINE_SEED };
    const r = advance(run, UNLOCKED, { type: "chooseOpener", opener }, () => () => 0.5);
    assert.equal(r.run.chats[0].storyId, HEROINE_STORY_ID);
  }
  assert.equal(STORIES.length, 33);
  for (const id of [HEROINE_STORY_ID, HEROINE_ALMOST_STORY_ID]) {
    assert.ok(!STORIES.some((s) => s.id === id));
    assert.ok(!storyWeights("interest", UNLOCKED, []).some((w) => w.item.id === id));
  }
});

test("同一局已經在走她的路線、或走回失敗，就不再出現", () => {
  const met: RunState = { ...createRun(3), heroineMet: true };
  for (let day = 0; day < 500; day++) assert.equal(heroineCardIndex({ ...met, dayIndex: day }, UNLOCKED), null);
  // 走回失敗之後聊天沒了，但這一局還是不會再出現
  const { run } = answerChat("hi", [-1, -1, -1, -1]);
  const closed = advance({ ...run, dayIndex: nextPhoneDay(run.dayIndex + 1), dayReplies: 0, today: { ...FRESH_TODAY } }, UNLOCKED, { type: "closeChat", chatId: 1 });
  assert.equal(closed.run.chats.length, 1);
  assert.equal(closed.run.chats[0].closed, true);
  assert.equal(closed.run.heroineMet, true);
  for (let day = 0; day < 500; day++) {
    assert.equal(heroineCardIndex({ ...closed.run, dayIndex: closed.run.dayIndex + day }, UNLOCKED), null);
  }
});

// ---------- 第一階段：分數 ----------

test("劇情資料合法，第一階段的分數和規格一樣", () => {
  for (const s of SPECIAL_STORIES) assert.deepEqual(validateStory(s), [], s.id);
  const table: Record<string, number>[] = [
    { "上次那部我看到哭，一個人在戲院有點丟臉。妳呢？": 1, "我都在家看，戲院太貴了": 0, "我整理了一份近十年高分片單 共 212 部 要嗎": -1 },
    { "辛苦了，發生什麼事？想講的話我聽": 1, "主管都這樣啦": 0, "多喝熱水": -1 },
    { "老實說都在家。但我有點想改變，妳有推薦的地方嗎": 1, "上班太累了都在睡": 0, "我把假日行程做成甘特圖了": -1 },
    { "我也是。那個，週末要不要一起看場電影？": 1, "哈哈謝謝": 0, "根據我們的訊息頻率，我認為時機成熟了": -1 },
  ];
  table.forEach((row, i) => {
    const step = stepAt(i);
    const actual = Object.fromEntries(step.replies.map((reply, r) => [reply, step.scores?.[r]]));
    assert.deepEqual(actual, row, `第 ${i + 1} 題`);
  });
});

test("分數順序不固定，不能每題選同一個位置", () => {
  const best = [0, 1, 2, 3].map((i) => choiceFor(i, 1));
  assert.ok(new Set(best).size > 1, `每題最好的都在 ${best}`);
});

test("chatScore：開場白挑興趣句 +1，通用句 0，加上每句回覆", () => {
  const replies = [choiceFor(0, 1), choiceFor(1, -1), choiceFor(2, 0), choiceFor(3, 1)];
  assert.equal(chatScore(chatAt(4, { replies })), 1);
  assert.equal(chatScore(chatAt(4, { replies, opener: "interest" })), 2);
  assert.equal(chatScore(chatAt(0, { opener: "interest" })), 1);
  assert.equal(chatScore(chatAt(0)), 0);
});

test("分數邊界：2 分進入約會", () => {
  const { chat } = answerChat("hi", [1, 1, 0, 0]);
  assert.equal(chatScore(chat), 2);
  assert.equal(chat.storyId, HEROINE_STORY_ID);
  assert.equal(chat.stepIndex, 4);
});

test("分數邊界：1 分走回失敗，記一筆隱藏失敗，不影響 27 種的進度", () => {
  const { run, chat } = answerChat("hi", [1, 0, 0, 0]);
  assert.equal(chatScore(chat), 1);
  assert.equal(chat.storyId, HEROINE_ALMOST_STORY_ID);

  const next: RunState = { ...run, dayIndex: nextPhoneDay(run.dayIndex + 1), dayReplies: 0, today: { ...FRESH_TODAY } };
  assert.ok(legalActions(next).includes("closeChat"));
  const before = dexProgress(UNLOCKED).collected;
  const r = act(next, UNLOCKED, { type: "closeChat", chatId: 1 });
  const ended = r.events.find((e) => e.type === "chatEnded");
  assert.ok(ended?.type === "chatEnded");
  assert.equal(ended.storyId, HEROINE_ALMOST_STORY_ID);
  assert.equal(ended.narration, "這次我什麼都沒做錯，也什麼都沒做對。");
  assert.equal(r.dex[HEROINE_ALMOST_STORY_ID].count, 1);
  assert.equal(dexProgress(r.dex).collected, before);
  assert.equal(r.run.chats.length, 1);
  assert.equal(r.run.chats[0].closed, true);
  assert.equal(STORY_BY_ID[HEROINE_ALMOST_STORY_ID].dexName, "差一點");
});

test("開場白的 1 分可以補上門檻：興趣句 + 1 分 = 2 分進入約會，通用句就差一點", () => {
  assert.equal(answerChat("interest", [1, 0, 0, 0]).chat.storyId, HEROINE_STORY_ID);
  assert.equal(answerChat("hi", [1, 0, 0, 0]).chat.storyId, HEROINE_ALMOST_STORY_ID);
});

test("總分不夠才在第四題之後判定，前三題分數再低都不會提早出局", () => {
  const { chat } = answerChat("hi", [-1, -1, -1]);
  assert.equal(chat.storyId, HEROINE_STORY_ID);
  assert.equal(chat.stepIndex, 3);
});

test("換路線之後，對話紀錄還是接得起來", () => {
  const { chat, run } = answerChat("hi", [0, 0, 0, 0]);
  const lines = chatTranscript(chat, generateGirl(HEROINE_SEED), run.dayIndex + 1);
  assert.equal(lines.at(-1)?.who, "her");
  assert.equal(lines.length, 1 + 4 * 2 + 1);
});

test("查完場次當場確認 14:30，之後才是約會步驟", () => {
  let run = runWith(chatAt(4, { lastAdvancedDay: 0 }), { dayIndex: 1 });
  run = act(run, {}, { type: "reply", chatId: 1, choice: 0 }).run;
  assert.equal(run.chats[0].stepIndex, 5);
  assert.ok(isChatReady(run.chats[0], run.dayIndex), "場次確認 wait:0");
  assert.ok(stepAt(5).replies.every((r) => /14:30/.test(r)));
  const lines = chatTranscript(run.chats[0], generateGirl(HEROINE_SEED), run.dayIndex);
  const penultimate = lines.at(-2);
  const last = lines.at(-1);
  assert.equal(penultimate?.who, "me");
  assert.match(penultimate && "text" in penultimate ? penultimate.text : "", /查一下場次/);
  assert.equal(last?.who, "her");
  assert.match(last && "text" in last ? last.text : "", /查完跟我說|定時間/);
  run = act(run, {}, { type: "reply", chatId: 1, choice: 0 }).run;
  assert.equal(run.chats[0].stepIndex, dateStepIndex(0));
  // 約會日是約好之後的第一個週六
  const day = scheduledDateDay(run.chats[0])!;
  assert.equal(calendarOf(day).weekday, 6);
  assert.ok(day > run.dayIndex && day <= run.dayIndex + 7);
  assert.equal(dueDateChat(run.chats, day)?.id, 1);
});

// ---------- 第二階段：約會 ----------

test("約會只有約好的那個週六白天能去，早一天、晚一週都不行", () => {
  const chat = chatAt(dateStepIndex(0), { lastAdvancedDay: 0 });
  const day = scheduledDateDay(chat)!;
  assert.equal(day, 4);
  assert.ok(!isWorkday(calendarOf(day)));
  for (let d = 1; d <= 14; d++) {
    const run = runWith(chat, { dayIndex: d });
    assert.equal(legalActions(run).includes("goOnDate"), d === day, `第 ${d} 天`);
    const r = advance(run, {}, { type: "goOnDate", choice: 0 });
    assert.equal(r.run === run, d !== day, `第 ${d} 天`);
  }
  // 不是白天也不行
  const night = runWith(chat, { phase: "night" });
  assert.equal(advance(night, {}, { type: "goOnDate", choice: 0 }).run, night);
});

test("金額扣得正確；錢不夠也能去：身上的錢先付，差的跟她借，好感下降", () => {
  for (const index of [0, 1, 2]) {
    const chat = chatAt(dateStepIndex(index), { stats: { affection: 3, awkward: 0, pressure: 0 } });
    const cost = HEROINE_DATE_COSTS[index];
    assert.equal(HEROINE_DATES[index].cost, cost);

    const exact = advance(runWith(chat, { money: cost }), {}, { type: "goOnDate", choice: 0 });
    assert.equal(exact.run.money, 0);
    const paid = exact.events.find((e) => e.type === "dateFinished");
    assert.ok(paid?.type === "dateFinished" && paid.borrowed === 0);
    assert.equal(advance(runWith(chat), {}, { type: "goOnDate", choice: 1 }).run.money, START_MONEY - cost);

    const poor = runWith(chat, { money: cost - 100 });
    assert.ok(legalActions(poor).includes("goOnDate"));
    const r = advance(poor, {}, { type: "goOnDate", choice: 0 });
    assert.notEqual(r.run, poor);
    assert.equal(r.run.money, 0);
    const finished = r.events.find((e) => e.type === "dateFinished");
    assert.ok(finished?.type === "dateFinished");
    assert.equal(finished.borrowed, 100);
    if (r.run.chats.length > 0) {
      assert.deepEqual(r.run.chats[0].stats, { affection: 2, awkward: 1, pressure: 0 });
    }
  }
});

test("約好的那天沒去：睡一覺她就封鎖你，記一筆隱藏失敗「放鳥」", () => {
  const chat = chatAt(dateStepIndex(0));
  const day = scheduledDateDay(chat)!;
  // 那天白天拿去回別人或直接撐到晚上，晚上睡覺
  const night = runWith(chat, { dayIndex: day, phase: "night" });
  const r = act(night, UNLOCKED, { type: "sleep" });
  const ended = r.events.find((e) => e.type === "chatEnded");
  assert.ok(ended?.type === "chatEnded");
  assert.equal(ended.storyId, NO_SHOW_STORY_ID);
  assert.equal(ended.girlSeed, HEROINE_SEED);
  assert.equal(r.run.chats[0].closed, true);
  assert.equal(r.dex[NO_SHOW_STORY_ID].count, 1);
  assert.equal(dexProgress(r.dex).collected, dexProgress(UNLOCKED).collected, "不算進一般圖鑑");
  // 約會日前一天睡覺不會怎樣
  const before = act(runWith(chat, { dayIndex: day - 1, phase: "night" }), UNLOCKED, { type: "sleep" });
  assert.ok(!before.events.some((e) => e.type === "chatEnded"));
});

test("選項只影響當下的台詞：兩個選項走向同一步，不會出局", () => {
  const chat = chatAt(dateStepIndex(0));
  const a = advance(runWith(chat), {}, { type: "goOnDate", choice: 0 });
  const b = advance(runWith(chat), {}, { type: "goOnDate", choice: 1 });
  assert.equal(a.run.chats[0].stepIndex, b.run.chats[0].stepIndex);
  assert.equal(a.run.chats[0].storyId, HEROINE_STORY_ID);
  assert.equal(a.run.money, b.run.money);
});

test("約會的選項編號不合法就不算", () => {
  const run = runWith(chatAt(dateStepIndex(0)));
  for (const choice of [-1, 2, 0.5, NaN]) assert.equal(advance(run, {}, { type: "goOnDate", choice }).run, run);
});

test("約會佔掉一整天：回到家就是深夜，不能在聊天室裡用回覆赴約", () => {
  const chat = chatAt(dateStepIndex(0));
  const run = runWith(chat);
  assert.equal(act(run, {}, { type: "goOnDate", choice: 0 }).run.phase, "night");
  assert.equal(isChatReady(chat, SATURDAY), false);
  assert.equal(advance(run, {}, { type: "reply", chatId: 1, choice: 0 }).run, run);
});

test("第一次和第二次約會一定不在同一個週末", () => {
  for (const day of [SATURDAY, SATURDAY + 7]) {
    // 約好的那天是 day
    const chat = chatAt(dateStepIndex(0), { lastAdvancedDay: day - 5 });
    let run = advance(runWith(chat, { dayIndex: day }), {}, { type: "goOnDate", choice: 0 }).run;
    assert.ok(isChatReady(run.chats[0], day), "當晚收尾同一天可回");
    run = act(run, {}, { type: "reply", chatId: 1, choice: 0 }).run;
    assert.equal(isChatReady(run.chats[0], day), false, "收尾後當天沒有下一則");
    // 每天都回，用最快的速度走到第二次約會
    for (let today = day + 1; run.chats[0].stepIndex < dateStepIndex(1); today++) {
      run = { ...run, phase: "daytime", dayIndex: today, dayReplies: 0, today: { ...FRESH_TODAY } };
      if (isChatReady(run.chats[0], today)) run = act(run, {}, { type: "reply", chatId: 1, choice: 0 }).run;
    }
    assert.equal(run.chats[0].stepIndex, dateStepIndex(1), "應該停在第二次約會步驟");
    assert.equal(dueDateChat(run.chats, run.dayIndex), null, "平日還不能赴約");
    assert.ok(run.dayIndex > day + 2, "第二次約會要晚於第一個週末");
  }
});

// ---------- 約會之間的聊天 ----------

const INTERLUDES = [
  { name: "威秀之後", from: dateStepIndex(0) + 1, to: dateStepIndex(1) - 1 },
  { name: "大稻埕之後", from: dateStepIndex(1) + 1, to: GHOST_STEP },
  { name: "她回來之後", from: COMEBACK_STEP + 1, to: dateStepIndex(2) },
];

test("約會之間都有聊天：冠宇回的每一句她都當場接話，不計分", () => {
  assert.deepEqual(INTERLUDES.map((x) => x.to - x.from), [3, 2, 2]);
  for (const { name, from, to } of INTERLUDES) {
    for (let i = from; i < to; i++) {
      const step = stepAt(i);
      assert.equal(step.answers?.length, step.replies.length, `${name} 第 ${i} 步`);
      assert.ok(step.replies.length >= 2, `${name} 第 ${i} 步要有得選`);
      assert.equal(step.scores, undefined, `${name} 第 ${i} 步`);
      assert.equal(step.gate ?? step.date ?? step.decision ?? step.fakeEnding ?? step.comeback, undefined, `${name} 第 ${i} 步`);
    }
  }
});

test("聊天不會影響總分：不管選哪句，分數都不變", () => {
  const replies = new Array<number>(dateStepIndex(1)).fill(0);
  [0, 1, 2, 3].forEach((i) => (replies[i] = choiceFor(i, 1)));
  const base = chatScore(chatAt(replies.length, { replies }));
  for (const { from, to } of INTERLUDES.slice(0, 1)) {
    for (let i = from; i < to; i++) replies[i] = 1;
  }
  assert.equal(chatScore(chatAt(replies.length, { replies })), base);
});

test("威秀之後：當晚先收尾，隔天再聊，回完才收到大稻埕邀約", () => {
  const girl = generateGirl(HEROINE_SEED);
  let run = advance(runWith(chatAt(dateStepIndex(0))), {}, { type: "goOnDate", choice: 0 }).run;
  const dayOfDate = run.dayIndex;
  const before = chatTranscript(run.chats[0], girl, dayOfDate).length;

  // 回到家當晚就能收尾
  assert.equal(run.phase, "night");
  assert.ok(legalActions(run).includes("reply"), "當晚收尾");
  run = act(run, {}, { type: "reply", chatId: 1, choice: 0 }).run;
  assert.ok(!legalActions(run).includes("reply"), "收尾後要等隔天");

  run = { ...run, phase: "daytime", dayIndex: nextPhoneDay(dayOfDate + 1), dayReplies: 0, today: { ...FRESH_TODAY } };
  run = act(run, {}, { type: "reply", chatId: 1, choice: 1 }).run;
  assert.ok(!legalActions(run).includes("reply"), "一天一步");
  run = { ...run, phase: "daytime", dayIndex: nextPhoneDay(run.dayIndex + 1), dayReplies: 0, today: { ...FRESH_TODAY } };
  run = act(run, {}, { type: "reply", chatId: 1, choice: 0 }).run;

  // before 已含當晚收尾的 lead／incoming（wait:0 當下就顯示）
  const lines = chatTranscript(run.chats[0], girl, run.dayIndex).slice(before);
  assert.deepEqual(lines, [
    { who: "me", text: "我也是。安全到家就好。晚安。" },
    { who: "her", text: "嗯，晚安。做個好夢。" },
    { who: "her", text: "那天謝謝你，我很開心。" },
    { who: "her", text: "我把票根夾在書裡了。不要問為什麼。" },
    { who: "her", text: "欸，那部片的結局你看懂了嗎？我回家想了好久" },
    { who: "me", text: "我查了三篇影評，現在懂了。要我解釋嗎" },
    { who: "her", text: "不用，我想繼續不懂。不過你真的去查了三篇喔，好認真。" },
    { who: "me", text: "今天主管還有念妳嗎？" },
    { who: "her", text: "有。但我今天頂嘴了，在心裡。" },
  ]);
  // 邀約維持至少隔兩天
  assert.equal(isChatReady(run.chats[0], run.dayIndex + 1), false);
  assert.ok(isChatReady(run.chats[0], nextPhoneDay(run.dayIndex + 2)));
  assert.match((stepAt(run.chats[0].stepIndex).incoming as { text: string }).text, /大稻埕/);
});

test("她回來之後：聊完才約得到板橋耶誕城，假失敗那段她有講開", () => {
  const girl = generateGirl(HEROINE_SEED);
  let run = runWith(chatAt(COMEBACK_STEP), { dayIndex: COMEBACK_DAYS });
  run = act(run, {}, { type: "reply", chatId: 1, choice: 0 }).run;
  for (let i = COMEBACK_STEP + 1; i < dateStepIndex(2); i++) {
    assert.equal(run.chats[0].stepIndex, i);
    // 先是週六，再來是週一：聊天沒回完之前，週六也沒有約會可以赴
    const day = i === COMEBACK_STEP + 1 ? SATURDAY : nextPhoneDay(run.dayIndex + 1);
    run = { ...run, phase: "daytime", dayIndex: day, dayReplies: 0, today: { ...FRESH_TODAY } };
    assert.equal(dueDateChat(run.chats, run.dayIndex), null);
    assert.ok(!legalActions(run).includes("goOnDate"));
    run = act(run, {}, { type: "reply", chatId: 1, choice: 0 }).run;
  }
  assert.equal(run.chats[0].stepIndex, dateStepIndex(2));
  const text = chatTranscript(run.chats[0], girl, run.dayIndex).map((l) => ("text" in l ? l.text : ""));
  assert.ok(text.some((t) => t.includes("前陣子對不起")));
  assert.ok(text.some((t) => t.includes("耶誕城人很多又很冷")));
});

test("聊天不會把假失敗提早演掉，也不會讓她在假失敗當晚出現", () => {
  const fakeEndingEvents = (i: number) =>
    advance(runWith(chatAt(i)), UNLOCKED, { type: "reply", chatId: 1, choice: 0 }).events.filter((e) => e.type === "fakeEnding");
  for (const { from, to } of INTERLUDES) {
    for (let i = from; i < to; i++) assert.deepEqual(fakeEndingEvents(i), [], `第 ${i} 步`);
  }
  assert.equal(stepAt(GHOST_STEP - 1).lead?.[0], "我的外套現在還有雞排味。");
  assert.equal(stepAt(GHOST_STEP).incoming.kind, "none");
});

// ---------- 假失敗 ----------

/** 從第二次約會開始，一路走到假失敗按下去 */
function throughGhosting() {
  const dex = UNLOCKED;
  let run = advance(runWith(chatAt(dateStepIndex(1))), dex, { type: "goOnDate", choice: 0 }).run;
  // 當晚收尾 → 隔天聊煙火 → 再開始假失敗
  assert.ok(legalActions(run).includes("reply"), "大稻埕當晚收尾");
  run = act(run, dex, { type: "reply", chatId: 1, choice: 0 }).run;
  run = { ...run, phase: "daytime", dayIndex: nextPhoneDay(run.dayIndex + 1), dayReplies: 0, today: { ...FRESH_TODAY } };
  run = act(run, dex, { type: "reply", chatId: 1, choice: 0 }).run;
  // 假失敗那段同一天聊完：三句都在同一個白天回
  run = { ...run, phase: "daytime", dayIndex: nextPhoneDay(run.dayIndex + 1), dayReplies: 0, today: { ...FRESH_TODAY } };
  const day = run.dayIndex;
  for (let i = 0; i < 3; i++) {
    assert.ok(legalActions(run).includes("reply"), `假失敗第 ${i + 1} 句`);
    run = act(run, dex, { type: "reply", chatId: 1, choice: 0 }).run;
  }
  assert.equal(run.dayIndex, day);
  return { run, dex };
}

test("第二次約會聊完之後自動觸發：同一段對話一口氣聊完", () => {
  const { run } = throughGhosting();
  assert.equal(GHOST_STEP, dateStepIndex(1) + 3);
  const start = GHOST_STEP;
  assert.deepEqual([start, start + 1, start + 2].map((i) => [stepAt(i).replies[0], stepAt(i).answer]), [
    ["最近有空嗎？想約妳", "這週專案爆了，天天加班"],
    ["好，那妳先忙", "這陣子大概都會很忙"],
    ["好，那妳有空再說", "嗯，忙完第一個找你"],
  ]);
  assert.equal(run.chats[0].stepIndex, FAKE_STEP);
  const lines = chatTranscript(run.chats[0], generateGirl(HEROINE_SEED), run.dayIndex).filter(
    (l) => l.who === "me" || l.who === "her"
  );
  assert.deepEqual(lines.slice(-2), [
    { who: "me", text: "好，那妳有空再說" },
    { who: "her", text: "嗯，忙完第一個找你" },
  ]);
});

test("假失敗：她回完馬上就能接下一句，不用等到隔天", () => {
  let run = runWith(chatAt(GHOST_STEP), { phase: "night" });
  for (let i = 0; i < 3; i++) run = act(run, UNLOCKED, { type: "reply", chatId: 1, choice: 0 }).run;
  assert.equal(run.chats[0].stepIndex, FAKE_STEP);
  assert.ok(isChatReady(run.chats[0], run.dayIndex, "night"));
});

test("聊完當下就能按「……就這樣了」", () => {
  const { run } = throughGhosting();
  assert.ok(isChatReady(run.chats[0], run.dayIndex));
  assert.deepEqual(stepAt(FAKE_STEP).replies, ["……就這樣了"]);
});

test("假失敗不會記進圖鑑，聊天不會消失，外觀是「下次吧」", () => {
  const { run, dex } = throughGhosting();
  const r = act(run, dex, { type: "reply", chatId: 1, choice: 0 });
  assert.equal(r.dex, dex, "圖鑑要是同一個物件");
  assert.ok(!Object.hasOwn(r.dex, "rain-check"));
  assert.equal(r.run.chats.length, 1);
  assert.ok(!r.events.some((e) => e.type === "chatEnded" || e.type === "gameEnding" || e.type === "dexCompleted"));
  const fake = r.events.find((e) => e.type === "fakeEnding");
  assert.ok(fake?.type === "fakeEnding");
  assert.equal(STORY_BY_ID[fake.storyId].dexName, "下次吧");
  assert.equal(fake.narration, "下次是一個地名，很遠，沒有車到。");
});

test("圖鑑本來就有「下次吧」時，次數也不會增加", () => {
  const { run } = throughGhosting();
  const dex: Dex = { ...UNLOCKED, "rain-check": { count: 2, firstDayIndex: 1 } };
  assert.equal(act(run, dex, { type: "reply", chatId: 1, choice: 0 }).dex["rain-check"].count, 2);
});

test(`消失 ${COMEBACK_DAYS} 天後一定會收到她的訊息；這幾天她不在手機上，資料還在`, () => {
  const { run, dex } = throughGhosting();
  const after = act(run, dex, { type: "reply", chatId: 1, choice: 0 }).run;
  assert.equal(after.chats[0].stepIndex, COMEBACK_STEP);
  assert.equal(comebackChat(after.chats, after.dayIndex), null);
  assert.deepEqual(visibleChats(after.chats, after.dayIndex), []);

  for (let d = 1; d < COMEBACK_DAYS; d++) {
    assert.equal(comebackChat(after.chats, after.dayIndex + d), null, `第 ${d} 天還沒回來`);
    assert.deepEqual(visibleChats(after.chats, after.dayIndex + d), []);
  }
  const tomorrow: RunState = { ...after, phase: "daytime", dayIndex: after.dayIndex + COMEBACK_DAYS, dayReplies: 0, today: { ...FRESH_TODAY } };
  assert.equal(comebackChat(tomorrow.chats, tomorrow.dayIndex), tomorrow.chats[0]);
  assert.deepEqual(visibleChats(tomorrow.chats, tomorrow.dayIndex), tomorrow.chats);
  const lines = chatTranscript(tomorrow.chats[0], generateGirl(HEROINE_SEED), tomorrow.dayIndex);
  assert.deepEqual(lines.at(-1), {
    who: "her",
    text: "對不住讓你等。這幾天終於忙完了。再下個週末，板橋耶誕城一起去看燈？這次換我約。",
  });
  assert.match(stepAt(COMEBACK_STEP).comeback?.aside ?? "", /第二個主動找我的人/);
  // 重新載入也一樣
  const reloaded = parseRun(serializeRun(tomorrow));
  assert.ok(reloaded);
  assert.equal(comebackChat(reloaded.chats, reloaded.dayIndex)?.id, 1);
});

test("第三次約會要等假失敗之後才能去", () => {
  const third = dateStepIndex(2);
  assert.ok(FAKE_STEP < COMEBACK_STEP && COMEBACK_STEP < third);
  for (let i = dateStepIndex(1) + 1; i < third; i++) {
    const run = runWith(chatAt(i));
    assert.equal(dueDateChat(run.chats, run.dayIndex), null, `第 ${i} 步`);
    assert.ok(!legalActions(run).includes("goOnDate"), `第 ${i} 步`);
  }
  assert.ok(dueDateChat([chatAt(third)], SATURDAY));
});

// ---------- 真結局 ----------

test("第三次約會後：發出 true-love、記進圖鑑、聊天結束、不算 27 種", () => {
  const run = runWith(chatAt(dateStepIndex(2)));
  const r = act(run, UNLOCKED, { type: "goOnDate", choice: 0 });
  assert.equal(r.run.money, START_MONEY - 300);
  assert.equal(r.run.chats.length, 0);
  assert.equal(r.dex[TRUE_ENDING_ID].count, 1);
  assert.equal(settleRun(r), null);
  assert.deepEqual(
    r.events.find((e) => e.type === "gameEnding"),
    { type: "gameEnding", endingId: "true-love" }
  );
  assert.equal(dexProgress(r.dex).collected, dexProgress(UNLOCKED).collected);
});

test("結局進度：瓢蟲、真結局、Iris 一起算 n / 3", () => {
  assert.deepEqual(endingProgress({}), { collected: 0, total: 3 });
  assert.deepEqual(endingProgress({ [TRUE_ENDING_ID]: { count: 1, firstDayIndex: 0 } }), { collected: 1, total: 3 });
  assert.deepEqual(
    endingProgress({
      [TRUE_ENDING_ID]: { count: 1, firstDayIndex: 0 },
      [LADYBUG_ENDING_ID]: { count: 1, firstDayIndex: 0 },
      studio: { count: 1, firstDayIndex: 0 },
    }),
    { collected: 2, total: 3 }
  );
});

test("腳本：回程捷運、六段加片名，都有文字", () => {
  assert.deepEqual(TRUE_ENDING_BEATS.map((b) => b.scene), [
    "train",
    "noodles",
    "intimate",
    "intimate",
    "intimate",
    "intimateSex",
    "intimateSex",
    "intimateSex",
    "chiayi",
    "proposal",
    "wedding",
    "baby",
    "title",
  ]);
  for (const b of TRUE_ENDING_BEATS) assert.ok(b.text.trim().length > 0);
  assert.equal(TRUE_ENDING_BEATS.at(-1)?.text, "真結局\n已讀。\n然後她回了。");
});

test("腳本：床邊那段寫明是交往滿兩個月，排在求婚和婚禮之前", () => {
  const scenes = TRUE_ENDING_BEATS.map((b) => b.scene);
  const intimate = TRUE_ENDING_BEATS[scenes.indexOf("intimate")];
  assert.ok(intimate.text.startsWith("交往滿兩個月"));
  assert.ok(scenes.indexOf("intimate") < scenes.indexOf("proposal"));
  assert.ok(scenes.indexOf("intimate") < scenes.indexOf("wedding"));
  assert.ok(scenes.indexOf("intimate") < scenes.indexOf("intimateSex"));
  assert.ok(scenes.indexOf("intimateSex") < scenes.indexOf("chiayi"));
  const sexBeats = TRUE_ENDING_BEATS.filter((b) => b.scene === "intimateSex");
  assert.ok(sexBeats.length >= 2);
  assert.ok(sexBeats.some((b) => /進去|射|乳頭|濕|腰/.test(b.text)), "露骨段要真的寫到性行為");
});

test("validateStory 抓得到她路線的壞資料", () => {
  const base = { id: "x", dexName: "x", dexQuip: "x", category: "fade" as const };
  const end = { incoming: { kind: "read" as const }, ending: { narration: "x" } };
  const reply = { incoming: { kind: "read" as const }, replies: ["a", "b"] };
  const bad: Record<string, ReplyStep> = {
    分數數量不符: { ...reply, scores: [1] },
    分數超出範圍: { ...reply, scores: [2, 0] },
    門檻路線不存在: { ...reply, gate: { minScore: 2, failStoryId: "nope" } },
    假結局劇情不存在: { ...reply, fakeEnding: { storyId: "nope", narration: "x" } },
    約會花費是負數: { ...reply, date: { index: 0, cost: -1 } },
    一句回覆卻沒有回應: { ...reply, replies: ["a"] },
    等待天數是負數: { ...reply, wait: { days: -1 } },
  };
  for (const [name, step] of Object.entries(bad)) {
    assert.ok(validateStory({ ...base, steps: [step, end] }).length > 0, `沒有抓到：${name}`);
  }
});

// ---------- 存檔 ----------

test("舊存檔沒有 heroineMet：當作還沒遇過，不會當機", () => {
  const { heroineMet: _ignored, ...old } = createRun(1);
  void _ignored;
  const parsed = parseRun(JSON.stringify(old));
  assert.ok(parsed);
  assert.equal(parsed.heroineMet, false);
  assert.deepEqual(checkInvariants(parsed), []);
});

test("存檔往返：路線每一步都留得住，壞掉的 heroineMet 也能修復", () => {
  for (let stepIndex = 0; stepIndex < STORY.steps.length; stepIndex++) {
    const run = runWith(chatAt(stepIndex));
    assert.deepEqual(parseRun(serializeRun(run)), run, `第 ${stepIndex} 步`);
  }
  const tampered = JSON.stringify({ ...runWith(chatAt(2)), heroineMet: "yes" });
  const parsed = parseRun(tampered);
  assert.equal(parsed?.heroineMet, true, "已經在聊天就算遇過");
  assert.deepEqual(checkInvariants(parsed as RunState), []);
});

test("存檔：壞掉的聊天資料不會當機，也不會產生不合法的狀態", () => {
  for (const patch of [
    { stepIndex: 999 },
    { stepIndex: -3 },
    { replies: "nope" },
    { replies: [99, 99] },
    { opener: "boom" },
    { storyId: "__proto__" },
    { lastAdvancedDay: 9999 },
  ]) {
    const data = JSON.parse(serializeRun(runWith(chatAt(dateStepIndex(1))))) as { chats: object[] };
    data.chats[0] = { ...data.chats[0], ...patch };
    const parsed = parseRun(JSON.stringify(data));
    assert.ok(parsed, JSON.stringify(patch));
    assert.deepEqual(checkInvariants(parsed), [], JSON.stringify(patch));
    assert.ok(legalActions(parsed).length > 0, JSON.stringify(patch));
  }
});

test("圖鑑存檔：真結局和差一點留得住", () => {
  const meta = {
    v: 1 as const,
    introSeen: true,
    graduationSeen: false,
    counters: {},
    achievements: {},
    dex: {
      [TRUE_ENDING_ID]: { count: 1, firstDayIndex: 40 },
      [HEROINE_ALMOST_STORY_ID]: { count: 2, firstDayIndex: 8 },
    },
  };
  const parsed = parseMeta(serializeMeta(meta));
  assert.deepEqual(parsed.dex[TRUE_ENDING_ID], { count: 1, firstDayIndex: 40 });
  assert.deepEqual(parsed.dex[HEROINE_ALMOST_STORY_ID], { count: 2, firstDayIndex: 8 });
});

// ---------- 舊存檔：改版前的路線是 14 步，id 是 heroine ----------

/** 改版前的每一步：newStep 是它現在的位置，resume 是舊存檔停在這一步時改從哪裡接，reply 用來核對是同一步 */
const LEGACY_STEPS: readonly { newStep: number; resume?: number; reply: string }[] = [
  { newStep: 0, reply: "我都在家看，戲院太貴了" },
  { newStep: 1, reply: "多喝熱水" },
  { newStep: 2, reply: "老實說都在家。但我有點想改變，妳有推薦的地方嗎" },
  { newStep: 3, reply: "根據我們的訊息頻率，我認為時機成熟了" },
  { newStep: 4, reply: "好，我查一下場次" },
  { newStep: 6, reply: HEROINE_DATES[0].options[0].text },
  // 第一次約會回來還沒收到邀約：先玩到新的聊天（略過當晚收尾）
  { newStep: 10, resume: 8, reply: "好啊，週六傍晚六點半那邊見" },
  { newStep: 11, reply: HEROINE_DATES[1].options[0].text },
  // 第二次約會回來、假失敗還沒開始：先聊煙火（略過當晚收尾）
  { newStep: 14, resume: 13, reply: "最近有空嗎？想約妳" },
  { newStep: 15, reply: "好，那妳先忙" },
  { newStep: 16, reply: "好，那妳有空再說" },
  { newStep: 17, reply: "……就這樣了" },
  { newStep: 18, reply: "好。就再下週六晚上七點。" },
  { newStep: 21, reply: HEROINE_DATES[2].options[0].text },
];

function legacySave(stepIndex: number, patch: Partial<Chat> = {}) {
  const replies = Array.from({ length: stepIndex }, (_, i) => (i < 4 ? choiceFor(i, 1) : i === 6 || i === 12 ? 1 : 0));
  // 第 6 天約好：停在約會的舊存檔，約會日剛好是 SATURDAY
  return serializeRun(
    runWith(chatAt(stepIndex, { storyId: LEGACY_HEROINE_STORY_ID, replies, lastAdvancedDay: 6, ...patch }))
  );
}

test("舊存檔：對照表和新路線的每一步都對得上", () => {
  assert.equal(STORY_BY_ID[LEGACY_HEROINE_STORY_ID], undefined);
  LEGACY_STEPS.forEach(({ newStep, reply }) => assert.equal(stepAt(newStep).replies[0], reply, `第 ${newStep} 步`));
  assert.equal(STORY.steps.length, 22);
});

test("舊存檔的每一步都讀得進來：狀態合法，存回去再讀不會遷移第二次", () => {
  LEGACY_STEPS.forEach(({ newStep, resume }, stepIndex) => {
    const parsed = parseRun(legacySave(stepIndex));
    assert.ok(parsed, `舊第 ${stepIndex} 步`);
    assert.deepEqual(checkInvariants(parsed), [], `舊第 ${stepIndex} 步`);
    assert.equal(parsed.chats[0].storyId, HEROINE_STORY_ID);
    assert.equal(parsed.chats[0].stepIndex, resume ?? newStep, `舊第 ${stepIndex} 步`);
    assert.deepEqual(parseRun(serializeRun(parsed)), parsed, `舊第 ${stepIndex} 步`);
  });
});

test("舊存檔：選過的回覆、總分都留著，補上的聊天不影響分數", () => {
  const old = JSON.parse(legacySave(13)) as { chats: Chat[] };
  const parsed = parseRun(legacySave(13));
  assert.ok(parsed);
  const { replies } = parsed.chats[0];
  LEGACY_STEPS.slice(0, 13).forEach(({ newStep }, i) => assert.equal(replies[newStep], old.chats[0].replies[i], `舊第 ${i} 步`));
  assert.equal(chatScore(parsed.chats[0]), 4);
  const lines = chatTranscript(parsed.chats[0], generateGirl(HEROINE_SEED), parsed.dayIndex);
  const mine = lines.flatMap((l) => (l.who === "me" ? [l.text] : []));
  assert.ok(mine.includes("煙火七點半開始？我六點半到，順便查末班車"), "第 6 步選第二句要留著");
  assert.ok(mine.includes("可以。再下週六七點，我記行事曆。"), "第 12 步選第二句要留著");
});

test("舊存檔：手上在等的事情不變", () => {
  const load = (i: number) => parseRun(legacySave(i)) as RunState;
  // 約好的約會還是當週末就能去
  for (const [old, index] of [[5, 0], [7, 1], [13, 2]]) {
    assert.equal(dueDateChat(load(old).chats, SATURDAY)?.id, 1, `舊第 ${old} 步`);
    assert.equal(STORY.steps[load(old).chats[0].stepIndex] && stepAt(load(old).chats[0].stepIndex).date?.index, index);
  }
  // 按到一半的假失敗、等她回來的早上，都還在原本的地方
  const fake = act(load(11), UNLOCKED, { type: "reply", chatId: 1, choice: 0 });
  assert.ok(fake.events.some((e) => e.type === "fakeEnding"));
  assert.equal(comebackChat(load(12).chats, load(12).dayIndex + 1)?.id, 1);
  assert.equal(stepAt(load(10).chats[0].stepIndex).replies[0], "好，那妳有空再說");
});

test("舊存檔的每一步都走得到真結局", () => {
  LEGACY_STEPS.forEach((_, stepIndex) => {
    let run = parseRun(legacySave(stepIndex)) as RunState;
    let dex = UNLOCKED;
    let ended = false;
    for (let guard = 0; guard < 200 && !ended; guard++) {
      // 第一圈留在存檔那天（約會可能就是今天），之後每圈往後一天
      const dayIndex = guard === 0 ? run.dayIndex : nextPhoneDay(run.dayIndex + 1);
      run = { ...run, phase: "daytime", dayIndex, money: START_MONEY, dayReplies: 0, today: { ...FRESH_TODAY } };
      const best = run.chats[0] && stepAt(run.chats[0].stepIndex).scores?.indexOf(1);
      const action: GameAction = legalActions(run).includes("goOnDate")
        ? { type: "goOnDate", choice: 0 }
        : { type: "reply", chatId: 1, choice: best ?? 0 };
      const r = advance(run, dex, action);
      run = r.run;
      dex = r.dex;
      assert.deepEqual(checkInvariants(run), [], `舊第 ${stepIndex} 步`);
      ended = r.events.some((e) => e.type === "gameEnding");
    }
    assert.ok(ended, `舊第 ${stepIndex} 步走不到真結局`);
    assert.equal(dex[TRUE_ENDING_ID].count, 1);
  });
});

test("壞掉的舊存檔也不會當機：夾到合法範圍", () => {
  for (const patch of [{ stepIndex: 999 }, { stepIndex: -3 }, { stepIndex: 1.5 }, { replies: "nope" }, { replies: [99, 99] }, { replies: [] }]) {
    const data = JSON.parse(legacySave(9)) as { chats: object[] };
    data.chats[0] = { ...data.chats[0], ...patch };
    const parsed = parseRun(JSON.stringify(data));
    assert.ok(parsed, JSON.stringify(patch));
    assert.equal(parsed.chats[0].storyId, HEROINE_STORY_ID);
    assert.deepEqual(checkInvariants(parsed), [], JSON.stringify(patch));
    assert.ok(legalActions(parsed).length > 0, JSON.stringify(patch));
  }
});

test("走回失敗的舊存檔不用遷移：差一點的路線沒有變", () => {
  const data = JSON.parse(legacySave(4)) as { chats: Chat[] };
  data.chats[0].storyId = HEROINE_ALMOST_STORY_ID;
  const parsed = parseRun(JSON.stringify(data));
  assert.equal(parsed?.chats[0].storyId, HEROINE_ALMOST_STORY_ID);
  assert.equal(parsed?.chats[0].stepIndex, 4);
});

// ---------- 從頭走到尾、模糊測試 ----------

/** 像真人一樣走完一整條路線，每天都檢查不變量 */
function playToTrueEnding(seed: number) {
  let dex: Dex = UNLOCKED;
  let run = createRun(seed);
  const all: GameEvent[] = [];
  const step = (action: GameAction) => {
    const r = act(run, dex, action);
    run = r.run;
    dex = r.dex;
    all.push(...r.events);
  };
  for (let guard = 0; guard < 20_000 && !all.some((e) => e.type === "gameEnding"); guard++) {
    const chat = run.chats.find((c) => c.girlSeed === HEROINE_SEED);
    switch (run.phase) {
      case "payday":
        step({ type: "ackPayday" });
        break;
      case "daytime": {
        if (legalActions(run).includes("goOnDate")) {
          step({ type: "goOnDate", choice: 0 });
        } else if (chat && isChatReady(chat, run.dayIndex)) {
          const current = STORY.steps[chat.stepIndex] as ReplyStep;
          const best = current.scores ? current.scores.indexOf(1) : 0;
          step({ type: "reply", chatId: chat.id, choice: best });
        } else {
          step({ type: "endDaytime" });
        }
        break;
      }
      case "evening":
        step({ type: "goHome" });
        break;
      case "night":
        step(run.heroineMet ? { type: "sleep" } : { type: "openApp" });
        break;
      case "swiping":
        step(heroineCardIndex(run, dex) === run.deckIndex ? { type: "swipe", dir: "right" } : { type: "swipe", dir: "left" });
        break;
      case "matched":
        step({ type: "chooseOpener", opener: "interest" });
        break;
      case "nightDone":
        step({ type: "sleep" });
        break;
    }
  }
  return { run, dex, all };
}

test("整條路線走得到真結局：假失敗沒有記圖鑑，三次約會都付了錢", () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const { run, dex, all } = playToTrueEnding(seed);
    assert.ok(all.some((e) => e.type === "gameEnding"), `seed ${seed} 走不到真結局`);
    assert.equal(dex[TRUE_ENDING_ID].count, 1);
    assert.deepEqual(dexProgress(dex), dexProgress(UNLOCKED), "假失敗不能讓進度變多");
    assert.deepEqual(
      all.filter((e) => e.type === "dateFinished").map((e) => (e.type === "dateFinished" ? e.cost : 0)),
      [800, 500, 300]
    );
    assert.equal(all.filter((e) => e.type === "fakeEnding").length, 1);
    assert.equal(run.chats.length, 0);
  }
});

test("模糊測試涵蓋新路線：隨機走合法動作，不變量永遠成立，所有結局都走得到", () => {
  const reached = new Set<string>();
  for (let seed = 1; seed <= 40; seed++) {
    const rng = createRng(seed);
    let run = createRun(seed);
    let dex: Dex = UNLOCKED;
    for (let i = 0; i < 4000; i++) {
      const where = `seed ${seed} 第 ${i} 步（${run.phase}）`;
      const legal = legalActions(run);
      assert.ok(legal.length > 0, `${where} 沒有合法動作`);
      // 偏向赴約和回訊息，才走得進路線深處；右滑多一點才遇得到
      const type = legal.includes("goOnDate")
        ? "goOnDate"
        : legal.includes("reply") && rng() < 0.9
          ? "reply"
          : pick(rng, legal);
      const action = concrete(type, run, rng);
      const before = JSON.stringify([run, dex]);
      const r = advance(run, dex, action);
      assert.equal(JSON.stringify([run, dex]), before, `${where} ${action.type} 修改了輸入`);
      assert.notEqual(r.run, run, `${where} ${action.type} 列為合法卻沒有作用`);
      assert.deepEqual(checkInvariants(r.run), [], where);
      for (const e of r.events) {
        if (e.type === "fakeEnding") reached.add("假失敗");
        if (e.type === "gameEnding") reached.add(e.endingId);
        if (e.type === "chatEnded" && e.storyId === HEROINE_ALMOST_STORY_ID) reached.add("差一點");
      }
      // 存讀檔後一樣正常
      if (i % 97 === 0) {
        const reloaded = parseRun(serializeRun(r.run));
        assert.ok(reloaded, where);
        assert.deepEqual(checkInvariants(reloaded), [], where);
      }
      run = r.run;
      dex = r.dex;
    }
  }
  for (const name of ["差一點", "假失敗", TRUE_ENDING_ID]) assert.ok(reached.has(name), `沒走到 ${name}，只有 ${[...reached]}`);
});

function concrete(type: GameAction["type"], run: RunState, rng: () => number): GameAction {
  // 回訊息交給共用的：錢不夠的 1h2s 不會被按到，偶爾用賢者模式
  if (type === "reply") return newGameplayAction(type, run, rng)!;
  const ready = readyChats(run.chats, run.dayIndex, run.phase);
  const stepOf = (chat: Chat) => STORY_BY_ID[chat.storyId].steps[chat.stepIndex];
  switch (type) {
    case "closeChat": {
      const finals = ready.filter((c) => c && STORY_BY_ID[c.storyId] && isFinal(stepOf(c)));
      assert.ok(finals.length > 0, "legal 有 closeChat 卻沒有可收的聊天");
      return { type, chatId: pick(rng, finals).id };
    }
    case "deleteChat": {
      const closed = run.chats.filter((c) => c.closed);
      assert.ok(closed.length > 0, "legal 有 deleteChat 卻沒有已結束的聊天");
      return { type, chatId: pick(rng, closed).id };
    }
    case "goOnDate":
      return { type, choice: randInt(rng, 0, 1) };
    case "swipe":
      return { type, dir: rng() < 0.3 ? "left" : "right" };
    case "chooseOpener":
      return { type, opener: pick(rng, ["hi", "whatsup", "eaten", "interest"] as const) };
    default:
      return newGameplayAction(type, run, rng) ?? ({ type } as GameAction);
  }
}
