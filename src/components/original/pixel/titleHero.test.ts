import { test } from "node:test";
import assert from "node:assert/strict";
import { generateGirl } from "../../../lib/left-on-read/girl.ts";
import {
  GUANYU_HEAD,
  TITLE_FRAGMENTS,
  TITLE_H,
  TITLE_MESSAGE_BOX,
  TITLE_STILL_T,
  TITLE_W,
  drawTitleHero,
  drawTitleHeroStill,
  replyStage,
  type Box,
} from "./titleHero.ts";

const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const inside = (a: Box) => a.x >= 0 && a.y >= 0 && a.x + a.w <= TITLE_W && a.y + a.h <= TITLE_H;

test("標題畫面有句點、嗯嗯、去洗澡，也有一個連回都沒回的", () => {
  assert.deepEqual(
    TITLE_FRAGMENTS.map((f) => f.reply),
    ["。", "嗯嗯", "去洗澡", null]
  );
});

test("標題畫面的女生固定四個不同的人，都是一般成年女角", () => {
  const girls = TITLE_FRAGMENTS.map((f) => generateGirl(f.seed));
  assert.equal(new Set(girls.map((g) => g.seed)).size, girls.length);
  for (const girl of girls) {
    assert.ok(girl.age >= 22, `${girl.nickname} ${girl.age}`);
    assert.equal(girl.studio, false, `${girl.nickname} 是個工`);
    assert.equal(girl.photos, undefined, `${girl.nickname} 是小晴`);
  }
});

test("卡片和泡泡都在畫面裡，也沒有蓋到冠宇的頭", () => {
  for (const f of TITLE_FRAGMENTS) {
    for (const box of [f.card, f.bubble]) {
      assert.ok(inside(box), JSON.stringify(box));
      assert.ok(!overlaps(box, GUANYU_HEAD), JSON.stringify(box));
      assert.ok(!overlaps(box, TITLE_MESSAGE_BOX), JSON.stringify(box));
    }
  }
});

test("對話輪流出現：同一時間只有一段在輸入，每段都會走到已讀", () => {
  const seen = TITLE_FRAGMENTS.map(() => new Set<string>());
  for (let t = 0; t < 30000; t += 50) {
    const stages = TITLE_FRAGMENTS.map((_, i) => replyStage(t, i));
    assert.ok(stages.filter((s) => s === "typing").length <= 1, `t=${t}`);
    stages.forEach((s, i) => seen[i].add(s));
  }
  for (const s of seen) assert.deepEqual([...s].sort(), ["read", "reply", "typing"]);
});

test("減少動態效果的定格：每段都已讀", () => {
  TITLE_FRAGMENTS.forEach((_, i) => assert.equal(replyStage(TITLE_STILL_T, i), "read"));
});

/** 不用瀏覽器：把畫布換成只記錄指令的假物件 */
function fakeCanvas() {
  const calls: unknown[][] = [];
  const ctx = {
    fillStyle: "",
    font: "",
    textBaseline: "",
    globalCompositeOperation: "source-over",
    imageSmoothingEnabled: false,
    imageSmoothingQuality: "low",
    fillRect: (...a: number[]) => calls.push(["fillRect", ctx.fillStyle, ...a]),
    clearRect: (...a: number[]) => calls.push(["clearRect", ...a]),
    drawImage: (_source: unknown, ...a: number[]) => calls.push(["drawImage", ...a]),
    save() {},
    restore() {},
    scale() {},
    fillText() {},
    measureText: (text: string) => ({ width: text.length * 12 }),
    getImageData: (_x: number, _y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  };
  return { ctx, calls, canvas: { width: 0, height: 0, getContext: () => ctx } };
}

test("整個主視覺畫得完，座標都是有效數字，同一格畫兩次結果一樣", () => {
  Object.assign(globalThis, { document: { createElement: () => fakeCanvas().canvas } });
  try {
    const run = (draw: (ctx: never) => void) => {
      const fake = fakeCanvas();
      draw(fake.ctx as never);
      return fake.calls;
    };
    const still = run((ctx) => drawTitleHeroStill(ctx));
    assert.ok(still.length > 20, `只有 ${still.length} 個繪製指令`);
    assert.deepEqual(still, run((ctx) => drawTitleHeroStill(ctx)));
    for (const t of [0, 800, 1600, 2600, 5000, 7300, 9700, 123456]) {
      for (const call of run((ctx) => drawTitleHero(ctx, t))) {
        for (const v of call.slice(1)) {
          if (typeof v === "number") assert.ok(Number.isFinite(v), `t=${t} ${JSON.stringify(call)}`);
        }
      }
    }
  } finally {
    delete (globalThis as { document?: unknown }).document;
  }
});
