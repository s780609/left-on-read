import { test } from "node:test";
import assert from "node:assert/strict";
import { MEAL_PRICE_MAX, MEAL_PRICE_MIN, NOODLE_PRICE } from "./constants.ts";
import { MEALS, NOODLES } from "./meals.ts";
import type { Meal } from "./meals.ts";

const hasText = (s: string) => typeof s === "string" && s.trim().length > 0;

test("金額常數符合規格", () => {
  assert.equal(MEAL_PRICE_MIN, 100);
  assert.equal(MEAL_PRICE_MAX, 260);
  assert.equal(NOODLE_PRICE, 30);
});

test("餐點不只一種，id 不重複", () => {
  assert.ok(MEALS.length > 1);
  assert.equal(new Set(MEALS.map((m) => m.id)).size, MEALS.length);
});

test("餐費都是 100～260 的整數", () => {
  for (const m of MEALS) {
    assert.ok(Number.isInteger(m.price), `${m.id} 價格 ${m.price}`);
    assert.ok(m.price >= MEAL_PRICE_MIN && m.price <= MEAL_PRICE_MAX, `${m.id} 價格 ${m.price}`);
  }
});

test("每道餐點都有名稱和孤單旁白", () => {
  const all: readonly Meal[] = [...MEALS, NOODLES];
  for (const m of all) {
    assert.ok(hasText(m.name), `${m.id} 沒有名稱`);
    assert.ok(hasText(m.narration), `${m.id} 沒有旁白`);
  }
});

test("泡麵 30 元，不在外食清單裡", () => {
  assert.equal(NOODLES.price, NOODLE_PRICE);
  assert.ok(!MEALS.some((m) => m.id === NOODLES.id));
});
