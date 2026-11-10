/**
 * 失敗圖鑑：只計 STORIES 裡有的 id，未知 id 不能湊數。
 */

import { IRIS_ENDING_ID, LADYBUG_ENDING_ID, TRUE_ENDING_ID } from "./constants.ts";
import { STORIES } from "./stories/index.ts";

export interface DexEntry {
  count: number;
  firstDayIndex: number;
  /** 看過哪幾個結局（0 是原本的）；只有分歧劇情走過另一個結局才會有，沒有就當作只看過 [0] */
  endings?: number[];
}

export type Dex = Record<string, DexEntry>;

/** 這一筆看過的結局編號，由小到大 */
export function endingsSeen(entry: DexEntry): number[] {
  return entry.endings ?? [0];
}

/** 記一筆失敗；endingIndex 是走到第幾個結局（0 是原本的） */
export function recordFailure(dex: Dex, storyId: string, dayIndex: number, endingIndex = 0): Dex {
  const entry = Object.hasOwn(dex, storyId) ? dex[storyId] : null;
  const base: DexEntry = entry ? { ...entry, count: entry.count + 1 } : { count: 1, firstDayIndex: dayIndex };
  const seen = entry ? endingsSeen(entry) : [];
  // 只看過原本結局的不另外記，存檔和舊資料都維持原樣
  if (!seen.includes(endingIndex) && (endingIndex !== 0 || base.endings)) {
    base.endings = [...seen, endingIndex].sort((a, b) => a - b);
  }
  return { ...dex, [storyId]: base };
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
