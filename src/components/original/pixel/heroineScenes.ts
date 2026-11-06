/**
 * 真結局路線的場景：三次約會和尾聲都是 scene/ 底下的插圖，
 * 只有最後的標題畫面保留純色星空。
 */

import type { IrisEndingScene } from "@/lib/left-on-read/irisEnding";
import type { TrueEndingScene } from "@/lib/left-on-read/trueEnding";
import { pixelText, rect, saw, type Ctx } from "./draw";
import { SCENE_H, SCENE_W, photoDraw } from "./scenes";

type SceneDraw = (ctx: Ctx, t: number) => void;

/** 純色背景、一行字、幾顆慢慢閃的小燈 */
export function captionScene(bg: string, caption: string, light: string): SceneDraw {
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
  photoDraw("dateBanqiao"),
];

/**
 * 約會裡選擇之前的曖昧片段（HeroineDate.moments 的 scene）。
 * 插圖還沒生成，先借用同一次約會的主圖；圖來了在 scenes.ts 的 PHOTO_SRC 加一筆，這裡改一行就好。
 */
export const DATE_MOMENT_SCENES: Record<string, SceneDraw> = {
  movieHands: photoDraw("dateMovie"),
  nightMarket: photoDraw("dateFireworks"),
  treePhoto: photoDraw("dateBanqiao"),
};

export const TRUE_ENDING_SCENES: Record<TrueEndingScene, SceneDraw> = {
  // 告白後回程的捷運：插圖還沒生成，先借用耶誕城那張
  train: photoDraw("dateBanqiao"),
  noodles: photoDraw("epiNoodles"),
  intimate: photoDraw("epiIntimate"),
  intimateSex: photoDraw("epiIntimateSex"),
  chiayi: photoDraw("epiChiayi"),
  proposal: photoDraw("epiProposal"),
  wedding: photoDraw("epiWedding"),
  baby: photoDraw("epiBaby"),
  title: captionScene("#0f0e20", "", "#ff9fb4"),
};

/*
 * Iris 路線：約會與結局插圖已換成 scene/date-xiangshan、date-beitou、iris-*.jpg。
 * 角色外觀對齊 girl.ts 的 IRIS（栗子色馬尾、榛果笑眼、雀斑、珊瑚唇、苗條、苔綠帽 T；戶外可戴帽）。
 * 片名畫面仍用純色星空，比照小晴真結局。
 */

/** Iris 第幾次約會的場景 */
export const IRIS_DATE_SCENES: readonly SceneDraw[] = [
  photoDraw("dateXiangshan"),
  photoDraw("dateBeitou"),
];

export const IRIS_ENDING_SCENES: Record<IrisEndingScene, SceneDraw> = {
  morning: photoDraw("irisMorning"),
  mountains: photoDraw("irisMountains"),
  fight: photoDraw("irisFight"),
  makeup: photoDraw("irisMakeup"),
  proposal: photoDraw("irisProposal"),
  title: captionScene("#0f0e20", "", "#9fd3ff"),
};
