/**
 * 27 種失敗劇情的總表，以及不會被隨機抽到的隱藏路線。
 */

import type { Story } from "../storyTypes.ts";
import { FADE_STORIES } from "./fade.ts";
import { GHOST_STORIES } from "./ghost.ts";
import { PITCH_STORIES } from "./pitch.ts";
import { QUICK_STORIES } from "./quick.ts";
import { SPECIAL_STORIES } from "./special.ts";

export { SPECIAL_STORIES, STUDIO_STORY_ID } from "./special.ts";
export { HEROINE_ALMOST_STORY_ID, HEROINE_DATES, HEROINE_STORY_ID } from "./heroine.ts";

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
