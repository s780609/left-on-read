/**
 * 配對機率。合法輸入實際落在 2.35%～28.89%，夾值只有覆寫 baseRate 時才碰得到。
 */

import { GUANYU_AGE } from "./constants.ts";
import type { Rng } from "./rng.ts";

const BASE_RATE = 0.22;
const MIN_PROBABILITY = 0.02;
const MAX_PROBABILITY = 0.45;
/** 演算法笑話：連續右滑越多，曝光越低 */
const STREAK_DECAY = 0.93;
const STREAK_FLOOR = 0.4;

export interface MatchInput {
  pickiness: number;
  /** 這次滑動之前的連續右滑次數 */
  rightStreak: number;
  age: number;
  eduMod: -1 | 0 | 1;
}

export interface MatchParams {
  baseRate: number;
}

export function matchProbability(input: MatchInput, params: MatchParams = { baseRate: BASE_RATE }): number {
  const { pickiness, rightStreak, age, eduMod } = input;
  const p =
    params.baseRate *
    (1.3 - pickiness) *
    Math.max(STREAK_FLOOR, STREAK_DECAY ** rightStreak) *
    (1 - 0.01 * Math.min(10, Math.abs(age - GUANYU_AGE))) *
    (1 + 0.01 * eduMod);
  return Math.min(MAX_PROBABILITY, Math.max(MIN_PROBABILITY, p));
}

export function rollMatch(p: number, rng: Rng): boolean {
  return rng() < p;
}

export function nextStreak(streak: number, dir: "left" | "right"): number {
  return dir === "right" ? streak + 1 : 0;
}
