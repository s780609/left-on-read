import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BEAT_FADE_MS,
  BEAT_SLOW_FADE_MS,
  CHAT_SCENE,
  beatChapterStart,
  beatFadeMs,
  finishBeatFade,
  markBeatTyped,
  startBeats,
  tapBeat,
  visibleBeats,
  type Beat,
} from "./beats.ts";
import { LADYBUG_BEATS, LADYBUG_START_INDEX } from "./ladybug.ts";
import { STORY_BY_ID } from "./stories/index.ts";
import { TRUE_ENDING_BEATS } from "./trueEnding.ts";

const BEATS: readonly Beat[] = [
  { scene: "a", text: "一" },
  { scene: "a", who: "her", text: "二" },
  { scene: "a", who: "me", text: "三" },
  { scene: "b", fade: "slow", text: "四" },
  { scene: CHAT_SCENE, who: "her", text: "五" },
];

test("按一下：字還在打就先打完，台詞不會被換掉", () => {
  const start = startBeats(BEATS);
  const tapped = tapBeat(start, BEATS);
  assert.equal(tapped.index, 0);
  assert.equal(tapped.typed, true);
  assert.equal(tapBeat(tapped, BEATS).index, 1);
});

test("沒有按就不會前進：打字機打完只是打完，還停在同一句", () => {
  const typed = markBeatTyped(startBeats(BEATS));
  assert.equal(typed.index, 0);
  assert.equal(typed.fading, false);
  assert.equal(markBeatTyped(typed), typed);
});

test("同一幕講過的話都留著，換幕才清", () => {
  assert.deepEqual(visibleBeats(BEATS, 2).map((b) => b.text), ["一", "二", "三"]);
  assert.deepEqual(visibleBeats(BEATS, 3).map((b) => b.text), ["四"]);
  assert.equal(beatChapterStart(BEATS, 2), 0);
  assert.equal(beatChapterStart(BEATS, 3), 3);
});

test("換幕先落黑幕，黑幕落下時舊台詞還在，按再多下也不會跳過，全黑才換", () => {
  const atLast: ReturnType<typeof startBeats> = { index: 2, typed: true, fading: false };
  const fading = tapBeat(atLast, BEATS);
  assert.equal(fading.fading, true);
  assert.equal(fading.index, 2, "黑幕落下時舊的那一幕還在");
  assert.equal(tapBeat(fading, BEATS), fading);
  const next = finishBeatFade(fading, BEATS);
  assert.equal(next.index, 3);
  assert.equal(next.fading, false);
  assert.equal(next.typed, false);
});

test("最後一段不會再動，也不會自己清掉", () => {
  const end = { index: BEATS.length - 1, typed: true, fading: false };
  assert.equal(tapBeat(end, BEATS), end);
  assert.equal(finishBeatFade(end, BEATS), end);
});

test("聊天室的訊息一出現就是完整的，不用打字機", () => {
  assert.equal(startBeats(BEATS, 4).typed, true);
  assert.equal(startBeats(BEATS, 0).typed, false);
});

test("情緒轉折的黑幕比較慢", () => {
  assert.equal(beatFadeMs(BEATS[3]), BEAT_SLOW_FADE_MS);
  assert.equal(beatFadeMs(BEATS[0]), BEAT_FADE_MS);
  assert.ok(BEAT_SLOW_FADE_MS > BEAT_FADE_MS);
});

test("兩個結局從頭按到尾，每一句都會輪到，而且照順序", () => {
  for (const beats of [LADYBUG_BEATS, TRUE_ENDING_BEATS] as readonly (readonly Beat[])[]) {
    let p = startBeats(beats);
    const seen = [p.index];
    for (let i = 0; i < beats.length * 4 && p.index < beats.length - 1; i++) {
      const before = p.index;
      p = p.fading ? finishBeatFade(p, beats) : tapBeat(p, beats);
      if (p.index !== before) seen.push(p.index);
    }
    assert.deepEqual(seen, beats.map((_, i) => i));
  }
});

test("瓢蟲結局：開頭接得上聊天室，1h2s 那題和「好」一字不差", () => {
  const steps = STORY_BY_ID.studio.steps;
  const ask = steps.find((s) => "decision" in s);
  assert.ok(ask && "decision" in ask && ask.decision && ask.incoming.kind === "message");
  assert.equal(LADYBUG_BEATS[0].text, ask.incoming.text);
  assert.equal(LADYBUG_BEATS[0].who, "her");
  assert.equal(LADYBUG_START_INDEX, 1);
  assert.equal(LADYBUG_BEATS[1].text, ask.replies[ask.decision.choice]);
  assert.equal(LADYBUG_BEATS[1].who, "me");
  assert.equal(ask.answers?.[ask.decision.choice], LADYBUG_BEATS[2].text, "她當場回的那句也要一致");
});

test("瓢蟲結局：對話有來有回，兩邊都講得夠多，誰都不會連講太久", () => {
  const spoken = LADYBUG_BEATS.filter((b) => b.who);
  const her = spoken.filter((b) => b.who === "her").length;
  const me = spoken.filter((b) => b.who === "me").length;
  assert.ok(her >= 12 && me >= 12, `她 ${her} 句，他 ${me} 句`);
  let run = 1;
  for (let i = 1; i < spoken.length; i++) {
    run = spoken[i].who === spoken[i - 1].who ? run + 1 : 1;
    assert.ok(run <= 2, `第 ${i} 句前連講 ${run} 句：${spoken[i].text}`);
  }
});

test("瓢蟲結局：轉折的黑幕放慢，同一幕不會有兩句重複（台詞用文字當 key）", () => {
  for (const scene of ["alley", "black", "title"]) {
    const first = LADYBUG_BEATS.find((b) => b.scene === scene);
    assert.equal(first?.fade, "slow", scene);
  }
  LADYBUG_BEATS.forEach((_, i) => {
    const texts = visibleBeats(LADYBUG_BEATS, i).map((b) => b.text);
    assert.equal(new Set(texts).size, texts.length);
  });
});
