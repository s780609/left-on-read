import { test } from "node:test";
import assert from "node:assert/strict";
import { SWIPE_FLICK_VELOCITY, SWIPE_THRESHOLD_RATIO, resolveSwipe } from "./swipe.ts";

const WIDTH = 300;
const threshold = SWIPE_THRESHOLD_RATIO * WIDTH;

test("門檻常數合理", () => {
  assert.ok(SWIPE_THRESHOLD_RATIO > 0 && SWIPE_THRESHOLD_RATIO < 1);
  assert.ok(SWIPE_FLICK_VELOCITY > 0);
});

test("距離超過門檻就飛出，方向跟著 dx", () => {
  assert.equal(resolveSwipe(threshold + 1, 0, WIDTH), "right");
  assert.equal(resolveSwipe(-(threshold + 1), 0, WIDTH), "left");
});

test("距離不到門檻、速度也不夠就不動", () => {
  assert.equal(resolveSwipe(threshold - 1, 0, WIDTH), null);
  assert.equal(resolveSwipe(-(threshold - 1), 0, WIDTH), null);
});

test("門檻跟著卡片寬度縮放", () => {
  const dx = threshold + 1;
  assert.equal(resolveSwipe(dx, 0, WIDTH), "right");
  assert.equal(resolveSwipe(dx, 0, WIDTH * 2), null);
});

test("距離短但速度夠快也算滑動", () => {
  const fast = SWIPE_FLICK_VELOCITY * 1.1;
  assert.equal(resolveSwipe(5, fast, WIDTH), "right");
  assert.equal(resolveSwipe(-5, -fast, WIDTH), "left");
});

test("距離短且速度不夠快就不動", () => {
  const slow = SWIPE_FLICK_VELOCITY * 0.9;
  assert.equal(resolveSwipe(5, slow, WIDTH), null);
  assert.equal(resolveSwipe(-5, -slow, WIDTH), null);
});

test("距離 0 一律不動", () => {
  assert.equal(resolveSwipe(0, 0, WIDTH), null);
  assert.equal(resolveSwipe(0, SWIPE_FLICK_VELOCITY * 10, WIDTH), null);
  assert.equal(resolveSwipe(0, -SWIPE_FLICK_VELOCITY * 10, WIDTH), null);
});
