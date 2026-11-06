/**
 * 失敗圖鑑：只計 STORIES 裡有的 id，未知 id 不能湊數。
 */

import { IRIS_ENDING_ID, LADYBUG_ENDING_ID, TRUE_ENDING_ID } from "./constants.ts";
import { STORIES } from "./stories/index.ts";

export interface DexEntry {
  count: number;
  firstDayIndex: number;
}

export type Dex = Record<string, DexEntry>;

export function recordFailure(dex: Dex, storyId: string, dayIndex: number): Dex {
  const entry = Object.hasOwn(dex, storyId) ? dex[storyId] : null;
  return {
    ...dex,
    [storyId]: entry ? { ...entry, count: entry.count + 1 } : { count: 1, firstDayIndex: dayIndex },
  };
}

export function dexProgress(dex: Dex): { collected: number; total: number } {
  return {
    collected: STORIES.filter((s) => Object.hasOwn(dex, s.id)).length,
    total: STORIES.length,
  };
}

export function isDexComplete(dex: Dex): boolean {
  const { collected, total } = dexProgress(dex);
  return collected === total;
}

/** 結局：瓢蟲、小晴的真結局、Iris 的另一個結局；和失敗圖鑑分開算 */
export const ENDING_IDS: readonly string[] = [LADYBUG_ENDING_ID, TRUE_ENDING_ID, IRIS_ENDING_ID];

export function endingProgress(dex: Dex): { collected: number; total: number } {
  return { collected: ENDING_IDS.filter((id) => Object.hasOwn(dex, id)).length, total: ENDING_IDS.length };
}
