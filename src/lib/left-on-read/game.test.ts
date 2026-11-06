import { test } from "node:test";
import assert from "node:assert/strict";
import { calendarOf } from "./calendar.ts";
import {
  DECK_SIZE,
  MONTHLY_RENT,
  MONTHLY_SALARY,
  NOODLE_PRICE,
  START_MONEY,
} from "./constants.ts";
import { isDexComplete } from "./dex.ts";
import type { Dex } from "./dex.ts";
import { advance, applyCost, checkInvariants, createRun, deckCardSeed, legalActions, seededRngs } from "./game.ts";
import type { GameAction, GameEvent, Phase, RngFactory, RunState } from "./game.ts";
import { deckSeed, generateGirl } from "./girl.ts";
import { EDUCATIONS } from "./girlData.ts";
import { matchProbability } from "./match.ts";
import { MEALS } from "./meals.ts";
import { createRng, pick, randInt } from "./rng.ts";
import type { Rng } from "./rng.ts";
import { STORIES, STORY_BY_ID } from "./stories/index.ts";
import { firstReadyDay, isChatReady, readyChats } from "./story.ts";
import type { Chat, FinalStep, OpenerKind, ReplyStep, Story } from "./storyTypes.ts";

// ---------- 共用工具 ----------

/** 圖鑑可集滿的上限（真實對白 300 個 seed 實測：最少 22、中位 37、最多 65 天） */
const DEX_COMPLETE_MAX_GAME_DAYS = 120;

const MATCH: RngFactory = () => () => 0;
const NO_MATCH: RngFactory = () => () => 0.999;
const NET_PAY = 36_000 - 12_500;
const OPENERS: OpenerKind[] = ["hi", "whatsup", "eaten", "interest"];

const isFinal = (step: ReplyStep | FinalStep): step is FinalStep => "ending" in step;
const eventOf = <T extends GameEvent["type"]>(events: readonly GameEvent[], type: T) =>
  events.find((e): e is Extract<GameEvent, { type: T }> => e.type === type);
const countOf = (events: readonly GameEvent[], type: GameEvent["type"]) =>
  events.filter((e) => e.type === type).length;

const at = (patch: Partial<RunState>): RunState => ({ ...createRun(1), ...patch });
const fullDex = (): Dex => Object.fromEntries(STORIES.map((s) => [s.id, { count: 1, firstDayIndex: 0 }]));

/** 可以連續操作的一局，動作不合法時直接讓測試失敗 */
interface Session {
  run: RunState;
  dex: Dex;
  events: GameEvent[];
  all: GameEvent[];
  act(action: GameAction): void;
}

function session(run: RunState = createRun(1), rngs?: RngFactory, dex: Dex = {}): Session {
  const s: Session = {
    run,
    dex,
    events: [],
    all: [],
    act(action) {
      const r = advance(s.run, s.dex, action, rngs);
      assert.notEqual(r.run, s.run, `第 ${s.run.dayIndex} 天 ${s.run.phase} 的 ${action.type} 應該合法`);
      s.run = r.run;
      s.dex = r.dex;
      s.events = r.events;
      s.all.push(...r.events);
    },
  };
  return s;
}

/** 從目前階段一路走到隔天早上，不回訊息、不滑 */
function finishDay(s: Session) {
  if (s.run.phase === "payday") s.act({ type: "ackPayday" });
  if (s.run.phase === "daytime") s.act({ type: "endDaytime" });
  if (s.run.phase === "evening") s.act({ type: "goHome" });
  if (s.run.phase === "night" || s.run.phase === "nightDone") s.act({ type: "sleep" });
}

/** 走到當天晚上（租屋處） */
function toNight(s: Session) {
  if (s.run.phase === "payday") s.act({ type: "ackPayday" });
  if (s.run.phase === "daytime") s.act({ type: "endDaytime" });
  if (s.run.phase === "evening") s.act({ type: "goHome" });
}

const chatOf = (story: Story, patch: Partial<Chat> = {}): Chat => ({
  id: 1,
  girlSeed: 7,
  storyId: story.id,
  opener: "hi",
  stepIndex: 0,
  lastAdvancedDay: 0,
  replies: [],
  ...patch,
});

const readyDayOf = (chat: Chat) =>
  firstReadyDay(chat.lastAdvancedDay, STORY_BY_ID[chat.storyId].steps[chat.stepIndex].wait);

/** 已經走到最後一步、而且 ready 的聊天 */
function finalChat(story: Story, id = 1): Chat {
  const stepIndex = story.steps.length - 1;
  return chatOf(story, { id, stepIndex, replies: new Array<number>(stepIndex).fill(0) });
}

/** 至少有兩個回覆步驟的劇情，才能測連續推進 */
const longStories = () => {
  const list = STORIES.filter((s) => s.steps.length >= 3);
  assert.ok(list.length >= 2, "至少要有兩種三步以上的劇情");
  return list;
};

/** 把合法動作的類型變成可以送出的動作 */
function concreteAction(type: GameAction["type"], run: RunState, rng: Rng): GameAction {
  const ready = readyChats(run.chats, run.dayIndex);
  const stepOf = (chat: Chat) => STORY_BY_ID[chat.storyId].steps[chat.stepIndex];
  switch (type) {
    case "reply": {
      const chat = pick(rng, ready.filter((c) => !isFinal(stepOf(c))));
      const step = stepOf(chat) as ReplyStep;
      return { type, chatId: chat.id, choice: randInt(rng, 0, step.replies.length - 1) };
    }
    case "closeChat":
      return { type, chatId: pick(rng, ready.filter((c) => isFinal(stepOf(c)))).id };
    case "goOnDate":
      return { type, choice: randInt(rng, 0, 1) };
    case "swipe":
      return { type, dir: rng() < 0.5 ? "left" : "right" };
    case "chooseOpener":
      return { type, opener: pick(rng, OPENERS) };
    default:
      return { type };
  }
}

// ---------- 開局 ----------

test("金額常數符合規格", () => {
  assert.equal(START_MONEY, 8_200);
  assert.equal(MONTHLY_SALARY, 36_000);
  assert.equal(MONTHLY_RENT, 12_500);
  assert.equal(NOODLE_PRICE, 30);
  assert.equal(DECK_SIZE, 10);
});

test("createRun：起始狀態正確，通過不變量檢查", () => {
  const run = createRun(99);
  assert.equal(run.v, 1);
  assert.equal(run.runSeed, 99);
  assert.equal(run.dayIndex, 0);
  assert.equal(run.money, START_MONEY);
  assert.equal(run.phase, "daytime");
  assert.equal(run.rightStreak, 0);
  assert.equal(run.pendingMatchSeed, null);
  assert.deepEqual(run.chats, []);
  assert.deepEqual(checkInvariants(run), []);
});

test("applyCost：扣到 0 為止，不會變負數", () => {
  assert.equal(applyCost(100, 30), 70);
  assert.equal(applyCost(30, 30), 0);
  assert.equal(applyCost(10, 30), 0);
  assert.equal(applyCost(0, 0), 0);
  assert.equal(applyCost(50, 0), 50);
});

// ---------- 各階段的合法動作 ----------

const PHASE_CASES: Record<Phase, { state: RunState; legal: GameAction["type"][] }> = {
  payday: { state: at({ phase: "payday", dayIndex: 3 }), legal: ["ackPayday"] },
  daytime: { state: at({ phase: "daytime" }), legal: ["endDaytime"] },
  evening: {
    state: at({ phase: "evening", offeredMealId: MEALS[0].id, money: 100_000 }),
    legal: ["eatOut", "goHome"],
  },
  night: { state: at({ phase: "night" }), legal: ["openApp", "sleep"] },
  swiping: { state: at({ phase: "swiping" }), legal: ["swipe", "quitApp"] },
  matched: { state: at({ phase: "matched", pendingMatchSeed: 123, deckIndex: 1 }), legal: ["chooseOpener"] },
  nightDone: { state: at({ phase: "nightDone" }), legal: ["sleep"] },
};

const ONE_OF_EACH: GameAction[] = [
  { type: "ackPayday" },
  { type: "reply", chatId: 1, choice: 0 },
  { type: "closeChat", chatId: 1 },
  { type: "endDaytime" },
  { type: "eatOut" },
  { type: "goHome" },
  { type: "openApp" },
  { type: "swipe", dir: "left" },
  { type: "swipe", dir: "right" },
  { type: "chooseOpener", opener: "hi" },
  { type: "quitApp" },
  { type: "sleep" },
];

test("legalActions：每個階段只列出該階段的動作", () => {
  for (const [phase, { state, legal }] of Object.entries(PHASE_CASES)) {
    assert.deepEqual([...legalActions(state)].sort(), [...legal].sort(), phase);
  }
});

test("不合法動作回傳同一個 run 和 dex，events 為空", () => {
  const dex: Dex = {};
  for (const [phase, { state, legal }] of Object.entries(PHASE_CASES)) {
    for (const action of ONE_OF_EACH) {
      const r = advance(state, dex, action, MATCH);
      if (legal.includes(action.type)) {
        assert.notEqual(r.run, state, `${phase} 的 ${action.type} 應該合法`);
      } else {
        assert.equal(r.run, state, `${phase} 的 ${action.type} 應該不合法`);
        assert.equal(r.dex, dex);
        assert.deepEqual(r.events, []);
      }
    }
  }
});

test("參數無效的動作也回傳同一個 run", () => {
  const swiping = at({ phase: "swiping" });
  const matched = at({ phase: "matched", pendingMatchSeed: 5, deckIndex: 1 });
  const dex: Dex = {};
  const cases: [RunState, unknown][] = [
    [swiping, { type: "swipe", dir: "up" }],
    [swiping, { type: "swipe" }],
    [matched, { type: "chooseOpener", opener: "nope" }],
    [matched, { type: "chooseOpener" }],
    [swiping, { type: "nope" }],
  ];
  for (const [state, action] of cases) {
    const r = advance(state, dex, action as GameAction, MATCH);
    assert.equal(r.run, state, JSON.stringify(action));
    assert.deepEqual(r.events, []);
  }
});

// ---------- 白天與回訊息 ----------

test("平日和週末都能回訊息", () => {
  const story = longStories()[0];
  assert.equal(calendarOf(36).weekday, 2); // 週二
  assert.equal(calendarOf(40).weekday, 6); // 週六
  for (const dayIndex of [36, 40]) {
    const run = at({ phase: "daytime", dayIndex, chats: [chatOf(story)], nextChatId: 2 });
    assert.ok(legalActions(run).includes("reply"), `第 ${dayIndex} 天`);
    const s = session(run);
    s.act({ type: "reply", chatId: 1, choice: 0 });
    assert.equal(s.run.chats[0].stepIndex, 1);
    assert.equal(s.run.chats[0].lastAdvancedDay, dayIndex);
    assert.deepEqual(s.run.chats[0].replies, [0]);
    assert.equal(s.run.phase, "daytime");
    assert.equal(eventOf(s.events, "chatAdvanced")?.chatId, 1);
  }
});

test("reply 會記下選了第幾句", () => {
  const story = longStories()[0];
  const first = story.steps[0] as ReplyStep;
  const choice = first.replies.length - 1;
  const s = session(at({ phase: "daytime", dayIndex: 30, chats: [chatOf(story)], nextChatId: 2 }));
  s.act({ type: "reply", chatId: 1, choice });
  assert.deepEqual(s.run.chats[0].replies, [choice]);
});

test("白天不回訊息也能下班", () => {
  const story = longStories()[0];
  const run = at({ phase: "daytime", dayIndex: 30, chats: [chatOf(story)], nextChatId: 2 });
  assert.ok(legalActions(run).includes("endDaytime"));
  const s = session(run);
  s.act({ type: "endDaytime" });
  assert.equal(s.run.phase, "evening");
  assert.deepEqual(s.run.chats, run.chats);
});

test("legalActions：reply 和 closeChat 只在有對應的聊天時出現", () => {
  const story = longStories()[0];
  const waiting = chatOf(story, { lastAdvancedDay: 30 });
  assert.deepEqual(
    legalActions(at({ phase: "daytime", dayIndex: 30, chats: [waiting], nextChatId: 2 })),
    ["endDaytime"]
  );
  const replyable = at({ phase: "daytime", dayIndex: 60, chats: [chatOf(story)], nextChatId: 2 });
  assert.ok(legalActions(replyable).includes("reply"));
  assert.ok(!legalActions(replyable).includes("closeChat"));
  const closable = at({ phase: "daytime", dayIndex: 60, chats: [finalChat(story)], nextChatId: 2 });
  assert.ok(legalActions(closable).includes("closeChat"));
  assert.ok(!legalActions(closable).includes("reply"));
});

test("每個聊天每天只推進一步，同日第二次回傳同一參考", () => {
  const story = longStories()[0];
  const today = 30;
  const s = session(at({ phase: "daytime", dayIndex: today, chats: [chatOf(story)], nextChatId: 2 }));
  s.act({ type: "reply", chatId: 1, choice: 0 });
  const after = s.run;
  const again = advance(after, s.dex, { type: "reply", chatId: 1, choice: 0 });
  assert.equal(again.run, after);
  assert.deepEqual(again.events, []);
});

test("多個聊天當天各推一步，互不影響", () => {
  const [a, b] = longStories();
  const s = session(
    at({
      phase: "daytime",
      dayIndex: 30,
      chats: [chatOf(a, { id: 1 }), chatOf(b, { id: 2 })],
      nextChatId: 3,
    })
  );
  s.act({ type: "reply", chatId: 1, choice: 0 });
  assert.deepEqual(s.run.chats.map((c) => c.stepIndex), [1, 0]);
  s.act({ type: "reply", chatId: 2, choice: 1 });
  assert.deepEqual(s.run.chats.map((c) => c.stepIndex), [1, 1]);
  assert.deepEqual(s.run.chats.map((c) => c.replies), [[0], [1]]);
});

test("推進後，到下一步的等待日才恢復", () => {
  const story = longStories()[0];
  const today = 30;
  const s = session(at({ phase: "daytime", dayIndex: today, chats: [chatOf(story)], nextChatId: 2 }));
  s.act({ type: "reply", chatId: 1, choice: 0 });
  const nextReady = readyDayOf(s.run.chats[0]);
  assert.ok(nextReady > today);
  assert.equal(isChatReady(s.run.chats[0], today), false);
  assert.equal(isChatReady(s.run.chats[0], nextReady), true);
  const later = session({ ...s.run, dayIndex: nextReady });
  const step = story.steps[1];
  later.act(isFinal(step) ? { type: "closeChat", chatId: 1 } : { type: "reply", chatId: 1, choice: 0 });
});

test("還沒 ready 的聊天不能回", () => {
  const story = longStories()[0];
  const run = at({ phase: "daytime", dayIndex: 30, chats: [chatOf(story, { lastAdvancedDay: 30 })], nextChatId: 2 });
  assert.equal(advance(run, {}, { type: "reply", chatId: 1, choice: 0 }).run, run);
  const last = at({ phase: "daytime", dayIndex: 30, chats: [{ ...finalChat(story), lastAdvancedDay: 30 }], nextChatId: 2 });
  assert.equal(advance(last, {}, { type: "closeChat", chatId: 1 }).run, last);
});

// 下面三個測試都讓「另一個聊天」可以做同一種動作，這樣 legalActions 會列出該動作，
// 才驗證得到 advance 有逐一檢查指定的聊天，而不是只靠階段層級的判斷。

test("另一個聊天還能回時，今天回過的聊天仍然不能再回", () => {
  const [a, b] = longStories();
  const s = session(
    at({ phase: "daytime", dayIndex: 30, chats: [chatOf(a, { id: 1 }), chatOf(b, { id: 2 })], nextChatId: 3 })
  );
  s.act({ type: "reply", chatId: 1, choice: 0 });
  assert.ok(legalActions(s.run).includes("reply"));
  const again = advance(s.run, s.dex, { type: "reply", chatId: 1, choice: 0 });
  assert.equal(again.run, s.run);
  assert.deepEqual(again.events, []);
});

test("另一個聊天 ready 時，還沒 ready 的聊天仍然不能回或結束", () => {
  const [a, b] = longStories();
  const today = 60;
  const replyRun = at({
    phase: "daytime",
    dayIndex: today,
    chats: [chatOf(a, { id: 1, lastAdvancedDay: today }), chatOf(b, { id: 2 })],
    nextChatId: 3,
  });
  assert.ok(legalActions(replyRun).includes("reply"));
  const replied = advance(replyRun, {}, { type: "reply", chatId: 1, choice: 0 });
  assert.equal(replied.run, replyRun);
  assert.deepEqual(replied.events, []);

  const closeRun = at({
    phase: "daytime",
    dayIndex: today,
    chats: [{ ...finalChat(a, 1), lastAdvancedDay: today }, finalChat(b, 2)],
    nextChatId: 3,
  });
  assert.ok(legalActions(closeRun).includes("closeChat"));
  const closed = advance(closeRun, {}, { type: "closeChat", chatId: 1 });
  assert.equal(closed.run, closeRun);
  assert.deepEqual(closed.events, []);
});

test("動作和聊天的步驟不符時不合法，即使另一個聊天可以做那個動作", () => {
  const [a, b] = longStories();
  const run = at({
    phase: "daytime",
    dayIndex: 60,
    chats: [chatOf(a, { id: 1 }), finalChat(b, 2)],
    nextChatId: 3,
  });
  assert.ok(legalActions(run).includes("reply"));
  assert.ok(legalActions(run).includes("closeChat"));
  const actions: GameAction[] = [
    { type: "reply", chatId: 2, choice: 0 },
    { type: "closeChat", chatId: 1 },
  ];
  for (const action of actions) {
    const r = advance(run, {}, action);
    assert.equal(r.run, run, action.type);
    assert.deepEqual(r.events, [], action.type);
  }
});

test("不存在的 chatId、超範圍的 choice 都回傳同一參考", () => {
  const story = longStories()[0];
  const first = story.steps[0] as ReplyStep;
  const run = at({ phase: "daytime", dayIndex: 30, chats: [chatOf(story)], nextChatId: 2 });
  const dex: Dex = {};
  const bad: GameAction[] = [
    { type: "reply", chatId: 999, choice: 0 },
    { type: "closeChat", chatId: 999 },
    { type: "reply", chatId: 1, choice: -1 },
    { type: "reply", chatId: 1, choice: first.replies.length },
    { type: "reply", chatId: 1, choice: 0.5 },
    { type: "reply", chatId: 1, choice: NaN },
  ];
  for (const action of bad) {
    const r = advance(run, dex, action);
    assert.equal(r.run, run, JSON.stringify(action));
    assert.equal(r.dex, dex);
    assert.deepEqual(r.events, []);
  }
});

test("reply 用在末步、closeChat 用在非末步都不合法", () => {
  const story = longStories()[0];
  const last = at({ phase: "daytime", dayIndex: 60, chats: [finalChat(story)], nextChatId: 2 });
  assert.equal(advance(last, {}, { type: "reply", chatId: 1, choice: 0 }).run, last);
  const first = at({ phase: "daytime", dayIndex: 60, chats: [chatOf(story)], nextChatId: 2 });
  assert.equal(advance(first, {}, { type: "closeChat", chatId: 1 }).run, first);
});

// ---------- 結局與圖鑑 ----------

test("closeChat：移除聊天、記圖鑑、發事件", () => {
  const story = STORIES.find((s) => !(s.steps[s.steps.length - 1] as FinalStep).ending.cost);
  assert.ok(story);
  const s = session(at({ phase: "daytime", dayIndex: 60, chats: [finalChat(story)], nextChatId: 2 }));
  s.act({ type: "closeChat", chatId: 1 });
  assert.deepEqual(s.run.chats, []);
  assert.deepEqual(s.dex[story.id], { count: 1, firstDayIndex: 60 });
  const ended = eventOf(s.events, "chatEnded");
  assert.ok(ended);
  assert.equal(ended.storyId, story.id);
  assert.equal(ended.firstTime, true);
  assert.equal(ended.paid, 0);
  assert.equal(s.run.money, START_MONEY);
});

test("同一種失敗第二次：次數加一，事件不是首次，傳入的 dex 不被修改", () => {
  const story = STORIES[0];
  const dex: Dex = { [story.id]: { count: 1, firstDayIndex: 5 } };
  const snapshot = structuredClone(dex);
  const s = session(at({ phase: "daytime", dayIndex: 60, chats: [finalChat(story)], nextChatId: 2 }), undefined, dex);
  s.act({ type: "closeChat", chatId: 1 });
  assert.deepEqual(s.dex[story.id], { count: 2, firstDayIndex: 5 });
  assert.equal(eventOf(s.events, "chatEnded")?.firstTime, false);
  assert.deepEqual(dex, snapshot);
});

test("花費扣到 0 為止，不變負，事件記實扣金額", () => {
  const story = STORY_BY_ID["stood-up"];
  const cost = (story.steps[story.steps.length - 1] as FinalStep).ending.cost;
  assert.ok(typeof cost === "number" && cost > 1);

  const rich = session(at({ phase: "daytime", dayIndex: 60, money: cost + 5, chats: [finalChat(story)], nextChatId: 2 }));
  rich.act({ type: "closeChat", chatId: 1 });
  assert.equal(rich.run.money, 5);
  assert.equal(eventOf(rich.events, "chatEnded")?.paid, cost);

  const poor = session(at({ phase: "daytime", dayIndex: 60, money: 1, chats: [finalChat(story)], nextChatId: 2 }));
  poor.act({ type: "closeChat", chatId: 1 });
  assert.equal(poor.run.money, 0);
  assert.equal(eventOf(poor.events, "chatEnded")?.paid, 1);
});

test("stock-sister 的結局事件帶防詐標記，也不扣錢", () => {
  const story = STORY_BY_ID["stock-sister"];
  const s = session(at({ phase: "daytime", dayIndex: 60, chats: [finalChat(story)], nextChatId: 2 }));
  s.act({ type: "closeChat", chatId: 1 });
  const ended = eventOf(s.events, "chatEnded");
  assert.equal(ended?.antiFraud, true);
  assert.equal(ended?.paid, 0);
  assert.equal(s.run.money, START_MONEY);
});

test("dexCompleted：只在未滿變已滿時發一次", () => {
  const [last, other] = STORIES;
  const almost = fullDex();
  delete almost[last.id];
  delete almost[other.id];
  const s = session(
    at({
      phase: "daytime",
      dayIndex: 60,
      chats: [finalChat(other, 1), finalChat(last, 2)],
      nextChatId: 3,
    }),
    undefined,
    almost
  );
  s.act({ type: "closeChat", chatId: 1 });
  assert.equal(countOf(s.events, "dexCompleted"), 0);
  assert.equal(isDexComplete(s.dex), false);
  s.act({ type: "closeChat", chatId: 2 });
  assert.equal(countOf(s.events, "dexCompleted"), 1);
  assert.equal(isDexComplete(s.dex), true);

  const again = session(at({ phase: "daytime", dayIndex: 70, chats: [finalChat(last)], nextChatId: 2 }), undefined, s.dex);
  again.act({ type: "closeChat", chatId: 1 });
  assert.equal(countOf(again.events, "dexCompleted"), 0);
});

// ---------- 領薪 ----------

test("睡到 5 號進 payday，其他日子進 daytime", () => {
  const before = session(at({ phase: "night", dayIndex: 2 }));
  before.act({ type: "sleep" });
  assert.equal(before.run.dayIndex, 3);
  assert.equal(before.run.phase, "payday");

  const normal = session(at({ phase: "night", dayIndex: 3 }));
  normal.act({ type: "sleep" });
  assert.equal(normal.run.dayIndex, 4);
  assert.equal(normal.run.phase, "daytime");
});

test("5 號落在週末也會進 payday", () => {
  for (const dayIndex of [34, 125, 187, 278]) {
    const s = session(at({ phase: "nightDone", dayIndex: dayIndex - 1 }));
    s.act({ type: "sleep" });
    assert.equal(s.run.phase, "payday", `第 ${dayIndex} 天`);
  }
});

test("ackPayday：淨增 23,500，只入帳一次", () => {
  const s = session(at({ phase: "payday", dayIndex: 3, money: 1_000 }));
  s.act({ type: "ackPayday" });
  assert.equal(s.run.money, 1_000 + NET_PAY);
  assert.equal(s.run.phase, "daytime");
  const payday = eventOf(s.events, "payday");
  assert.ok(payday);
  assert.equal(payday.before, 1_000);
  assert.equal(payday.after, 1_000 + NET_PAY);
  const again = advance(s.run, s.dex, { type: "ackPayday" });
  assert.equal(again.run, s.run);
  assert.equal(s.run.money, 1_000 + NET_PAY);
});

test("身上沒錢也領得到薪水", () => {
  const s = session(at({ phase: "payday", dayIndex: 3, money: 0 }));
  s.act({ type: "ackPayday" });
  assert.equal(s.run.money, NET_PAY);
});

test("跨月跨年：一年領 12 次薪水，日期連續，金額正確", () => {
  const s = session(createRun(1), NO_MATCH);
  const paydays: number[] = [];
  for (let day = 0; day < 365; day++) {
    assert.equal(s.run.dayIndex, day);
    if (s.run.phase === "payday") paydays.push(day);
    assert.equal(s.run.phase === "payday", calendarOf(day).day === 5, `第 ${day} 天`);
    finishDay(s);
  }
  assert.equal(paydays.length, 12);
  assert.ok(paydays.includes(309)); // 2027-01-05
  assert.equal(s.run.money, START_MONEY + 12 * NET_PAY - 365 * NOODLE_PRICE);
});

// ---------- 吃飯 ----------

test("endDaytime：抽今日餐點，存進 offeredMealId", () => {
  const s = session(at({ phase: "daytime", dayIndex: 1 }));
  s.act({ type: "endDaytime" });
  assert.equal(s.run.phase, "evening");
  assert.ok(MEALS.some((m) => m.id === s.run.offeredMealId));
});

test("同一天的餐點固定，不同天會換", () => {
  const offered = (dayIndex: number) => {
    const s = session(at({ phase: "daytime", dayIndex }));
    s.act({ type: "endDaytime" });
    return s.run.offeredMealId;
  };
  assert.equal(offered(7), offered(7));
  const seen = new Set(Array.from({ length: 60 }, (_, i) => offered(i)));
  assert.ok(seen.size > 1);
});

test("eatOut：扣餐費到 night，事件帶名稱、價格和旁白", () => {
  const meal = MEALS[0];
  const s = session(at({ phase: "evening", offeredMealId: meal.id, money: meal.price + 7 }));
  s.act({ type: "eatOut" });
  assert.equal(s.run.money, 7);
  assert.equal(s.run.phase, "night");
  const e = eventOf(s.events, "meal");
  assert.ok(e);
  assert.equal(e.name, meal.name);
  assert.equal(e.price, meal.price);
  assert.equal(e.narration, meal.narration);
  assert.equal(e.dish, meal.dish);
});

test("錢剛好夠可以吃，錢不夠 eatOut 不合法", () => {
  const meal = MEALS[0];
  const exact = session(at({ phase: "evening", offeredMealId: meal.id, money: meal.price }));
  exact.act({ type: "eatOut" });
  assert.equal(exact.run.money, 0);

  const poor = at({ phase: "evening", offeredMealId: meal.id, money: meal.price - 1 });
  assert.equal(advance(poor, {}, { type: "eatOut" }).run, poor);
  assert.deepEqual(legalActions(poor), ["goHome"]);
});

test("goHome：扣 30 元到 night，錢不夠時最低到 0", () => {
  const meal = MEALS[0];
  const cases: [number, number][] = [
    [100, 70],
    [30, 0],
    [10, 0],
    [0, 0],
  ];
  for (const [money, expected] of cases) {
    const s = session(at({ phase: "evening", offeredMealId: meal.id, money }));
    s.act({ type: "goHome" });
    assert.equal(s.run.money, expected);
    assert.equal(s.run.phase, "night");
  }
});

// ---------- 深夜與滑卡 ----------

test("可以不開 Swipy 直接睡", () => {
  const s = session(at({ phase: "night", dayIndex: 1 }));
  s.act({ type: "sleep" });
  assert.equal(s.run.dayIndex, 2);
});

test("openApp 從第一張開始", () => {
  const s = session(at({ phase: "night", deckIndex: 7 }));
  s.act({ type: "openApp" });
  assert.equal(s.run.phase, "swiping");
  assert.equal(s.run.deckIndex, 0);
});

test("每晚 10 張：第 10 張後到 nightDone，第 11 次不合法", () => {
  const s = session(at({ phase: "swiping" }), NO_MATCH);
  for (let i = 1; i <= DECK_SIZE; i++) {
    assert.equal(s.run.phase, "swiping", `滑第 ${i} 張之前`);
    s.act({ type: "swipe", dir: i % 2 ? "left" : "right" });
    assert.equal(s.run.deckIndex, i);
    assert.ok(eventOf(s.events, "swiped"), `第 ${i} 張沒有 swiped 事件`);
  }
  assert.equal(s.run.phase, "nightDone");
  const eleventh = advance(s.run, s.dex, { type: "swipe", dir: "left" }, MATCH);
  assert.equal(eleventh.run, s.run);
});

test("提早放棄：到 nightDone，只剩 sleep，也不能再打開 App", () => {
  const s = session(at({ phase: "swiping", deckIndex: 3 }));
  s.act({ type: "quitApp" });
  assert.equal(s.run.phase, "nightDone");
  assert.deepEqual(legalActions(s.run), ["sleep"]);
  assert.equal(advance(s.run, s.dex, { type: "openApp" }).run, s.run);
});

test("左滑即使亂數是 0 也不會配對", () => {
  const s = session(at({ phase: "swiping" }), MATCH);
  for (let i = 0; i < DECK_SIZE; i++) {
    s.act({ type: "swipe", dir: "left" });
    assert.equal(eventOf(s.events, "matched"), undefined);
    assert.equal(s.run.pendingMatchSeed, null);
  }
  assert.equal(s.run.phase, "nightDone");
  assert.deepEqual(s.run.chats, []);
});

test("右滑沒配對：留在 swiping，發 noMatch", () => {
  const s = session(at({ phase: "swiping" }), NO_MATCH);
  s.act({ type: "swipe", dir: "right" });
  assert.equal(s.run.phase, "swiping");
  assert.ok(eventOf(s.events, "noMatch"));
  assert.equal(eventOf(s.events, "matched"), undefined);
});

test("右滑配對：進 matched，對象就是這張卡", () => {
  const day = 4;
  const s = session(at({ phase: "swiping", dayIndex: day, deckIndex: 2, runSeed: 77 }), MATCH);
  const seed = deckSeed(77, day, 2);
  s.act({ type: "swipe", dir: "right" });
  assert.equal(s.run.phase, "matched");
  assert.equal(s.run.pendingMatchSeed, seed);
  assert.equal(s.run.deckIndex, 3);
  assert.equal(eventOf(s.events, "matched")?.girlSeed, seed);
  assert.deepEqual(legalActions(s.run), ["chooseOpener"]);
});

test("matched 時不能放棄", () => {
  const s = session(at({ phase: "swiping" }), MATCH);
  s.act({ type: "swipe", dir: "right" });
  assert.equal(advance(s.run, s.dex, { type: "quitApp" }).run, s.run);
});

test("chooseOpener：建立聊天，配對當晚不算 ready，然後回 swiping", () => {
  const day = 4;
  const s = session(at({ phase: "swiping", dayIndex: day, runSeed: 77 }), MATCH);
  s.act({ type: "swipe", dir: "right" });
  const seed = s.run.pendingMatchSeed;
  s.act({ type: "chooseOpener", opener: "interest" });
  assert.equal(s.run.phase, "swiping");
  assert.equal(s.run.pendingMatchSeed, null);
  assert.equal(s.run.chats.length, 1);
  const [chat] = s.run.chats;
  assert.equal(chat.girlSeed, seed);
  assert.equal(chat.opener, "interest");
  assert.equal(chat.stepIndex, 0);
  assert.equal(chat.lastAdvancedDay, day);
  assert.deepEqual(chat.replies, []);
  assert.ok(STORY_BY_ID[chat.storyId]);
  assert.equal(isChatReady(chat, day), false);
  assert.deepEqual(readyChats(s.run.chats, day), []);
  assert.equal(isChatReady(chat, readyDayOf(chat)), true);
});

test("配對回覆開場白後，下一張卡是不同的人（seed 與暱稱都不重複）", () => {
  const MATCH_ALL: RngFactory = () => () => 0;
  let collisions = 0;
  for (let runSeed = 1; runSeed <= 200; runSeed++) {
    for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
      const s = session(at({ phase: "swiping", runSeed, dayIndex, heroineMet: true }), MATCH_ALL);
      while (s.run.phase === "swiping" && s.run.deckIndex < DECK_SIZE) {
        const beforeSeed = deckCardSeed(s.run, s.dex, s.run.deckIndex);
        const beforeNick = generateGirl(beforeSeed).nickname;
        s.act({ type: "swipe", dir: "right" });
        if (s.run.phase !== "matched") continue;
        assert.equal(s.run.pendingMatchSeed, beforeSeed);
        s.act({ type: "chooseOpener", opener: "hi" });
        assert.equal(s.run.pendingMatchSeed, null);
        if (s.run.phase !== "swiping") break;
        const nextSeed = deckCardSeed(s.run, s.dex, s.run.deckIndex);
        const nextNick = generateGirl(nextSeed).nickname;
        assert.notEqual(nextSeed, beforeSeed, `runSeed=${runSeed} day=${dayIndex} 下一張 seed 撞了`);
        assert.notEqual(nextNick, beforeNick, `runSeed=${runSeed} day=${dayIndex} 下一張暱稱撞了（${beforeNick}）`);
        // 下一張也不該是已在聊的人
        assert.ok(!s.run.chats.some((c) => c.girlSeed === nextSeed));
      }
    }
  }
  assert.equal(collisions, 0);
});

test("同晚牌組暱稱不重複，已在聊的人也不再出現", () => {
  for (let runSeed = 1; runSeed <= 100; runSeed++) {
    const run = at({ phase: "swiping", runSeed, dayIndex: runSeed % 20, heroineMet: true });
    const dex = {};
    const nicks = new Set<string>();
    const seeds = new Set<number>();
    for (let i = 0; i < DECK_SIZE; i++) {
      const seed = deckCardSeed(run, dex, i);
      assert.ok(!seeds.has(seed), `seed 重複 runSeed=${runSeed} i=${i}`);
      seeds.add(seed);
      const nick = generateGirl(seed).nickname;
      assert.ok(!nicks.has(nick), `暱稱重複 ${nick} runSeed=${runSeed} i=${i}`);
      nicks.add(nick);
    }
    // 假裝已經在和第一張聊天，重算後面的牌不應再抽到她
    const chatting = { ...run, chats: [{ id: 1, girlSeed: deckCardSeed(run, dex, 0), storyId: "bot", opener: "hi" as const, stepIndex: 0, lastAdvancedDay: 0, replies: [] }] };
    for (let i = 1; i < DECK_SIZE; i++) {
      assert.notEqual(deckCardSeed(chatting, dex, i), chatting.chats[0].girlSeed);
      assert.notEqual(generateGirl(deckCardSeed(chatting, dex, i)).nickname, generateGirl(chatting.chats[0].girlSeed).nickname);
    }
  }
});

test("第 10 張配對時，選完開場白到 nightDone", () => {
  const s = session(at({ phase: "swiping", deckIndex: DECK_SIZE - 1 }), MATCH);
  s.act({ type: "swipe", dir: "right" });
  assert.equal(s.run.phase, "matched");
  assert.equal(s.run.deckIndex, DECK_SIZE);
  s.act({ type: "chooseOpener", opener: "hi" });
  assert.equal(s.run.phase, "nightDone");
  assert.equal(s.run.chats.length, 1);
});

test("聊天 id 不重複，進行中的劇情也不重複，全部占用仍能配對", () => {
  const s = session(at({ phase: "night" }), MATCH);
  const target = STORIES.length + 2;
  while (s.run.chats.length < target) {
    if (s.run.phase === "night") s.act({ type: "openApp" });
    else if (s.run.phase === "swiping") s.act({ type: "swipe", dir: "right" });
    else if (s.run.phase === "matched") s.act({ type: "chooseOpener", opener: "hi" });
    else if (s.run.phase === "nightDone") s.act({ type: "sleep" });
    else if (s.run.phase === "payday") s.act({ type: "ackPayday" });
    else if (s.run.phase === "daytime") s.act({ type: "endDaytime" });
    else if (s.run.phase === "evening") s.act({ type: "goHome" });
    if (s.run.chats.length === STORIES.length) {
      assert.equal(new Set(s.run.chats.map((c) => c.storyId)).size, STORIES.length);
    }
  }
  assert.equal(new Set(s.run.chats.map((c) => c.id)).size, target);
  assert.ok(s.run.chats.every((c) => c.id < s.run.nextChatId));
  assert.deepEqual(checkInvariants(s.run), []);
});

test("配對機率用這次滑動之前的連續次數，和卡片資料", () => {
  const runSeed = 5;
  const dayIndex = 2;
  const deckIndex = 4;
  const girl = generateGirl(deckSeed(runSeed, dayIndex, deckIndex));
  const edu = EDUCATIONS.find((e) => e.id === girl.education);
  assert.ok(edu);
  const pAt = (rightStreak: number) =>
    matchProbability({ pickiness: girl.pickiness, rightStreak, age: girl.age, eduMod: edu.matchMod });
  const swipeWith = (rightStreak: number, value: number) => {
    const s = session(at({ phase: "swiping", runSeed, dayIndex, deckIndex, rightStreak }), () => () => value);
    s.act({ type: "swipe", dir: "right" });
    return s.run.phase;
  };
  const eps = 1e-9;
  assert.equal(swipeWith(0, pAt(0) - eps), "matched");
  assert.equal(swipeWith(0, pAt(0) + eps), "swiping");
  assert.equal(swipeWith(5, pAt(5) - eps), "matched");
  assert.equal(swipeWith(5, pAt(5) + eps), "swiping");
  // 連續次數較高時，同樣的亂數反而配不到
  assert.equal(swipeWith(5, pAt(0) - eps), "swiping");
});

test("連續次數：右滑加一，左滑歸零，而且跨夜保留", () => {
  const s = session(createRun(1), NO_MATCH);
  toNight(s);
  s.act({ type: "openApp" });
  s.act({ type: "swipe", dir: "right" });
  s.act({ type: "swipe", dir: "right" });
  s.act({ type: "swipe", dir: "right" });
  assert.equal(s.run.rightStreak, 3);
  s.act({ type: "quitApp" });
  s.act({ type: "sleep" });
  assert.equal(s.run.rightStreak, 3);

  toNight(s);
  assert.equal(s.run.rightStreak, 3);
  s.act({ type: "openApp" });
  s.act({ type: "swipe", dir: "right" });
  assert.equal(s.run.rightStreak, 4);
  s.act({ type: "swipe", dir: "left" });
  assert.equal(s.run.rightStreak, 0);
});

test("配對成功也算連續右滑", () => {
  const s = session(at({ phase: "swiping", rightStreak: 2 }), MATCH);
  s.act({ type: "swipe", dir: "right" });
  assert.equal(s.run.rightStreak, 3);
  s.act({ type: "chooseOpener", opener: "eaten" });
  assert.equal(s.run.rightStreak, 3);
});

// ---------- 亂數 ----------

test("seededRngs：同用途同鍵值得到同樣的亂數，換任一項就不同", () => {
  const first = (factory: RngFactory, purpose: "meal" | "match" | "story", ...keys: number[]) =>
    factory(purpose, ...keys)();
  const a = seededRngs(1);
  assert.equal(first(a, "meal", 3), first(seededRngs(1), "meal", 3));
  assert.notEqual(first(a, "meal", 3), first(a, "meal", 4));
  assert.notEqual(first(a, "meal", 3), first(a, "match", 3));
  assert.notEqual(first(a, "match", 3, 1), first(a, "match", 3, 2));
  assert.notEqual(first(a, "story", 3), first(seededRngs(2), "story", 3));
});

test("沒傳 rngs 時，等同用 runSeed 建立的 seededRngs", () => {
  const swiping = at({ phase: "swiping", runSeed: 31, dayIndex: 9, deckIndex: 2 });
  const action: GameAction = { type: "swipe", dir: "right" };
  assert.deepEqual(advance(swiping, {}, action), advance(swiping, {}, action, seededRngs(31)));
  const daytime = at({ phase: "daytime", runSeed: 31, dayIndex: 9 });
  assert.deepEqual(
    advance(daytime, {}, { type: "endDaytime" }),
    advance(daytime, {}, { type: "endDaytime" }, seededRngs(31))
  );
});

test("配對亂數不存游標：換不同天或不同張，會要求不同的亂數", () => {
  const swipeKeys = (dayIndex: number, deckIndex: number) => {
    const calls: unknown[][] = [];
    const rngs: RngFactory = (purpose, ...keys) => {
      calls.push([purpose, ...keys]);
      return () => 0.999;
    };
    advance(at({ phase: "swiping", dayIndex, deckIndex }), {}, { type: "swipe", dir: "right" }, rngs);
    return calls;
  };
  const a = swipeKeys(2, 3);
  assert.ok(a.length > 0 && a.every((c) => c[0] === "match"));
  assert.deepEqual(swipeKeys(2, 3), a);
  assert.notDeepEqual(swipeKeys(2, 4), a);
  assert.notDeepEqual(swipeKeys(5, 3), a);
});

// ---------- 不變量 ----------

test("checkInvariants 抓得到壞狀態", () => {
  const story = STORIES[0];
  const good = chatOf(story);
  const bad: Record<string, Partial<RunState>> = {
    錢是負數: { money: -1 },
    錢是小數: { money: 1.5 },
    錢是NaN: { money: NaN },
    天數是負數: { dayIndex: -1 },
    天數是小數: { dayIndex: 1.5 },
    連續次數是負數: { rightStreak: -1 },
    牌組位置超出: { deckIndex: DECK_SIZE + 1 },
    牌組位置是負數: { deckIndex: -1 },
    未知階段: { phase: "boss" as Phase },
    matched缺對象: { phase: "matched", pendingMatchSeed: null },
    evening缺餐點: { phase: "evening", offeredMealId: null },
    evening餐點無效: { phase: "evening", offeredMealId: "no-such-meal" },
    聊天id重複: { chats: [good, { ...good, storyId: STORIES[1].id }], nextChatId: 2 },
    下一個id太小: { chats: [good], nextChatId: 1 },
    未知劇情: { chats: [{ ...good, storyId: "no-such-story" }], nextChatId: 2 },
    步驟超出: { chats: [{ ...good, stepIndex: story.steps.length }], nextChatId: 2 },
    步驟是負數: { chats: [{ ...good, stepIndex: -1 }], nextChatId: 2 },
  };
  for (const [name, patch] of Object.entries(bad)) {
    assert.ok(checkInvariants(at(patch)).length > 0, `沒有抓到：${name}`);
  }
});

test("模糊測試：隨機走合法動作，不變量永遠成立，永遠有路可走，也不修改輸入", () => {
  const seenPhases = new Set<Phase>();
  for (const seed of [1, 2, 3, 2026, 987654321]) {
    const rng = createRng(seed);
    let run = createRun(seed);
    let dex: Dex = {};
    for (let i = 0; i < 5000; i++) {
      const where = `seed ${seed} 第 ${i} 步（${run.phase}）`;
      const legal = legalActions(run);
      assert.ok(legal.length > 0, `${where} 沒有合法動作`);
      const action = concreteAction(pick(rng, legal), run, rng);
      const before = JSON.stringify([run, dex]);
      const r = advance(run, dex, action);
      assert.equal(JSON.stringify([run, dex]), before, `${where} ${action.type} 修改了輸入`);
      assert.notEqual(r.run, run, `${where} ${action.type} 列為合法卻沒有作用`);
      assert.ok(r.run.dayIndex >= run.dayIndex, `${where} 日子倒退`);
      assert.ok(Number.isInteger(r.run.money) && r.run.money >= 0, `${where} 錢是 ${r.run.money}`);
      assert.deepEqual(checkInvariants(r.run), [], where);
      run = r.run;
      dex = r.dex;
      seenPhases.add(run.phase);
    }
    assert.ok(run.dayIndex > 30, `seed ${seed} 走了 5000 步才到第 ${run.dayIndex} 天`);
  }
  assert.equal(seenPhases.size, Object.keys(PHASE_CASES).length, `只走過 ${[...seenPhases].join("、")}`);
});

// ---------- 機器人玩家 ----------

/** 像真人一樣玩一天：回完所有訊息、吃泡麵、滑完牌組，偶爾左滑 */
function botPlayDay(s: Session) {
  const today = s.run.dayIndex;
  while (s.run.dayIndex === today) {
    const { run } = s;
    switch (run.phase) {
      case "payday":
        s.act({ type: "ackPayday" });
        break;
      case "daytime": {
        const [chat] = readyChats(run.chats, run.dayIndex);
        if (!chat) {
          s.act({ type: "endDaytime" });
        } else if (isFinal(STORY_BY_ID[chat.storyId].steps[chat.stepIndex])) {
          s.act({ type: "closeChat", chatId: chat.id });
        } else {
          s.act({ type: "reply", chatId: chat.id, choice: 0 });
        }
        break;
      }
      case "evening":
        s.act({ type: "goHome" });
        break;
      case "night":
        s.act({ type: "openApp" });
        break;
      case "swiping":
        s.act({ type: "swipe", dir: run.deckIndex % 3 === 2 ? "left" : "right" });
        break;
      case "matched":
        s.act({ type: "chooseOpener", opener: OPENERS[run.nextChatId % OPENERS.length] });
        break;
      case "nightDone":
        s.act({ type: "sleep" });
        break;
    }
  }
}

test("圖鑑可集滿：機器人在數個 seed 下都能集滿，dexCompleted 只發一次，集滿後遊戲可繼續", () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const s = session(createRun(seed));
    while (!isDexComplete(s.dex)) {
      assert.ok(
        s.run.dayIndex < DEX_COMPLETE_MAX_GAME_DAYS,
        `seed ${seed} 到第 ${s.run.dayIndex} 天還沒集滿，目前 ${Object.keys(s.dex).length} 種`
      );
      botPlayDay(s);
    }
    assert.equal(countOf(s.all, "dexCompleted"), 1, `seed ${seed}`);
    for (let i = 0; i < 60; i++) botPlayDay(s);
    assert.equal(countOf(s.all, "dexCompleted"), 1, `seed ${seed} 集滿後又發了一次`);
    assert.deepEqual(checkInvariants(s.run), []);
  }
});

test("同 seed 同操作得到相同結果，不同 seed 不同", () => {
  const play = (seed: number) => {
    const s = session(createRun(seed));
    for (let i = 0; i < 60; i++) botPlayDay(s);
    return { run: s.run, dex: s.dex, events: s.all };
  };
  assert.deepEqual(play(3), play(3));
  assert.notDeepEqual(play(3).run.chats, play(4).run.chats);
});
