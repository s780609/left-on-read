/**
 * 陳冠宇：亂髮、粗黑框眼鏡、微胖、領口洗到變形呈波浪狀的舊 T 恤。
 */

import { blink, glow, rect, saw, type Ctx } from "./draw";

const HAIR = "#15121c";
const HAIR_LIGHT = "#2f2a3c";
const SKIN = "#efc29a";
const SKIN_SHADE = "#d39c74";
const MOUTH = "#a5654b";
const FRAME = "#08070c";
const LENS = "#d6e6ec";
const TEE = "#8f97ab";
const TEE_SHADE = "#6e7589";
const COLLAR = "#b5bccc";
const COLLAR_DARK = "#59607a";

/** 大頭半身像，寬 64、高 70：標題、配對、畢業畫面用 */
export function drawGuanyuBust(
  ctx: Ctx,
  x: number,
  y: number,
  opts: { t?: number; phoneGlow?: boolean; gradCap?: boolean } = {}
) {
  const { t = 0, phoneGlow = false, gradCap = false } = opts;
  // 身體：肩膀很寬，整個是圓的
  rect(ctx, TEE, x + 6, y + 48, 52, 22);
  rect(ctx, TEE, x + 2, y + 54, 60, 16);
  rect(ctx, TEE_SHADE, x + 2, y + 66, 60, 4);
  rect(ctx, TEE_SHADE, x + 12, y + 56, 1, 14);
  rect(ctx, TEE_SHADE, x + 51, y + 56, 1, 14);
  // 脖子
  rect(ctx, SKIN_SHADE, x + 23, y + 42, 18, 8);
  rect(ctx, SKIN, x + 22, y + 47, 20, 4);
  // 波浪領口：比小人更明顯
  for (let i = 0; i < 32; i++) {
    const wave = [0, 1, 2, 3, 3, 2, 1, 0][i % 8];
    rect(ctx, COLLAR, x + 16 + i, y + 48 + wave + Math.abs(i - 16) * -0.12, 1, 2);
    rect(ctx, COLLAR_DARK, x + 16 + i, y + 50 + wave + Math.abs(i - 16) * -0.12, 1, 1);
  }
  // 臉
  rect(ctx, SKIN, x + 16, y + 12, 32, 34);
  rect(ctx, SKIN, x + 13, y + 22, 38, 18);
  rect(ctx, SKIN, x + 18, y + 46, 28, 2);
  rect(ctx, SKIN_SHADE, x + 13, y + 36, 3, 4);
  rect(ctx, SKIN_SHADE, x + 48, y + 36, 3, 4);
  rect(ctx, SKIN_SHADE, x + 18, y + 47, 28, 1);
  rect(ctx, SKIN_SHADE, x + 9, y + 25, 4, 9); // 耳朵
  rect(ctx, SKIN_SHADE, x + 51, y + 25, 4, 9);
  // 亂髮
  rect(ctx, HAIR, x + 14, y + 8, 36, 12);
  rect(ctx, HAIR, x + 11, y + 12, 6, 14);
  rect(ctx, HAIR, x + 47, y + 11, 6, 14);
  const spikes: readonly (readonly [number, number, number, number])[] = [
    [13, 5, 6, 5], [20, 2, 6, 7], [27, 0, 5, 9], [33, 3, 7, 6], [41, 1, 6, 8], [47, 6, 5, 6], [9, 10, 4, 6], [52, 12, 3, 6],
  ];
  for (const [sx, sy, sw, sh] of spikes) rect(ctx, HAIR, x + sx, y + sy, sw, sh);
  const fringe: readonly (readonly [number, number])[] = [[17, 5], [22, 3], [26, 7], [31, 4], [36, 6], [41, 3], [45, 5]];
  for (const [fx, fh] of fringe) rect(ctx, HAIR, x + fx, y + 19, 4, fh);
  rect(ctx, HAIR_LIGHT, x + 22, y + 10, 8, 2);
  rect(ctx, HAIR_LIGHT, x + 36, y + 8, 6, 2);
  // 粗黑框眼鏡
  const lens = phoneGlow ? (blink(t, 240) ? "#e6fbff" : "#9fe3ff") : LENS;
  rect(ctx, FRAME, x + 10, y + 27, 44, 3);
  rect(ctx, FRAME, x + 15, y + 26, 16, 13);
  rect(ctx, FRAME, x + 33, y + 26, 16, 13);
  rect(ctx, lens, x + 18, y + 29, 10, 7);
  rect(ctx, lens, x + 36, y + 29, 10, 7);
  rect(ctx, "#ffffff", x + 19, y + 30, 3, 1);
  rect(ctx, "#ffffff", x + 37, y + 30, 3, 1);
  // 眼睛和嘴
  const closed = !phoneGlow && saw(t, 3400) > 0.95;
  if (closed) {
    rect(ctx, FRAME, x + 20, y + 33, 6, 1);
    rect(ctx, FRAME, x + 38, y + 33, 6, 1);
  } else {
    rect(ctx, FRAME, x + 22, y + 31, 3, 3);
    rect(ctx, FRAME, x + 40, y + 31, 3, 3);
  }
  rect(ctx, SKIN_SHADE, x + 30, y + 40, 4, 1);
  rect(ctx, MOUTH, x + 27, y + 43, 10, 1);
  rect(ctx, MOUTH, x + 26, y + 42, 1, 1);
  // 鬍渣
  for (const [sx, sy] of [[20, 44], [24, 46], [40, 46], [44, 44], [30, 46], [35, 45]] as const) {
    rect(ctx, SKIN_SHADE, x + sx, y + sy, 1, 1);
  }
  if (phoneGlow) glow(ctx, "#bfeeff", x + 32, y + 66, 12, t);
  if (gradCap) {
    rect(ctx, "#101018", x + 12, y + 2, 40, 8);
    rect(ctx, "#101018", x + 2, y - 2, 60, 5);
    rect(ctx, "#2a2a3a", x + 2, y - 2, 60, 1);
    rect(ctx, "#e8c64a", x + 50, y + 2, 2, 16);
    rect(ctx, "#e8c64a", x + 48, y + 17, 6, 4);
  }
}
