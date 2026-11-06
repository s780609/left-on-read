/**
 * 對白連貫性：修過的案例回歸，以及全路線分支可遍歷（dump 腳本同源邏輯）。
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { HEROINE_ALMOST_STORY, HEROINE_STORY } from "./stories/heroine.ts";
import { SPECIAL_STORIES, STORIES, STORY_BY_ID } from "./stories/index.ts";
import type { FinalStep, ReplyStep, Story } from "./storyTypes.ts";

function isFinal(step: ReplyStep | FinalStep): step is FinalStep {
  return "ending" in step;
}

test("tech-support：答應修電腦之後不能當場說修好，要隔天且有當場安排", () => {
  const story = STORY_BY_ID["tech-support"];
  assert.ok(story);
  const offer = story.steps[1] as ReplyStep;
  assert.equal(offer.incoming.kind, "message");
  assert.match((offer.incoming as { text: string }).text, /開機好慢/);
  assert.equal(offer.replies.length, 3);
  assert.ok(offer.answers);
  assert.equal(offer.answers.length, 3);
  assert.match(offer.answers[0], /週六|拿過去/);
  assert.match(offer.answers[1], /第一步|試/);
  assert.match(offer.answers[2], /週末|整理/);
  const thanks = story.steps[2] as ReplyStep;
  assert.deepEqual(thanks.wait, { days: 2 });
  assert.ok(thanks.lead?.some((l) => l.includes("兩天後")));
  assert.equal(thanks.incoming.kind, "message");
  assert.match((thanks.incoming as { text: string }).text, /修好了/);
});

test("like-for-me：三個回覆都要有投過票，謝謝才接得上", () => {
  const story = STORY_BY_ID["like-for-me"];
  const vote = story.steps[1] as ReplyStep;
  for (const r of vote.replies) assert.match(r, /投好了/);
});

test("bot：最後一句要同時接得住天氣和算式", () => {
  const story = STORY_BY_ID["bot"];
  const last = story.steps.at(-1)!;
  assert.equal(last.incoming.kind, "message");
  const text = (last.incoming as { text: string }).text;
  assert.match(text, /391|17/);
  assert.match(text, /天氣|氣象/);
});

test("half-year：三個月後那一步的回覆都要接得上『回老家／下次』", () => {
  const story = STORY_BY_ID["half-year"];
  const after3 = story.steps[1] as ReplyStep;
  for (const r of after3.replies) {
    assert.ok(
      /有空|妳呢|出來|晃晃/.test(r),
      `應帶一點約／詢問意味，才接得上她回老家：${r}`,
    );
  }
});

test("全部劇情的每個回覆步驟：replies 與 answers／scores 長度一致，且可走到結尾", () => {
  const all: Story[] = [...STORIES, ...SPECIAL_STORIES, HEROINE_STORY, HEROINE_ALMOST_STORY];
  // SPECIAL already includes heroine — dedupe by id
  const byId = new Map(all.map((s) => [s.id, s]));
  for (const story of byId.values()) {
    assert.ok(story.steps.length >= 1, story.id);
    for (const step of story.steps) {
      if (isFinal(step)) {
        assert.ok(step.ending.narration.trim().length > 0, story.id);
        continue;
      }
      const rs = step as ReplyStep;
      assert.ok(rs.replies.length >= 1, `${story.id} empty replies`);
      if (rs.answers) assert.equal(rs.answers.length, rs.replies.length, `${story.id} answers len`);
      if (rs.scores) assert.equal(rs.scores.length, rs.replies.length, `${story.id} scores len`);
    }
  }
});
