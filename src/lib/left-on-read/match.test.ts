import { test } from "node:test";
import assert from "node:assert/strict";
import { matchProbability, nextStreak, rollMatch } from "./match.ts";
import type { MatchInput } from "./match.ts";
import { GUANYU_AGE } from "./constants.ts";

const near = (actual: number, expected: number, eps = 1e-9) =>
  assert.ok(Math.abs(actual - expected) < eps, `${actual} 應該接近 ${expected}`);

/** 中性輸入：pickiness 0.3 時第二項倍率剛好是 1，機率就是基礎值 0.22 */
const neutral: MatchInput = { pickiness: 0.3, rightStreak: 0, age: 25, eduMod: 0 };
const pWith = (patch: Partial<MatchInput>) => matchProbability({ ...neutral, ...patch });

test("冠宇是 25 歲", () => {
  assert.equal(GUANYU_AGE, 25);
});

test("公式已知值", () => {
  near(pWith({}), 0.22);
  near(pWith({ pickiness: 0 }), 0.22 * 1.3);
  near(pWith({ pickiness: 1 }), 0.22 * 0.3);
  near(
    matchProbability({ pickiness: 0.4, rightStreak: 2, age: 30, eduMod: 1 }),
    0.22 * (1.3 - 0.4) * 0.93 ** 2 * (1 - 0.05) * 1.01
  );
  near(
    matchProbability({ pickiness: 0.75, rightStreak: 5, age: 22, eduMod: -1 }),
    0.22 * (1.3 - 0.75) * 0.93 ** 5 * (1 - 0.03) * 0.99
  );
});

test("沒給參數時，基礎機率是 0.22", () => {
  const input: MatchInput = { pickiness: 0.6, rightStreak: 3, age: 28, eduMod: 1 };
  assert.equal(matchProbability(input), matchProbability(input, { baseRate: 0.22 }));
});

test("基礎機率可以覆寫", () => {
  near(matchProbability(neutral, { baseRate: 0.1 }), 0.1);
  near(matchProbability(neutral, { baseRate: 0.3 }), 0.3);
});

test("連續右滑倍率：0、1、12 次照 0.93 次方，13 次起固定 0.4", () => {
  const base = pWith({ rightStreak: 0 });
  near(pWith({ rightStreak: 1 }) / base, 0.93);
  near(pWith({ rightStreak: 12 }) / base, 0.93 ** 12);
  near(pWith({ rightStreak: 13 }) / base, 0.4);
  near(pWith({ rightStreak: 14 }) / base, 0.4);
  near(pWith({ rightStreak: 99 }) / base, 0.4);
});

test("連續右滑越多，機率不會變高", () => {
  let last = Infinity;
  for (let streak = 0; streak <= 30; streak++) {
    const p = pWith({ rightStreak: streak });
    assert.ok(p <= last);
    last = p;
  }
});

test("nextStreak：右滑加一，左滑歸零", () => {
  assert.equal(nextStreak(0, "right"), 1);
  assert.equal(nextStreak(12, "right"), 13);
  assert.equal(nextStreak(0, "left"), 0);
  assert.equal(nextStreak(99, "left"), 0);
});

test("年齡差：每差一歲扣 1%，最多扣 10%", () => {
  const base = pWith({ age: 25 });
  near(pWith({ age: 22 }) / base, 0.97); // 差 3
  near(pWith({ age: 28 }) / base, 0.97); // 差 3，往上也一樣
  near(pWith({ age: 35 }) / base, 0.9); // 差 10
  near(pWith({ age: 38 }) / base, 0.9); // 差 13 仍只扣 10%
});

test("學歷影響是相對倍率 ±1%", () => {
  const base = pWith({ eduMod: 0 });
  near(pWith({ eduMod: 1 }) / base, 1.01);
  near(pWith({ eduMod: -1 }) / base, 0.99);
});

test("baseRate 太大時夾到 0.45，太小時夾到 0.02", () => {
  assert.equal(matchProbability({ pickiness: 0, rightStreak: 0, age: 25, eduMod: 1 }, { baseRate: 1 }), 0.45);
  assert.equal(matchProbability({ pickiness: 1, rightStreak: 99, age: 38, eduMod: -1 }, { baseRate: 0.01 }), 0.02);
});

test("列舉所有合法輸入：都在 [0.02, 0.45]，最大 0.28886、最小 0.0235224", () => {
  let max = -Infinity;
  let min = Infinity;
  for (let pi = 0; pi <= 20; pi++) {
    const pickiness = pi / 20;
    for (let rightStreak = 0; rightStreak <= 20; rightStreak++) {
      for (let age = 22; age <= 38; age++) {
        for (const eduMod of [-1, 0, 1] as const) {
          const p = matchProbability({ pickiness, rightStreak, age, eduMod });
          assert.ok(p >= 0.02 && p <= 0.45, `p=${p}`);
          if (p > max) max = p;
          if (p < min) min = p;
        }
      }
    }
  }
  near(max, 0.28886);
  near(min, 0.0235224);
});

test("rollMatch：亂數小於機率才配對", () => {
  assert.equal(rollMatch(0.3, () => 0.2999), true);
  assert.equal(rollMatch(0.3, () => 0.3), false);
  assert.equal(rollMatch(0.3, () => 0.3001), false);
  assert.equal(rollMatch(0.02, () => 0), true);
  assert.equal(rollMatch(0.45, () => 0.999), false);
  assert.equal(rollMatch(0, () => 0), false);
});
