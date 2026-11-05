import { test } from "node:test";
import assert from "node:assert/strict";
import { dexProgress, isDexComplete, recordFailure } from "./dex.ts";
import type { Dex } from "./dex.ts";
import { STORIES } from "./stories/index.ts";

const fullDex = (): Dex => Object.fromEntries(STORIES.map((s) => [s.id, { count: 1, firstDayIndex: 0 }]));
const [first, second] = STORIES;

test("首次紀錄：次數 1，記下當天", () => {
  const dex = recordFailure({}, first.id, 12);
  assert.deepEqual(dex[first.id], { count: 1, firstDayIndex: 12 });
});

test("重複紀錄：次數加一，首次日期不變", () => {
  let dex = recordFailure({}, first.id, 12);
  dex = recordFailure(dex, first.id, 30);
  dex = recordFailure(dex, first.id, 45);
  assert.deepEqual(dex[first.id], { count: 3, firstDayIndex: 12 });
});

test("不同劇情各自紀錄", () => {
  let dex = recordFailure({}, first.id, 1);
  dex = recordFailure(dex, second.id, 2);
  assert.deepEqual(dex[first.id], { count: 1, firstDayIndex: 1 });
  assert.deepEqual(dex[second.id], { count: 1, firstDayIndex: 2 });
});

test("原物件不被修改，回傳新物件", () => {
  const empty: Dex = {};
  const once = recordFailure(empty, first.id, 1);
  assert.notEqual(once, empty);
  assert.deepEqual(empty, {});

  const entry = once[first.id];
  const twice = recordFailure(once, first.id, 2);
  assert.notEqual(twice, once);
  assert.equal(once[first.id], entry);
  assert.deepEqual(once[first.id], { count: 1, firstDayIndex: 1 });
});

test("凍結的物件也能紀錄", () => {
  const dex = Object.freeze({ [first.id]: Object.freeze({ count: 1, firstDayIndex: 1 }) });
  assert.equal(recordFailure(dex, first.id, 2)[first.id].count, 2);
  assert.equal(recordFailure(dex, second.id, 2)[second.id].count, 1);
});

test("全部收集才算集滿", () => {
  assert.equal(isDexComplete({}), false);
  assert.equal(isDexComplete(fullDex()), true);
  for (const s of STORIES) {
    const dex = fullDex();
    delete dex[s.id];
    assert.equal(isDexComplete(dex), false, `少了 ${s.id} 不算集滿`);
  }
});

test("未知 id 不能湊數", () => {
  const dex = fullDex();
  delete dex[first.id];
  dex["no-such-story"] = { count: 1, firstDayIndex: 0 };
  assert.equal(isDexComplete(dex), false);
  assert.equal(dexProgress(dex).collected, STORIES.length - 1);
});

test("dexProgress 回報已收集與總數", () => {
  assert.deepEqual(dexProgress({}), { collected: 0, total: STORIES.length });
  assert.deepEqual(dexProgress(recordFailure({}, first.id, 0)), { collected: 1, total: STORIES.length });
  assert.deepEqual(dexProgress(fullDex()), { collected: STORIES.length, total: STORIES.length });
});

test("重複收集同一種，進度不會增加", () => {
  let dex = recordFailure({}, first.id, 0);
  dex = recordFailure(dex, first.id, 1);
  assert.equal(dexProgress(dex).collected, 1);
});
