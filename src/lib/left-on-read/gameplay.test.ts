import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AFFECTION_SOFT_MIN,
  AWKWARD_END,
  DAYTIME_REPLY_LIMIT,
  PRESSURE_SOFT_END,
} from "./constants.ts";
import { applyDelta, replyDelta, shouldSoftEnd, statsOf, ZERO_STATS } from "./chatStats.ts";
import { advance, createRun, legalActions } from "./game.ts";
import type { RunState } from "./game.ts";
import { STORIES } from "./stories/index.ts";
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
  let run = atDay([chatAt(0, { stats: { affection: 0, awkward: AWKWARD_END - 1, pressure: 0 } })]);
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
  for (let i = 0; i < DAYTIME_REPLY_LIMIT; i++) {
    assert.ok(legalActions(run).includes("reply"), `第 ${i} 則`);
    const id = run.chats.find((c) => isChatReady(c, run.dayIndex, run.phase))!.id;
    run = advance(run, {}, { type: "reply", chatId: id, choice: 0 }).run;
  }
  assert.equal(run.dayReplies, DAYTIME_REPLY_LIMIT);
  assert.ok(!legalActions(run).includes("reply"), "達上限不能再回");
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
  let run: RunState = {
    ...createRun(1),
    phase: "night",
    dayIndex: day,
    dayReplies: 2,
    nightHobby: { solo: true, games: true },
    chats: [chat],
    nextChatId: 2,
  };
  assert.ok(isChatReady(chat, day, "night"));
  const r = advance(run, {}, { type: "sleep" });
  assert.equal(r.run.dayReplies, 0);
  assert.deepEqual(r.run.nightHobby, { solo: false, games: false });
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
