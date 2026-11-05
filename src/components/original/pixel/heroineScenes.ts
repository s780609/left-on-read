/**
 * 真結局路線的場景。插圖還沒生成，先用純色加地名暫代；
 * 圖來了在 scenes.ts 的 PHOTO_SRC 加一筆，再把這裡對應的那一行換掉就好。
 */

import type { TrueEndingScene } from "@/lib/left-on-read/trueEnding";
import { pixelText, rect, saw, type Ctx } from "./draw";
import { SCENE_H, SCENE_W, drawNoodleScene, drawSleepScene } from "./scenes";

type SceneDraw = (ctx: Ctx, t: number) => void;

/** 純色背景、一行字、幾顆慢慢閃的小燈 */
function captionScene(bg: string, caption: string, light: string): SceneDraw {
  return (ctx, t) => {
    rect(ctx, bg, 0, 0, SCENE_W, SCENE_H);
    for (let i = 0; i < 14; i++) {
      if (saw(t + i * 410, 2600) < 0.6) rect(ctx, light, 8 + ((i * 37) % 164), 10 + ((i * 53) % 130), 2, 2);
    }
    pixelText(ctx, caption, SCENE_W / 2, 64, 18, "#f6f1de", "center");
  };
}

/** 第幾次約會的場景 */
export const DATE_SCENES: readonly SceneDraw[] = [
  captionScene("#2a2342", "信義威秀", "#ffd27a"),
  captionScene("#141a3a", "大稻埕", "#ff9fb4"),
  captionScene("#123028", "板橋耶誕城", "#ffe08a"),
];

export const TRUE_ENDING_SCENES: Record<TrueEndingScene, SceneDraw> = {
  noodles: drawNoodleScene,
  chiayi: captionScene("#3a3322", "嘉義", "#f2b45a"),
  proposal: captionScene("#2a1f3d", "第十九版", "#ff9fb4"),
  wedding: captionScene("#3d2733", "婚禮", "#fff1a8"),
  baby: drawSleepScene,
  title: captionScene("#0f0e20", "", "#ff9fb4"),
};
