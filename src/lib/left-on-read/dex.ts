/**
 * 失敗圖鑑：只計 STORIES 裡有的 id，未知 id 不能湊數。
 */

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
