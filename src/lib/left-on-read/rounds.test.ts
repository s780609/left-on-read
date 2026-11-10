/**
 * 一輪對話（design/quick-specs/2026-11-10-redesign.md 第 1 點）：
 * 一般失敗劇情回完，下一步是她直接傳的訊息（沒有指定等待）就當場接著傳；一天最多兩步；
 * 接續那一步不扣白天則數、不算已讀壓力；小晴、Iris、個工不套用。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { calendarOf, isPhoneChatDay } from "./calendar.ts";
import { ZERO_STATS } from "./chatStats.ts";
import { advance, createRun, isContinuation } from "./game.ts";
import type { RunState } from "./game.ts";
import { parseRun, serializeRun } from "./save.ts";
import { STORIES, STORY_BY_ID } from "./stories/index.ts";
import { isChatReady, isFinal, isFollowUp, replyTiming } from "./story.ts";
import type { Chat, ReplyStep, Story } from "./storyTypes.ts";

const directMessage = (s: Story, i: number) => {
  const step = s.steps[i];
  return step !== undefined && !isFinal(step) && step.wait === undefined && step.incoming.kind === "message";
};

/** 第 1、2 步都是她直接傳、沒有指定等待的一般劇情：拿來測「第三步要等」 */
const story = STORIES.find((s) => directMessage(s, 1) && directMessage(s, 2))!;
assert.ok(story, "要有一個第 1、2 步都是直接訊息的一般劇情");

/** 不會讓尷尬爆表提早結束的回覆 */
const safeChoice = (step: ReplyStep) => Math.max(0, step.scores?.findIndex((v) => v >= 0) ?? 0);

function playDay(from: number): number {
  let d = from;
  while (!isPhoneChatDay(calendarOf(d))) d++;
  return d;
}

function setup(patch: Partial<Chat> = {}): RunState {
  const day = playDay(3);
  const chat: Chat = {
    id: 1,
    girlSeed: 7,
    storyId: story.id,
    opener: "hi",
    stepIndex: 0,
    lastAdvancedDay: day - 1,
    replies: [],
    stats: { ...ZERO_STATS },
    ...patch,
  };
  return { ...createRun(1), phase: "daytime", dayIndex: day, chats: [chat], nextChatId: 2 };
}

function reply(run: RunState): RunState {
  const chat = run.chats[0];
  const step = STORY_BY_ID[chat.storyId].steps[chat.stepIndex] as ReplyStep;
  return advance(run, {}, { type: "reply", chatId: chat.id, choice: safeChoice(step) }).run;
}

test("一輪對話：回完她當場接著傳，可以再回一次，第三步要等明天", () => {
  let run = setup();
  run = reply(run);
  assert.equal(run.chats[0].stepIndex, 1);
  assert.ok(isFollowUp(run.chats[0], run.dayIndex), "第 1 步是她接著傳的");
  assert.ok(isChatReady(run.chats[0], run.dayIndex, run.phase));
  assert.deepEqual(replyTiming(run.chats[0], run.dayIndex, run.phase), { kind: "ready" });

  run = reply(run);
  assert.equal(run.chats[0].stepIndex, 2);
  assert.equal(run.chats[0].roundUsed, true);
  assert.ok(!isFollowUp(run.chats[0], run.dayIndex), "一輪最多兩步");
  assert.ok(!isChatReady(run.chats[0], run.dayIndex, run.phase));
  const timing = replyTiming(run.chats[0], run.dayIndex, run.phase);
  assert.equal(timing.kind, "wait");
  assert.ok(timing.kind === "wait" && timing.day > run.dayIndex);
  // 同一天第三次回：不動
  assert.equal(reply(run), run);
});

test("一輪對話：接續那一步不扣白天則數", () => {
  let run = setup();
  run = reply(run);
  assert.equal(run.dayReplies, 1);
  assert.ok(isContinuation(run, run.chats[0]));
  run = reply(run);
  assert.equal(run.dayReplies, 1, "接續不算一則");
});

test("一輪對話：隔天第一次回會重開一輪，roundUsed 清掉", () => {
  let run = setup();
  run = reply(reply(run));
  assert.equal(run.chats[0].roundUsed, true);
  const tomorrow = playDay(run.dayIndex + 1);
  run = { ...run, dayIndex: tomorrow, dayReplies: 0, today: { ...run.today, dayAction: undefined } };
  assert.ok(isChatReady(run.chats[0], run.dayIndex, run.phase));
  run = reply(run);
  assert.equal(run.chats[0].stepIndex, 3);
  assert.equal(run.chats[0].roundUsed, undefined);
});

test("一輪對話：不回接續那一步，睡覺不加已讀壓力", () => {
  let run = reply(setup());
  assert.ok(isFollowUp(run.chats[0], run.dayIndex));
  const before = run.chats[0].stats!.pressure;
  run = { ...run, phase: "nightDone" };
  const slept = advance(run, {}, { type: "sleep" }).run;
  assert.equal(slept.chats[0].stats!.pressure, before);
});

test("一輪對話：已讀、未讀、消失、旁白、指定等待的下一步照樣要等", () => {
  for (const s of STORIES) {
    s.steps.forEach((step, i) => {
      if (i === 0 || isFinal(step)) return;
      const chat: Chat = { id: 1, girlSeed: 7, storyId: s.id, opener: "hi", stepIndex: i, lastAdvancedDay: 10, replies: new Array(i).fill(0) };
      const expected = step.wait === undefined && step.incoming.kind === "message";
      assert.equal(isFollowUp(chat, 10), expected, `${s.id} 第 ${i} 步`);
      assert.equal(isFollowUp(chat, 11), false, "不同天不算接續");
      assert.equal(isFollowUp({ ...chat, roundUsed: true }, 10), false);
      assert.equal(isFollowUp({ ...chat, closed: true }, 10), false);
    });
  }
});

test("一輪對話：小晴、Iris、個工等寫好的劇情不套用", () => {
  const normal = new Set(STORIES.map((s) => s.id));
  for (const s of Object.values(STORY_BY_ID)) {
    if (normal.has(s.id)) continue;
    s.steps.forEach((step, i) => {
      if (i === 0 || isFinal(step)) return;
      const chat: Chat = { id: 1, girlSeed: 7, storyId: s.id, opener: "hi", stepIndex: i, lastAdvancedDay: 10, replies: new Array(i).fill(0) };
      assert.equal(isFollowUp(chat, 10), false, `${s.id} 第 ${i} 步`);
    });
  }
});

test("一輪對話：roundUsed 會存進存檔、讀得回來；舊存檔沒有也能讀", () => {
  const run = reply(reply(setup()));
  const parsed = parseRun(serializeRun(run))!;
  assert.equal(parsed.chats[0].roundUsed, true);
  const old: Chat = { ...run.chats[0] };
  delete old.roundUsed;
  const legacy = parseRun(serializeRun({ ...run, chats: [old] }))!;
  assert.equal(legacy.chats[0].roundUsed, undefined);
});
