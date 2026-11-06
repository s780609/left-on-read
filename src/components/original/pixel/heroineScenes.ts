/**
 * 真結局路線的場景：三次約會和尾聲都是 scene/ 底下的插圖，
 * 只有最後的標題畫面保留純色星空。
 */

import type { TrueEndingScene } from "@/lib/left-on-read/trueEnding";
import { pixelText, rect, saw, type Ctx } from "./draw";
import { SCENE_H, SCENE_W, photoDraw } from "./scenes";

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
  photoDraw("dateMovie"),
  photoDraw("dateFireworks"),
  photoDraw("dateTamsui"),
];

export const TRUE_ENDING_SCENES: Record<TrueEndingScene, SceneDraw> = {
  noodles: photoDraw("epiNoodles"),
  intimate: photoDraw("epiIntimate"),
  intimateSex: photoDraw("epiIntimateSex"),
  chiayi: photoDraw("epiChiayi"),
  proposal: photoDraw("epiProposal"),
  wedding: photoDraw("epiWedding"),
  baby: photoDraw("epiBaby"),
  title: captionScene("#0f0e20", "", "#ff9fb4"),
};
