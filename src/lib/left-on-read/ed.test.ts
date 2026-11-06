import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { describe, it } from "node:test";
import { ED_CROSSFADE_MS, ED_SEQUENCES, ED_TAP_GUARD_MS, edTapAccepted, edTotalMs, nextEdIndex, type EdEnding } from "./ed.ts";

const ENDINGS = Object.keys(ED_SEQUENCES) as EdEnding[];
const ids = (ending: EdEnding) => ED_SEQUENCES[ending].map((f) => f.id);

describe("片尾分鏡", () => {
  it("兩個結局的順序", () => {
    assert.deepEqual(ids("true"), ["phone", "read", "morning", "walk", "title"]);
    assert.deepEqual(ids("ladybug"), ["phone", "read", "yoshiwara", "bangkok", "title"]);
  });

  it("小晴只出現在真結局，吉原與牛仔街只出現在瓢蟲結局", () => {
    assert.ok(!ids("ladybug").includes("walk"));
    assert.ok(!ids("true").includes("yoshiwara"));
    assert.ok(!ids("true").includes("bangkok"));
    assert.ok(ids("ladybug").includes("yoshiwara"));
    assert.ok(ids("ladybug").includes("bangkok"));
  });

  for (const ending of ENDINGS) {
    const frames = ED_SEQUENCES[ending];

    it(`${ending}：放著看 15～30 秒`, () => {
      const total = edTotalMs(frames);
      assert.ok(total >= 15000 && total <= 30000, `實際 ${total}ms`);
    });

    it(`${ending}：圖都在 public 裡，也都有替代文字`, () => {
      for (const f of frames) {
        assert.ok(existsSync(new URL(`../../../public${f.src}`, import.meta.url)), f.src);
        assert.ok(f.alt.length > 0, f.id);
      }
    });

    it(`${ending}：片名之前每張都有字幕，片名本身不加字`, () => {
      for (const f of frames.slice(0, -1)) assert.ok(f.caption, f.id);
      assert.equal(frames.at(-1)?.id, "title");
      assert.equal(frames.at(-1)?.caption, undefined);
    });

    it(`${ending}：淡入完還有時間停留`, () => {
      for (const f of frames) assert.ok(f.holdMs > ED_CROSSFADE_MS * 2, f.id);
    });

    it(`${ending}：一張一張走到片名，下一步是回選單`, () => {
      let index = 0;
      const seen = [index];
      for (let next = nextEdIndex(index, frames); next !== null; next = nextEdIndex(index, frames)) {
        index = next;
        seen.push(index);
      }
      assert.deepEqual(seen, frames.map((_, i) => i));
      assert.equal(frames[index].id, "title");
    });
  }

  it("圖剛換上時的按鍵不算", () => {
    assert.equal(edTapAccepted(0), false);
    assert.equal(edTapAccepted(ED_TAP_GUARD_MS - 1), false);
    assert.equal(edTapAccepted(ED_TAP_GUARD_MS), true);
  });
});
