import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AFFECTION_SOFT_MIN,
  AWKWARD_END,
  DAYTIME_REPLY_LIMIT,
  PRESSURE_SOFT_END,
} from "./constants.ts";
import { applyDelta, replyDelta, shouldSoftEnd, statsOf, ZERO_STATS } from "./chatStats.ts";
import { advance, createRun, dayReplyLimit, isContinuation, legalActions, repliesLeft } from "./game.ts";
import type { RunState } from "./game.ts";
import { STORIES, STORY_BY_ID } from "./stories/index.ts";
import { isChatReady } from "./story.ts";
import type { Chat, ReplyStep } from "./storyTypes.ts";
import { calendarOf, isPhoneChatDay } from "./calendar.ts";

function nextPhoneDay(from: number): number {
  let d = from;
  while (!isPhoneChatDay(calendarOf(d))) d++;
  return d;
}

const story = STORIES.find((s) => s.steps.length >= 3 && !("date" in (s.steps[0] as object)))!;
assert.ok(story);

function chatAt(stepIndex = 0, patch: Partial<Chat> = {}): Chat {
  return {
    id: 1,
    girlSeed: 7,
    storyId: story.id,
    opener: "hi",
    stepIndex,
    lastAdvancedDay: 0,
    replies: new Array(stepIndex).fill(0),
    stats: { ...ZERO_STATS },
    ...patch,
  };
}

function atDay(chats: Chat[], patch: Partial<RunState> = {}): RunState {
  const day = nextPhoneDay(1);
  return {
    ...createRun(1),
    phase: "daytime",
    dayIndex: day,
    chats: chats.map((c) => ({ ...c, lastAdvancedDay: Math.min(c.lastAdvancedDay, day - 1) })),
    nextChatId: 2,
    ...patch,
  };
}

test("隱性數值：scores 會轉成好感／尷尬／壓力", () => {
  const step = { incoming: { kind: "message" as const, text: "x" }, replies: ["a", "b", "c"], scores: [1, 0, -1] };
  assert.deepEqual(replyDelta(step, 0), { affection: 1, awkward: 0, pressure: 0 });
  assert.deepEqual(replyDelta(step, 1), { affection: 0, awkward: 0, pressure: 1 });
  assert.deepEqual(replyDelta(step, 2), { affection: -1, awkward: 1, pressure: 0 });
});

test("尷尬爆表會提早跳到結局步", () => {
  const run = atDay([chatAt(0, { stats: { affection: 0, awkward: AWKWARD_END - 1, pressure: 0 } })]);
  // pick last reply to add awkward if no scores — force via high awkward already almost at limit
  const step = story.steps[0] as ReplyStep;
  const bad = step.scores ? step.scores.indexOf(-1) : step.replies.length - 1;
  const choice = bad >= 0 ? bad : step.replies.length - 1;
  const r = advance(run, {}, { type: "reply", chatId: 1, choice });
  assert.notEqual(r.run, run);
  const chat = r.run.chats[0];
  assert.ok(chat.stats);
  if (shouldSoftEnd(chat.stats!) || chat.stats!.awkward >= AWKWARD_END) {
    assert.equal(chat.stepIndex, story.steps.length - 1);
  }
});

test("白天認真回訊息有上限", () => {
  const chats = [1, 2, 3, 4].map((id) => chatAt(0, { id, storyId: STORIES[id % STORIES.length].id }));
  let run = atDay(chats, { nextChatId: 5 });
  // 一輪對話裡她接著傳的那一步不算，所以每次挑「不是接續」的聊天
  const fresh = (r: RunState) => r.chats.find((c) => isChatReady(c, r.dayIndex, r.phase) && !isContinuation(r, c));
  for (let i = 0; i < DAYTIME_REPLY_LIMIT; i++) {
    assert.ok(legalActions(run).includes("reply"), `第 ${i} 則`);
    run = advance(run, {}, { type: "reply", chatId: fresh(run)!.id, choice: 0 }).run;
  }
  assert.equal(run.dayReplies, DAYTIME_REPLY_LIMIT);
  const blocked = fresh(run)!;
  assert.equal(advance(run, {}, { type: "reply", chatId: blocked.id, choice: 0 }).run, run, "達上限不能再回新的聊天");
  // 還能回的只剩一輪對話的接續
  const followUps = run.chats.filter((c) => isChatReady(c, run.dayIndex, run.phase) && isContinuation(run, c));
  assert.equal(legalActions(run).includes("reply"), followUps.length > 0);
  assert.ok(legalActions(run).includes("endDaytime"));
});

test("晚上可以打手槍、打電動，各一次", () => {
  let run: RunState = { ...createRun(1), phase: "night" };
  assert.ok(legalActions(run).includes("jerkOff"));
  assert.ok(legalActions(run).includes("playGames"));
  const solo = advance(run, {}, { type: "jerkOff" });
  assert.equal(solo.events[0]?.type, "hobby");
  assert.ok(solo.events[0]?.type === "hobby" && solo.events[0].kind === "solo");
  run = solo.run;
  assert.ok(!legalActions(run).includes("jerkOff"));
  assert.ok(legalActions(run).includes("playGames"));
  const games = advance(run, {}, { type: "playGames" });
  assert.ok(games.events[0]?.type === "hobby" && games.events[0].kind === "games");
  run = games.run;
  assert.ok(!legalActions(run).includes("playGames"));
  assert.ok(legalActions(run).includes("sleep"));
});

test("睡覺會把沒回的聊天已讀壓力 +1，並重置白天回覆與消遣", () => {
  const day = nextPhoneDay(1);
  const chat = chatAt(0, { lastAdvancedDay: day - 1 });
  const run: RunState = {
    ...createRun(1),
    phase: "night",
    dayIndex: day,
    dayReplies: 2,
    nightHobby: { solo: true, games: false, calm: true },
    chats: [chat],
    nextChatId: 2,
  };
  assert.ok(isChatReady(chat, day, "night"));
  const r = advance(run, {}, { type: "sleep" });
  assert.equal(r.run.dayReplies, 0);
  assert.deepEqual(r.run.nightHobby, { solo: false, games: false, calm: false });
  assert.equal(statsOf(r.run.chats[0]).pressure, 1);
});

test("shouldSoftEnd 門檻", () => {
  assert.equal(shouldSoftEnd({ affection: 0, awkward: AWKWARD_END, pressure: 0 }), true);
  assert.equal(shouldSoftEnd({ affection: AFFECTION_SOFT_MIN - 1, awkward: 0, pressure: PRESSURE_SOFT_END }), true);
  assert.equal(shouldSoftEnd({ affection: 2, awkward: 0, pressure: PRESSURE_SOFT_END }), false);
  assert.deepEqual(applyDelta(ZERO_STATS, { affection: 1, awkward: 2, pressure: 3 }), {
    affection: 1,
    awkward: 2,
    pressure: 3,
  });
});

test("白天一則都不回，睡覺後隔天仍可回，且當晚可開 Swipy", () => {
  const day = nextPhoneDay(1);
  const chat = chatAt(0, { lastAdvancedDay: day - 1 });
  let run: RunState = {
    ...createRun(1),
    phase: "daytime",
    dayIndex: day,
    dayReplies: 0,
    chats: [chat],
    nextChatId: 2,
  };
  assert.ok(legalActions(run).includes("reply"));
  // 不回，直接下班回家
  run = advance(run, {}, { type: "endDaytime" }).run;
  run = advance(run, {}, { type: "goHome" }).run;
  assert.equal(run.phase, "night");
  assert.ok(legalActions(run).includes("openApp"), "沒回訊息也能開 Swipy");
  assert.ok(legalActions(run).includes("reply"), "晚上還可以補回白天沒回的");
  run = advance(run, {}, { type: "sleep" }).run;
  assert.equal(run.dayReplies, 0);
  assert.ok(isChatReady(run.chats[0], run.dayIndex, run.phase));
  assert.ok(legalActions(run).includes("reply"), "隔天仍可回昨天沒回的訊息");
});

test("拒 1h2s 後結局步立刻可關，且當晚仍可開 Swipy", () => {
  const story = STORY_BY_ID.studio;
  assert.ok(story);
  const decisionIdx = story.steps.findIndex((s) => "decision" in s && s.decision);
  assert.ok(decisionIdx >= 0);
  const day = nextPhoneDay(1);
  let run: RunState = {
    ...createRun(1),
    phase: "night",
    dayIndex: day,
    money: 5000,
    chats: [
      chatAt(decisionIdx, {
        storyId: story.id,
        lastAdvancedDay: day - 1,
        replies: new Array(decisionIdx).fill(0),
      }),
    ],
    nextChatId: 2,
  };
  assert.ok(legalActions(run).includes("reply"));
  run = advance(run, {}, { type: "reply", chatId: 1, choice: 1 }).run; // 拒絕
  const chat = run.chats[0];
  assert.ok(chat, "聊天還在");
  assert.equal(chat.stepIndex, story.steps.length - 1);
  assert.ok(isChatReady(chat, day, "night"), "結局步當晚就能關");
  assert.ok(legalActions(run).includes("closeChat"));
  assert.ok(legalActions(run).includes("openApp"), "Swipy 不因結局步被鎖");
});

test("白天回滿上限：還沒回的聊天選項送不出去，聊天室要知道（repliesLeft 為 0），晚上就能回", () => {
  const day = nextPhoneDay(1);
  const chat = chatAt(0, { lastAdvancedDay: day - 1 });
  const base = { ...createRun(1), dayIndex: day, chats: [chat], nextChatId: 2 };
  const full: RunState = { ...base, phase: "daytime", dayReplies: dayReplyLimit({ ...base, phase: "daytime" }) };
  assert.ok(isChatReady(chat, day, "daytime"));
  assert.equal(repliesLeft(full), 0);
  assert.ok(!legalActions(full).includes("reply"));
  assert.equal(advance(full, {}, { type: "reply", chatId: chat.id, choice: 0 }).run, full);
  const night: RunState = { ...full, phase: "night" };
  assert.equal(repliesLeft(night), Infinity);
  assert.notEqual(advance(night, {}, { type: "reply", chatId: chat.id, choice: 0 }).run, night);
});

test("同一段對話接著回不算白天則數：上限用完，wait 0 的下一句照樣能回", () => {
  // 找一條有「同一天接著聊」步驟的劇情
  const story = [...STORIES, ...Object.values(STORY_BY_ID)].find((s) =>
    s.steps.some((st, i) => i > 0 && "replies" in st && st.wait && "days" in st.wait && st.wait.days === 0)
  )!;
  const i = story.steps.findIndex((st, k) => k > 0 && "replies" in st && st.wait && "days" in st.wait && st.wait.days === 0);
  const day = nextPhoneDay(3);
  const chat: Chat = {
    id: 1,
    girlSeed: 9,
    storyId: story.id,
    opener: "hi",
    stepIndex: i,
    lastAdvancedDay: day,
    replies: Array<number>(i).fill(0),
  };
  const run: RunState = {
    ...createRun(1),
    phase: "daytime",
    dayIndex: day,
    chats: [chat],
    nextChatId: 2,
    heroineMet: true,
    dayReplies: dayReplyLimit({ ...createRun(1), phase: "daytime", dayIndex: day }),
  };
  assert.ok(isContinuation(run, chat));
  assert.ok(legalActions(run).includes("reply"));
  const r = advance(run, {}, { type: "reply", chatId: 1, choice: 0 });
  assert.notEqual(r.run, run);
  assert.equal(r.run.dayReplies, run.dayReplies, "接著回不算則數");
  // 隔天才回就不算接著回
  assert.ok(!isContinuation({ ...run, dayIndex: day + 1 }, chat));
});

// ---------- 白天一件事、晚上兩件事、週日跳過 ----------

test("白天只能做一件事：回了訊息就不能約會或打理自己；約會或打理自己之後就不能回", async () => {
  const { canDoDayAction } = await import("./game.ts");
  const { STORY_BY_ID: BY_ID, HEROINE_STORY_ID } = await import("./stories/index.ts");
  const { HEROINE_SEED } = await import("./constants.ts");
  // 第 11 天是週六
  const sat = 11;
  assert.equal(calendarOf(sat).weekday, 6);
  const dateIdx = BY_ID[HEROINE_STORY_ID].steps.findIndex((s) => "date" in s && s.date?.index === 0);
  const heroine: Chat = {
    id: 1,
    girlSeed: HEROINE_SEED,
    storyId: HEROINE_STORY_ID,
    opener: "hi",
    stepIndex: dateIdx,
    // 第 6 天約好：約會日是之後第一個週六，也就是第 11 天
    lastAdvancedDay: 6,
    replies: Array<number>(dateIdx).fill(0),
  };
  const other = chatAt(0, { id: 2, lastAdvancedDay: sat - 2 });
  const base: RunState = {
    ...createRun(1),
    phase: "daytime",
    dayIndex: sat,
    money: 50_000,
    heroineMet: true,
    chats: [heroine, other],
    nextChatId: 3,
  };
  const legal = legalActions(base);
  assert.ok(legal.includes("reply") && legal.includes("goOnDate") && legal.includes("buy"));

  // 選了回訊息：約會和打理自己都不行了
  const replied = advance(base, {}, { type: "reply", chatId: 2, choice: 0 }).run;
  assert.equal(replied.today.dayAction, "reply");
  assert.ok(!legalActions(replied).includes("goOnDate"));
  assert.equal(advance(replied, {}, { type: "buy", item: "haircut" }).run, replied);
  // Swipy Gold 已下架，任何時候都買不到
  assert.equal(advance(replied, {}, { type: "buy", item: "gold" }).run, replied);

  // 選了打理自己：還能再買別的，但不能回訊息、不能約會
  const shopped = advance(base, {}, { type: "buy", item: "haircut" }).run;
  assert.equal(shopped.today.dayAction, "shop");
  assert.ok(canDoDayAction(shopped, "shop"));
  assert.notEqual(advance(shopped, {}, { type: "buy", item: "outfit" }).run, shopped);
  assert.equal(advance(shopped, {}, { type: "reply", chatId: 2, choice: 0 }).run, shopped);
  assert.ok(!legalActions(shopped).includes("goOnDate"));

  // 選了約會：回到家是晚上，晚上回訊息不受白天影響
  const dated = advance(base, {}, { type: "goOnDate", choice: 0 }).run;
  assert.equal(dated.today.dayAction, "date");
  assert.equal(dated.phase, "night");
  assert.notEqual(advance(dated, {}, { type: "reply", chatId: 2, choice: 0 }).run, dated);
});

test("白天選回訊息最多回 3 則；晚上回訊息不算動作、不限則數", () => {
  const day = nextPhoneDay(20);
  const chats = [0, 1, 2, 3].map((i) => chatAt(0, { id: i + 1, girlSeed: 50 + i, lastAdvancedDay: day - 1 }));
  let run: RunState = { ...createRun(1), phase: "daytime", dayIndex: day, chats, nextChatId: 5 };
  for (let i = 1; i <= 3; i++) run = advance(run, {}, { type: "reply", chatId: i, choice: 0 }).run;
  assert.equal(run.dayReplies, 3);
  assert.ok(!legalActions(run).includes("reply"));
  const night: RunState = { ...run, phase: "night" };
  assert.ok(legalActions(night).includes("reply"));
  const after = advance(night, {}, { type: "reply", chatId: 4, choice: 0 }).run;
  assert.notEqual(after, night);
  assert.equal(after.nightActions, 0, "晚上回訊息不算一件事");
});

test("晚上只能做兩件事：滑 Swipy、打手槍、打電動任選", async () => {
  const { NIGHT_ACTION_LIMIT } = await import("./constants.ts");
  assert.equal(NIGHT_ACTION_LIMIT, 2);
  let run: RunState = { ...createRun(1), phase: "night", dayIndex: 1 };
  run = advance(run, {}, { type: "jerkOff" }).run;
  assert.equal(run.nightActions, 1);
  run = advance(run, {}, { type: "openApp" }).run;
  assert.equal(run.nightActions, 2);
  assert.equal(run.phase, "swiping");
  run = advance(run, {}, { type: "quitApp" }).run;
  assert.ok(!legalActions(run).includes("playGames"));
  assert.equal(advance(run, {}, { type: "playGames" }).run, run);
  // 先打兩件消遣，就不能再滑
  let other: RunState = { ...createRun(1), phase: "night", dayIndex: 1 };
  other = advance(other, {}, { type: "jerkOff" }).run;
  other = advance(other, {}, { type: "playGames" }).run;
  assert.ok(!legalActions(other).includes("openApp"));
  assert.equal(advance(other, {}, { type: "openApp" }).run, other);
  // 滑完之後還有一件可以做
  let swiped: RunState = { ...createRun(1), phase: "night", dayIndex: 1 };
  swiped = advance(swiped, {}, { type: "openApp" }).run;
  swiped = advance(swiped, {}, { type: "quitApp" }).run;
  assert.equal(swiped.phase, "nightDone");
  assert.ok(legalActions(swiped).includes("playGames"));
  // 睡覺歸零
  const slept = advance(run, {}, { type: "sleep" }).run;
  assert.equal(slept.nightActions, 0);
  assert.equal(slept.today.dayAction, null);
});

test("存檔：白天那件事和晚上做了幾件會留著；舊存檔停在週日、週一會挪到週二", async () => {
  const { parseRun, serializeRun } = await import("./save.ts");
  const run: RunState = {
    ...createRun(1),
    dayIndex: 4,
    phase: "night",
    nightActions: 2,
    nightHobby: { solo: true, games: true, calm: true },
    today: { eventDone: false, overtime: false, tired: false, dayAction: "shop" },
  };
  const back = parseRun(serializeRun(run))!;
  assert.equal(back.nightActions, 2);
  assert.equal(back.today.dayAction, "shop");
  const raw = JSON.parse(serializeRun({ ...createRun(1), dayIndex: 4 }));
  raw.dayIndex = 5; // 週日
  delete raw.nightActions;
  raw.nightHobby = { solo: true, games: false };
  const moved = parseRun(JSON.stringify(raw))!;
  assert.equal(moved.dayIndex, 7);
  assert.equal(calendarOf(moved.dayIndex).weekday, 2);
  assert.equal(moved.nightActions, 1, "舊存檔用打過的消遣補");
});
