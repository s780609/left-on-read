/**
 * 失敗劇情的另一個結局（design/quick-specs/2026-11-10-redesign.md 第 3 點）：
 * 前面某一步選了某一句，最後她傳的和旁白就換掉；圖鑑還是 33 種，每一筆記看過哪幾個結局。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ZERO_STATS } from "./chatStats.ts";
import { endingsSeen, recordFailure } from "./dex.ts";
import type { Dex } from "./dex.ts";
import { advance, createRun } from "./game.ts";
import type { GameEvent, RunState } from "./game.ts";
import { generateGirl } from "./girl.ts";
import { parseMeta, serializeMeta, blankMeta } from "./save.ts";
import { STORIES, STORY_BY_ID } from "./stories/index.ts";
import { chatTranscript, endingCount, isFinal, renderLine, resolveEnding, validateStory } from "./story.ts";
import type { Chat, FinalStep, Story } from "./storyTypes.ts";

const finalOf = (s: Story) => s.steps[s.steps.length - 1] as FinalStep;
const branching = STORIES.filter((s) => endingCount(s) > 1);

test("另一個結局：12 個失敗劇情有第二個結局，圖鑑種類不變", () => {
  assert.equal(branching.length, 12);
  assert.equal(STORIES.length, 33);
  for (const s of STORIES) assert.deepEqual(validateStory(s), [], s.id);
});

test("另一個結局：沒選到條件就是原本的結局", () => {
  for (const s of branching) {
    const step = finalOf(s);
    const replies = new Array(s.steps.length - 1).fill(0);
    const v = step.variants![0];
    // 換一個不是條件的回覆
    replies[v.when.step] = v.when.choice === 0 ? 1 : 0;
    const r = resolveEnding(step, replies);
    assert.equal(r.index, 0, s.id);
    assert.equal(r.ending, step.ending);
    assert.equal(r.incoming, step.incoming);
  }
});

test("另一個結局：選到條件那句，旁白和她最後傳的都換掉", () => {
  for (const s of branching) {
    const step = finalOf(s);
    const v = step.variants![0];
    const replies = new Array(s.steps.length - 1).fill(0);
    replies[v.when.step] = v.when.choice;
    const r = resolveEnding(step, replies);
    assert.equal(r.index, 1, s.id);
    assert.equal(r.ending, v.ending);
    assert.notEqual(r.ending.narration, step.ending.narration, s.id);
  }
});

test("另一個結局：尷尬爆表提早跳到結局（回覆不夠長）時走原本的", () => {
  const s = branching.find((x) => finalOf(x).variants![0].when.step > 0)!;
  assert.equal(resolveEnding(finalOf(s), []).index, 0);
});

function closeAt(story: Story, replies: number[], dex: Dex = {}) {
  const chat: Chat = {
    id: 1,
    girlSeed: 7,
    storyId: story.id,
    opener: "hi",
    stepIndex: story.steps.length - 1,
    lastAdvancedDay: 0,
    replies,
    stats: { ...ZERO_STATS },
  };
  const run: RunState = { ...createRun(1), phase: "night", dayIndex: 30, chats: [chat], nextChatId: 2, money: 10_000 };
  const r = advance(run, dex, { type: "closeChat", chatId: 1 });
  const ended = r.events.find((e): e is Extract<GameEvent, { type: "chatEnded" }> => e.type === "chatEnded")!;
  return { ...r, ended, chat };
}

test("另一個結局：關掉聊天用的是那個結局的旁白和花費，事件帶結局資訊", () => {
  const story = STORY_BY_ID["hot-water"];
  const step = finalOf(story);
  const v = step.variants![0];
  const replies = new Array(story.steps.length - 1).fill(0);
  replies[v.when.step] = v.when.choice;
  const { ended, run, dex } = closeAt(story, replies);
  assert.equal(ended.narration, renderLine(v.ending.narration, generateGirl(7)));
  assert.equal(ended.paid, v.ending.cost ?? 0);
  assert.equal(run.money, 10_000 - (v.ending.cost ?? 0));
  assert.deepEqual(ended.ending, { index: 1, total: 2, isNew: true });
  assert.deepEqual(dex["hot-water"].endings, [1]);

  // 再走一次原本的：兩個都看過了
  const again = closeAt(story, new Array(story.steps.length - 1).fill(0), dex);
  assert.deepEqual(again.ended.ending, { index: 0, total: 2, isNew: true });
  assert.equal(again.ended.firstTime, false);
  assert.deepEqual(again.dex["hot-water"].endings, [0, 1]);
  assert.equal(again.dex["hot-water"].count, 2);

  // 第三次：都看過了，不是新的
  const third = closeAt(story, replies, again.dex);
  assert.equal(third.ended.ending!.isNew, false);
});

test("另一個結局：沒有分歧的劇情，事件不帶結局資訊、圖鑑也不多記", () => {
  const story = STORIES.find((s) => endingCount(s) === 1)!;
  const { ended, dex } = closeAt(story, new Array(story.steps.length - 1).fill(0));
  assert.equal(ended.ending, undefined);
  assert.deepEqual(dex[story.id], { count: 1, firstDayIndex: 30 });
});

test("另一個結局：對話紀錄裡她最後傳的是那個結局的內容", () => {
  const story = STORY_BY_ID["zodiac"];
  const v = finalOf(story).variants![0];
  const girl = generateGirl(7);
  const chat: Chat = { id: 1, girlSeed: 7, storyId: story.id, opener: "hi", stepIndex: 1, lastAdvancedDay: 0, replies: [v.when.choice] };
  const last = (c: Chat) => chatTranscript(c, girl, 5).at(-1);
  assert.ok(v.incoming && "text" in v.incoming);
  assert.deepEqual(last(chat), { who: "her", text: renderLine(v.incoming.text, girl) });
  assert.notDeepEqual(last({ ...chat, replies: [0] }), last(chat));
});

test("另一個結局：recordFailure 只看過原本結局時不多存欄位，舊資料當作看過原本的", () => {
  let dex: Dex = recordFailure({}, "zodiac", 3);
  assert.deepEqual(dex.zodiac, { count: 1, firstDayIndex: 3 });
  assert.deepEqual(endingsSeen(dex.zodiac), [0]);
  dex = recordFailure(dex, "zodiac", 4, 1);
  assert.deepEqual(dex.zodiac, { count: 2, firstDayIndex: 3, endings: [0, 1] });
  dex = recordFailure(dex, "zodiac", 5, 0);
  assert.deepEqual(dex.zodiac.endings, [0, 1]);
});

test("另一個結局：存檔讀回看過的結局，壞資料濾掉", () => {
  const meta = {
    ...blankMeta(),
    dex: {
      zodiac: { count: 2, firstDayIndex: 3, endings: [1, 0, 1] },
      bot: { count: 1, firstDayIndex: 4, endings: [5, -1, "x", 1.5] },
      "split-bill": { count: 1, firstDayIndex: 4 },
    },
  } as unknown as ReturnType<typeof blankMeta>;
  const parsed = parseMeta(serializeMeta(meta));
  assert.deepEqual(parsed.dex.zodiac, { count: 2, firstDayIndex: 3, endings: [0, 1] });
  assert.deepEqual(parsed.dex.bot, { count: 1, firstDayIndex: 4 });
  assert.deepEqual(parsed.dex["split-bill"], { count: 1, firstDayIndex: 4 });
});

test("另一個結局：條件指的步驟在結局步之前、是真的回覆", () => {
  for (const s of branching) {
    for (const v of finalOf(s).variants!) {
      const target = s.steps[v.when.step];
      assert.ok(target && !isFinal(target) && target.replies[v.when.choice], s.id);
    }
  }
});
