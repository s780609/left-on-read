import { test } from "node:test";
import assert from "node:assert/strict";
import { createRng, mixSeed, pick, randInt, weightedPick } from "./rng.ts";
import type { Rng } from "./rng.ts";

const draw = (rng: Rng, n: number) => Array.from({ length: n }, () => rng());

const popcount = (x: number) => {
  let n = 0;
  for (let v = x >>> 0; v !== 0; v >>>= 1) n += v & 1;
  return n;
};

test("createRng：同一個 seed 得到同一串數字", () => {
  for (const seed of [0, 1, 42, 123456789, 2 ** 32 - 1]) {
    assert.deepEqual(draw(createRng(seed), 1000), draw(createRng(seed), 1000));
  }
});

test("createRng：不同 seed 得到不同的數字串", () => {
  assert.notDeepEqual(draw(createRng(1), 20), draw(createRng(2), 20));
});

test("createRng：輸出都在 [0,1) 之內，包含特殊 seed", () => {
  for (const seed of [0, 1, -1, 2 ** 32 - 1, 2 ** 53, 1.5, NaN]) {
    for (const v of draw(createRng(seed), 2000)) {
      assert.ok(v >= 0 && v < 1, `seed ${seed} 產生 ${v}`);
    }
  }
});

test("createRng：分布大致均勻", () => {
  const n = 100_000;
  const buckets = new Array<number>(10).fill(0);
  for (const v of draw(createRng(7), n)) buckets[Math.floor(v * 10)]++;
  for (const count of buckets) {
    assert.ok(Math.abs(count - n / 10) < n / 100, `桶內數量 ${count} 偏離太多`);
  }
});

test("mixSeed：一定是 uint32，包含特殊輸入", () => {
  const inputs: number[][] = [[], [0], [1], [-1], [2 ** 32 - 1], [NaN], [Infinity], [1.5], [1, 2, 3], [NaN, 0]];
  for (const parts of inputs) {
    const h = mixSeed(...parts);
    assert.ok(Number.isInteger(h) && h >= 0 && h <= 2 ** 32 - 1, `mixSeed(${parts.join()}) = ${h}`);
  }
});

test("mixSeed：相同輸入得到相同結果，順序不同結果不同", () => {
  assert.equal(mixSeed(3, 9, 27), mixSeed(3, 9, 27));
  assert.notEqual(mixSeed(1, 2), mixSeed(2, 1));
  assert.notEqual(mixSeed(1), mixSeed(1, 0));
});

test("mixSeed：相鄰輸入的位元差異明顯", () => {
  const n = 2000;
  const cases: ((i: number) => number)[] = [(i) => mixSeed(i), (i) => mixSeed(5, i), (i) => mixSeed(i, 5)];
  for (const f of cases) {
    let bits = 0;
    for (let i = 0; i < n; i++) bits += popcount(f(i) ^ f(i + 1));
    const avg = bits / n;
    // 理想值是 16 個位元，LCG 或簡單相加會遠低於這個範圍
    assert.ok(avg > 12 && avg < 20, `平均差 ${avg} 個位元`);
  }
});

test("相鄰 seed 混合後，第一個亂數彼此不相似", () => {
  const n = 5000;
  const first = (i: number) => createRng(mixSeed(i))();
  let gap = 0;
  const buckets = new Array<number>(10).fill(0);
  for (let i = 0; i < n; i++) {
    gap += Math.abs(first(i) - first(i + 1));
    buckets[Math.floor(first(i) * 10)]++;
  }
  // 兩個獨立均勻亂數的平均距離是 1/3
  assert.ok(gap / n > 0.28 && gap / n < 0.38, `平均距離 ${gap / n}`);
  for (const count of buckets) assert.ok(Math.abs(count - n / 10) < n / 20, `桶內數量 ${count}`);
});

test("pick：一定選到清單裡的項目，且每項都選得到", () => {
  const list = ["a", "b", "c", "d"] as const;
  const seen = new Set<string>();
  const rng = createRng(11);
  for (let i = 0; i < 500; i++) {
    const v = pick(rng, list);
    assert.ok(list.includes(v));
    seen.add(v);
  }
  assert.equal(seen.size, list.length);
});

test("pick：亂數在兩端時不會超出範圍", () => {
  const list = [10, 20, 30];
  assert.ok(list.includes(pick(() => 0, list)));
  assert.ok(list.includes(pick(() => 0.999999999, list)));
});

test("randInt：是整數且包含上下限", () => {
  const rng = createRng(13);
  const seen = new Set<number>();
  for (let i = 0; i < 2000; i++) {
    const v = randInt(rng, 3, 7);
    assert.ok(Number.isInteger(v) && v >= 3 && v <= 7, `得到 ${v}`);
    seen.add(v);
  }
  assert.deepEqual([...seen].sort((a, b) => a - b), [3, 4, 5, 6, 7]);
});

test("randInt：亂數在兩端時對應到上下限，上下限相同時回傳該值", () => {
  assert.equal(randInt(() => 0, 22, 38), 22);
  assert.equal(randInt(() => 0.999999999, 22, 38), 38);
  assert.equal(randInt(createRng(1), 9, 9), 9);
});

test("weightedPick：不會選到權重 0 的項目，亂數在兩端時也一樣", () => {
  const items = [
    { item: "zero-head", weight: 0 },
    { item: "ok", weight: 1 },
    { item: "zero-tail", weight: 0 },
  ];
  assert.equal(weightedPick(() => 0, items), "ok");
  assert.equal(weightedPick(() => 0.999999999, items), "ok");
  const rng = createRng(17);
  for (let i = 0; i < 2000; i++) assert.equal(weightedPick(rng, items), "ok");
});

test("weightedPick：出現比例接近權重", () => {
  const items = [
    { item: "a", weight: 1 },
    { item: "b", weight: 3 },
    { item: "skip", weight: 0 },
    { item: "c", weight: 0.5 },
  ];
  const n = 45_000;
  const counts: Record<string, number> = { a: 0, b: 0, c: 0, skip: 0 };
  const rng = createRng(19);
  for (let i = 0; i < n; i++) counts[weightedPick(rng, items)]++;
  assert.equal(counts.skip, 0);
  assert.ok(Math.abs(counts.a / n - 1 / 4.5) < 0.02);
  assert.ok(Math.abs(counts.b / n - 3 / 4.5) < 0.02);
  assert.ok(Math.abs(counts.c / n - 0.5 / 4.5) < 0.02);
});
