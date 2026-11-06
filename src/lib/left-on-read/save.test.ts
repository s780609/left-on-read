import { test } from "node:test";
import assert from "node:assert/strict";
import { newGameplayAction } from "./testing.ts";
import { DECK_SIZE, MAX_MONEY, META_SAVE_KEY, RUN_SAVE_KEY, START_MONEY } from "./constants.ts";
import { isDexComplete, recordFailure } from "./dex.ts";
import type { Dex } from "./dex.ts";
import { advance, checkInvariants, createRun, legalActions } from "./game.ts";
import type { GameAction, RngFactory, RunState } from "./game.ts";
import { MEALS } from "./meals.ts";
import { createRng, pick, randInt } from "./rng.ts";
import type { Rng } from "./rng.ts";
import { parseMeta, parseRun, serializeMeta, serializeRun } from "./save.ts";
import type { MetaState } from "./save.ts";
import { STORIES, STORY_BY_ID } from "./stories/index.ts";
import { readyChats } from "./story.ts";
import type { Chat, FinalStep, OpenerKind, ReplyStep } from "./storyTypes.ts";

// ---------- 共用工具 ----------

const MATCH: RngFactory = () => () => 0;
const OPENERS: OpenerKind[] = ["hi", "whatsup", "eaten", "interest"];
const GARBAGE: (string | null)[] = [null, "", "{", "null", "[]", "123", '{"v":99}', '"text"', "true", "undefined"];
const BAD_FIELD_VALUES = ["null", "-1", '"x"', "[]", "{}", "1e999"];
const MARK = "__CORRUPT_ME__";

const isFinal = (step: ReplyStep | FinalStep): step is FinalStep => "ending" in step;

type Json = Record<string, unknown>;
const toJson = (run: RunState) => JSON.parse(serializeRun(run)) as Json;
/** 用原始 JSON 文字放入欄位值，1e999 才不會被 JSON.stringify 變成 null */
const rawWith = (obj: Json, raw: string) => JSON.stringify(obj).replace(JSON.stringify(MARK), raw);
const patched = (run: RunState, patch: Json) => JSON.stringify({ ...toJson(run), ...patch });

/** 真實玩出來的存檔：涵蓋每個階段，也有進行中的聊天 */
function sampleStates(): RunState[] {
  const states: RunState[] = [];
  let run = createRun(42);
  let dex: Dex = {};
  const act = (action: GameAction) => {
    const r = advance(run, dex, action, MATCH);
    assert.notEqual(r.run, run, `${run.phase} 的 ${action.type} 應該合法`);
    run = r.run;
    dex = r.dex;
    states.push(run);
  };
  states.push(run);
  act({ type: "endDaytime" });
  act({ type: "goHome" });
  act({ type: "openApp" });
  act({ type: "swipe", dir: "right" });
  act({ type: "chooseOpener", opener: "hi" });
  act({ type: "swipe", dir: "right" });
  act({ type: "chooseOpener", opener: "interest" });
  act({ type: "quitApp" });
  act({ type: "sleep" });
  // 往後走到領薪日，途中回訊息，存檔裡才有 stepIndex 和 replies
  while (run.dayIndex < 34) {
    switch (run.phase) {
      case "payday":
        act({ type: "ackPayday" });
        break;
      case "daytime": {
        const [chat] = readyChats(run.chats, run.dayIndex);
        if (!chat) act({ type: "endDaytime" });
        else if (isFinal(STORY_BY_ID[chat.storyId].steps[chat.stepIndex])) act({ type: "closeChat", chatId: chat.id });
        else act({ type: "reply", chatId: chat.id, choice: 0 });
        break;
      }
      case "evening":
        act({ type: "goHome" });
        break;
      default:
        act({ type: "sleep" });
    }
  }
  return states;
}

const statesWithChats = () => sampleStates().filter((s) => s.chats.length > 0);
const stateIn = (phase: RunState["phase"]) => {
  const found = sampleStates().find((s) => s.phase === phase);
  assert.ok(found, `樣本裡沒有 ${phase}`);
  return found;
};

function concreteAction(type: GameAction["type"], run: RunState, rng: Rng): GameAction {
  const extra = newGameplayAction(type, run, rng);
  if (extra) return extra;
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
    case "deleteChat":
      return { type, chatId: pick(rng, run.chats.filter((c) => c.closed)).id };
    case "goOnDate":
      return { type, choice: randInt(rng, 0, 1) };
    case "swipe":
      return { type, dir: rng() < 0.5 ? "left" : "right" };
    case "chooseOpener":
      return { type, opener: pick(rng, OPENERS) };
    default:
      // 剩下的都是不帶參數的動作；帶參數的新動作在 newGameplayAction 處理
      return { type } as GameAction;
  }
}

/** 解析結果必須是 null，或是不變量成立而且能繼續玩下去 */
function assertUsableOrNull(result: RunState | null, where: string) {
  if (result === null) return;
  assert.deepEqual(checkInvariants(result), [], where);
  const rng = createRng(1);
  let run = result;
  let dex: Dex = {};
  for (let i = 0; i < 40; i++) {
    const legal = legalActions(run);
    assert.ok(legal.length > 0, `${where} 第 ${i} 步沒有合法動作`);
    const action = concreteAction(pick(rng, legal), run, rng);
    const r = advance(run, dex, action);
    assert.notEqual(r.run, run, `${where} 第 ${i} 步 ${action.type} 沒有作用`);
    assert.deepEqual(checkInvariants(r.run), [], `${where} 第 ${i} 步 ${action.type}`);
    run = r.run;
    dex = r.dex;
  }
}

const withoutNextId = (run: RunState) => {
  const { nextChatId: _ignored, ...rest } = run;
  return rest;
};

const assertBlankMeta = (meta: MetaState, where: string) => {
  assert.equal(meta.v, 1, where);
  assert.equal(meta.introSeen, false, where);
  assert.equal(meta.graduationSeen, false, where);
  assert.deepEqual(Object.keys(meta.dex), [], where);
};

// ---------- 存檔 key ----------

test("存檔 key 符合規格", () => {
  assert.equal(RUN_SAVE_KEY, "left-on-read-run");
  assert.equal(META_SAVE_KEY, "left-on-read-meta");
});

// ---------- run 往返 ----------

test("run 往返相等，每個階段都一樣（nextChatId 重算，另外檢查）", () => {
  const states = sampleStates();
  const phases = new Set(states.map((s) => s.phase));
  for (const phase of ["daytime", "evening", "night", "swiping", "matched", "nightDone", "payday"] as const) {
    assert.ok(phases.has(phase), `樣本缺少 ${phase}`);
  }
  assert.ok(states.some((s) => s.chats.some((c) => c.stepIndex > 0)), "樣本缺少推進過的聊天");
  for (const run of states) {
    const parsed = parseRun(serializeRun(run));
    assert.ok(parsed, run.phase);
    assert.deepEqual(withoutNextId(parsed), withoutNextId(run));
    for (const chat of parsed.chats) assert.ok(parsed.nextChatId > chat.id);
  }
});

test("往返後繼續玩，新的聊天 id 不會和舊的重複", () => {
  const run = statesWithChats()[0];
  const parsed = parseRun(serializeRun(run));
  assert.ok(parsed);
  assert.ok(!parsed.chats.some((c) => c.id === parsed.nextChatId));
});

// ---------- run 壞資料 ----------

test("parseRun：壞字串不丟例外，回傳 null", () => {
  for (const raw of GARBAGE) assert.equal(parseRun(raw), null, String(raw));
});

test("parseRun：v 不符回傳 null", () => {
  const run = createRun(1);
  assert.equal(parseRun(patched(run, { v: 2 })), null);
  assert.equal(parseRun(patched(run, { v: "1" })), null);
  assert.equal(parseRun(patched(run, { v: null })), null);
});

test("parseRun：runSeed、dayIndex、phase 無效回傳 null", () => {
  const run = createRun(1);
  const cases: Json[] = [
    { runSeed: "x" },
    { runSeed: null },
    { runSeed: [] },
    { dayIndex: "x" },
    { dayIndex: null },
    { dayIndex: -1 },
    { dayIndex: 1.5 },
    { phase: "boss" },
    { phase: null },
    { phase: 3 },
  ];
  for (const patch of cases) assert.equal(parseRun(patched(run, patch)), null, JSON.stringify(patch));
});

test("欄位破壞：每個欄位換成各種壞值，結果是 null 或能繼續玩", () => {
  for (const state of sampleStates()) {
    for (const key of Object.keys(toJson(state))) {
      for (const bad of BAD_FIELD_VALUES) {
        const raw = rawWith({ ...toJson(state), [key]: MARK }, bad);
        const where = `${state.phase} 的 ${key} = ${bad}`;
        assertUsableOrNull(parseRun(raw), where);
      }
    }
  }
});

test("欄位破壞：聊天裡的每個欄位換成各種壞值，結果是 null 或能繼續玩", () => {
  for (const state of statesWithChats()) {
    const base = toJson(state);
    const chats = base.chats as Json[];
    for (const key of Object.keys(chats[0])) {
      for (const bad of BAD_FIELD_VALUES) {
        const raw = rawWith({ ...base, chats: [{ ...chats[0], [key]: MARK }, ...chats.slice(1)] }, bad);
        assertUsableOrNull(parseRun(raw), `${state.phase} 的 chats[0].${key} = ${bad}`);
      }
    }
    for (const bad of BAD_FIELD_VALUES) {
      const raw = rawWith({ ...base, chats: [MARK, ...chats.slice(1)] }, bad);
      assertUsableOrNull(parseRun(raw), `${state.phase} 的 chats[0] = ${bad}`);
    }
  }
});

test("money 非數字變起始金額，負數變 0，小數取整，過大設上限", () => {
  const run = createRun(1);
  const moneyOf = (value: unknown) => parseRun(patched(run, { money: value }))?.money;
  assert.equal(moneyOf("x"), START_MONEY);
  assert.equal(moneyOf(null), START_MONEY);
  assert.equal(moneyOf([]), START_MONEY);
  assert.equal(moneyOf(-5), 0);
  assert.equal(moneyOf(12.7), 12);
  assert.ok(MAX_MONEY >= 10_000_000, "上限不能低於正常遊玩賺得到的金額");
  assert.ok(Number.isSafeInteger(MAX_MONEY));
  assert.equal(moneyOf(1e18), MAX_MONEY);
  const infinite = parseRun(rawWith({ ...toJson(run), money: MARK }, "1e999"));
  assert.ok(infinite);
  assert.ok(Number.isInteger(infinite.money) && infinite.money >= 0 && infinite.money <= MAX_MONEY);
});

test("rightStreak、deckIndex 無效時修正到合法範圍", () => {
  const run = createRun(1);
  for (const bad of [-1, "x", null, 1.5, []]) {
    const parsed = parseRun(patched(run, { rightStreak: bad, deckIndex: bad }));
    assert.ok(parsed, JSON.stringify(bad));
    assert.ok(Number.isInteger(parsed.rightStreak) && parsed.rightStreak >= 0);
    assert.ok(Number.isInteger(parsed.deckIndex) && parsed.deckIndex >= 0 && parsed.deckIndex <= DECK_SIZE);
  }
  const parsed = parseRun(patched(run, { deckIndex: DECK_SIZE + 50 }));
  assert.ok(parsed);
  assert.ok(parsed.deckIndex <= DECK_SIZE);
});

test("未知劇情的聊天被移除，其他聊天保留", () => {
  const state = statesWithChats().find((s) => s.chats.length >= 2);
  assert.ok(state, "樣本要有兩個以上的聊天");
  const [first, second, ...rest] = toJson(state).chats as Json[];
  const unknownIds = ["no-such-story", "constructor", "toString", "__proto__", 123, null];
  for (const storyId of unknownIds) {
    const parsed = parseRun(patched(state, { chats: [{ ...first, storyId }, second, ...rest] }));
    assert.ok(parsed, String(storyId));
    assert.deepEqual(parsed.chats.map((c) => c.id), [second, ...rest].map((c) => c.id), String(storyId));
    assert.deepEqual(checkInvariants(parsed), []);
  }
});

test("重複 id 的聊天被移除", () => {
  const state = statesWithChats().find((s) => s.chats.length >= 2);
  assert.ok(state);
  const [first, second] = toJson(state).chats as Json[];
  const parsed = parseRun(patched(state, { chats: [first, { ...second, id: first.id }] }));
  assert.ok(parsed);
  assert.equal(parsed.chats.length, 1);
  assert.equal(parsed.chats[0].storyId, first.storyId);
});

test("stepIndex、replies、lastAdvancedDay 無效時夾到合法範圍", () => {
  const state = statesWithChats()[0];
  const [first, ...rest] = toJson(state).chats as Json[];
  const stepCount = STORY_BY_ID[first.storyId as string].steps.length;
  const patches: Json[] = [
    { stepIndex: 999 },
    { stepIndex: -1 },
    { stepIndex: "x" },
    { replies: "x" },
    { replies: [99, -1, "x"] },
    { lastAdvancedDay: -5 },
    { lastAdvancedDay: "x" },
    { lastAdvancedDay: state.dayIndex + 999 },
  ];
  for (const patch of patches) {
    const parsed = parseRun(patched(state, { chats: [{ ...first, ...patch }, ...rest] }));
    const where = JSON.stringify(patch);
    assert.ok(parsed, where);
    const chat = parsed.chats.find((c) => c.id === first.id);
    assert.ok(chat, where);
    assert.ok(Number.isInteger(chat.stepIndex) && chat.stepIndex >= 0 && chat.stepIndex < stepCount, where);
    assert.ok(Number.isInteger(chat.lastAdvancedDay) && chat.lastAdvancedDay >= 0, where);
    assert.ok(chat.lastAdvancedDay <= parsed.dayIndex, where);
    assert.ok(Array.isArray(chat.replies), where);
    // 已走過的每一步都要有合法的選項，對話紀錄才查得到那句回覆
    STORY_BY_ID[chat.storyId].steps.slice(0, chat.stepIndex).forEach((step, i) => {
      const options = (step as ReplyStep).replies.length;
      assert.ok(Number.isInteger(chat.replies[i]) && chat.replies[i] >= 0 && chat.replies[i] < options, where);
    });
    assert.deepEqual(checkInvariants(parsed), [], where);
    assertUsableOrNull(parsed, where);
  }
});

test("nextChatId 一律重算，一定大於所有聊天 id", () => {
  const state = statesWithChats()[0];
  for (const nextChatId of [0, -1, "x", null, 1]) {
    const parsed = parseRun(patched(state, { nextChatId }));
    assert.ok(parsed, String(nextChatId));
    for (const chat of parsed.chats) assert.ok(parsed.nextChatId > chat.id, String(nextChatId));
  }
});

test("matched 卻沒有 pendingMatchSeed：依 deckIndex 修復成 swiping 或 nightDone", () => {
  const matched = stateIn("matched");
  const middle = parseRun(patched(matched, { pendingMatchSeed: null, deckIndex: 3 }));
  assert.equal(middle?.phase, "swiping");
  assert.equal(middle?.deckIndex, 3);
  const end = parseRun(patched(matched, { pendingMatchSeed: null, deckIndex: DECK_SIZE }));
  assert.equal(end?.phase, "nightDone");
  const garbage = parseRun(patched(matched, { pendingMatchSeed: "x", deckIndex: 3 }));
  assert.equal(garbage?.phase, "swiping");
});

test("evening 但餐點 id 無效：重新決定一道有效的餐點，結果固定", () => {
  const evening = stateIn("evening");
  for (const offeredMealId of ["no-such-meal", null, 3, "constructor"]) {
    const raw = patched(evening, { offeredMealId });
    const parsed = parseRun(raw);
    assert.ok(parsed, String(offeredMealId));
    assert.equal(parsed.phase, "evening");
    assert.ok(MEALS.some((m) => m.id === parsed.offeredMealId), String(offeredMealId));
    assert.equal(parseRun(raw)?.offeredMealId, parsed.offeredMealId);
  }
});

// ---------- meta ----------

test("meta 往返相等", () => {
  const dex = recordFailure(recordFailure({}, STORIES[0].id, 3), STORIES[1].id, 8);
  const meta: MetaState = { v: 1, introSeen: true, graduationSeen: false, dex, counters: {}, achievements: {} };
  const parsed = parseMeta(serializeMeta(meta));
  assert.equal(parsed.v, 1);
  assert.equal(parsed.introSeen, true);
  assert.equal(parsed.graduationSeen, false);
  assert.deepEqual({ ...parsed.dex }, dex);
});

test("parseMeta：壞資料回傳空白 meta，不丟例外", () => {
  for (const raw of GARBAGE) assertBlankMeta(parseMeta(raw), String(raw));
});

test("parseMeta：欄位壞掉時，其他有效項目照樣保留", () => {
  const id = STORIES[0].id;
  const parsed = parseMeta(
    JSON.stringify({
      v: 1,
      introSeen: "yes",
      graduationSeen: 1,
      dex: {
        [id]: { count: 2, firstDayIndex: 4 },
        "no-such-story": { count: 1, firstDayIndex: 0 },
      },
    })
  );
  assert.equal(parsed.introSeen, false);
  assert.equal(parsed.graduationSeen, false);
  assert.deepEqual(Object.keys(parsed.dex), [id]);
  assert.deepEqual(parsed.dex[id], { count: 2, firstDayIndex: 4 });
});

test("parseMeta：dex 不是物件時視為空白", () => {
  for (const dex of [null, [], 3, "x"]) {
    const parsed = parseMeta(JSON.stringify({ v: 1, introSeen: true, graduationSeen: true, dex }));
    assert.deepEqual(Object.keys(parsed.dex), [], JSON.stringify(dex));
  }
});

test("parseMeta：單筆圖鑑壞掉時，移除或修正成合法值", () => {
  const id = STORIES[0].id;
  for (const entry of [null, 3, "x", [], {}, { count: "x" }, { count: -1, firstDayIndex: -1 }, { count: 1.5, firstDayIndex: "x" }]) {
    const parsed = parseMeta(JSON.stringify({ v: 1, introSeen: false, graduationSeen: false, dex: { [id]: entry } }));
    const kept = parsed.dex[id];
    if (kept === undefined) continue;
    const where = JSON.stringify(entry);
    assert.ok(Number.isInteger(kept.count) && kept.count >= 1, where);
    assert.ok(Number.isInteger(kept.firstDayIndex) && kept.firstDayIndex >= 0, where);
  }
});

test("parseMeta：__proto__ 和 Object 內建名稱不會進入結果，也不污染原型", () => {
  const id = STORIES[0].id;
  const raw = `{"v":1,"introSeen":true,"graduationSeen":false,"dex":{
    "__proto__":{"polluted":true,"count":1,"firstDayIndex":0},
    "constructor":{"count":1,"firstDayIndex":0},
    "toString":{"count":1,"firstDayIndex":0},
    "${id}":{"count":1,"firstDayIndex":0}
  }}`;
  const parsed = parseMeta(raw);
  assert.deepEqual(Object.keys(parsed.dex), [id]);
  assert.equal(Object.hasOwn(parsed.dex, "__proto__"), false);
  assert.equal((parsed.dex as Record<string, unknown>).polluted, undefined);
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
  assert.equal(isDexComplete(parsed.dex), false);
});

test("parseMeta：只讀回全部有效資料時，圖鑑仍然是集滿的", () => {
  const dex: Dex = Object.fromEntries(STORIES.map((s) => [s.id, { count: 1, firstDayIndex: 0 }]));
  const parsed = parseMeta(serializeMeta({ v: 1, introSeen: true, graduationSeen: true, dex, counters: {}, achievements: {} }));
  assert.equal(isDexComplete(parsed.dex), true);
  assert.equal(parsed.graduationSeen, true);
});
