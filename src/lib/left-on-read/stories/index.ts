/**
 * 失敗劇情的總表，以及不會被隨機抽到的隱藏路線。
 */

import type { Story } from "../storyTypes.ts";
import { FADE_STORIES } from "./fade.ts";
import { GHOST_STORIES } from "./ghost.ts";
import { PITCH_STORIES } from "./pitch.ts";
import { QUICK_STORIES } from "./quick.ts";
import { SPECIAL_STORIES } from "./special.ts";
import { HEROINE_DATES } from "./heroine.ts";
import type { HeroineDate } from "./heroine.ts";
import { IRIS_DATES, IRIS_STORY_ID } from "./iris.ts";

export { MIXUP_STORY_ID, SPECIAL_STORIES, STUDIO_STORY_ID } from "./special.ts";
export { IRIS_ALMOST_STORY_ID, IRIS_DATES, IRIS_LEFT_STORY_ID, IRIS_STORY_ID } from "./iris.ts";
export type { HeroineDate } from "./heroine.ts";

/** 約會的資料表：小晴和 Iris 各一份；其他路線沒有約會 */
export function datesForStory(storyId: string): readonly HeroineDate[] {
  return storyId === IRIS_STORY_ID ? IRIS_DATES : HEROINE_DATES;
}
export {
  HEROINE_ALMOST_STORY_ID,
  HEROINE_DATES,
  HEROINE_STORY_ID,
  HEROINE_V2_STORY_ID,
  LEGACY_HEROINE_STORY_ID,
  upgradeHeroineV2Chat,
  upgradeLegacyHeroineChat,
} from "./heroine.ts";

export const STORIES: readonly Story[] = [
  ...GHOST_STORIES,
  ...FADE_STORIES,
  ...PITCH_STORIES,
  ...QUICK_STORIES,
];

/** null 原型：查 "constructor"、"__proto__" 這類名稱不會判成存在 */
export const STORY_BY_ID: Record<string, Story> = Object.assign(
  Object.create(null) as Record<string, Story>,
  Object.fromEntries([...STORIES, ...SPECIAL_STORIES].map((s) => [s.id, s]))
);
