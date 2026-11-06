/**
 * 陳冠宇：跟插圖一樣，瘦、臉窄，黑色亂髮、瀏海長到蓋住眼睛，
 * 細黑框長方形眼鏡，表情平靜又有點累，穿素面灰色圓領 T 恤。
 */

import { blink, glow, rect, saw, type Ctx } from "./draw.ts";

const HAIR = "#15121c";
const HAIR_LIGHT = "#2f2a3c";
const SKIN = "#efc29a";
const SKIN_SHADE = "#d39c74";
const MOUTH = "#a5654b";
const FRAME = "#08070c";
const LENS = "#d6e6ec";
const EYE = "#2a1f22";
const TEE = "#8a8f9c";
const TEE_SHADE = "#6c717e";
const COLLAR = "#4a4e5c";

/** 大頭半身像，寬 64、高 70：標題、配對、畢業畫面用 */
export function drawGuanyuBust(
  ctx: Ctx,
  x: number,
  y: number,
  opts: { t?: number; phoneGlow?: boolean; gradCap?: boolean } = {}
) {
  const { t = 0, phoneGlow = false, gradCap = false } = opts;
  // 身體：瘦，肩膀往下斜
  rect(ctx, TEE, x + 14, y + 50, 36, 20);
  rect(ctx, TEE, x + 9, y + 55, 46, 15);
  rect(ctx, TEE, x + 6, y + 60, 52, 10);
  rect(ctx, TEE_SHADE, x + 6, y + 67, 52, 3);
  rect(ctx, TEE_SHADE, x + 15, y + 58, 1, 12); // 袖子的皺摺
  rect(ctx, TEE_SHADE, x + 48, y + 58, 1, 12);
  rect(ctx, TEE_SHADE, x + 30, y + 60, 1, 5);
  // 脖子
  rect(ctx, SKIN_SHADE, x + 27, y + 43, 10, 8);
  rect(ctx, SKIN, x + 28, y + 47, 8, 4);
  // 素面圓領
  rect(ctx, COLLAR, x + 24, y + 50, 2, 2);
  rect(ctx, COLLAR, x + 26, y + 52, 3, 1);
  rect(ctx, COLLAR, x + 29, y + 53, 6, 1);
  rect(ctx, COLLAR, x + 35, y + 52, 3, 1);
  rect(ctx, COLLAR, x + 38, y + 50, 2, 2);
  rect(ctx, SKIN, x + 26, y + 50, 12, 2);
  rect(ctx, SKIN, x + 29, y + 52, 6, 1);
  // 臉：窄、下巴尖一點
  rect(ctx, SKIN, x + 20, y + 14, 24, 26);
  rect(ctx, SKIN, x + 22, y + 40, 20, 3);
  rect(ctx, SKIN, x + 25, y + 43, 14, 2);
  rect(ctx, SKIN_SHADE, x + 20, y + 36, 2, 4);
  rect(ctx, SKIN_SHADE, x + 42, y + 36, 2, 4);
  rect(ctx, SKIN_SHADE, x + 25, y + 44, 14, 1);
  rect(ctx, SKIN_SHADE, x + 17, y + 26, 3, 7); // 耳朵
  rect(ctx, SKIN_SHADE, x + 44, y + 26, 3, 7);
  // 黑色亂髮：蓬但比較軟，翹毛少一點
  rect(ctx, HAIR, x + 18, y + 7, 28, 10);
  rect(ctx, HAIR, x + 15, y + 11, 6, 16);
  rect(ctx, HAIR, x + 43, y + 11, 6, 15);
  const tufts: readonly (readonly [number, number, number, number])[] = [
    [16, 6, 6, 5], [21, 3, 6, 5], [27, 2, 6, 6], [33, 3, 6, 5], [39, 4, 6, 5], [44, 7, 4, 5], [13, 10, 3, 5], [48, 11, 3, 5],
    [25, 1, 2, 2], [36, 1, 2, 3],
  ];
  for (const [sx, sy, sw, sh] of tufts) rect(ctx, HAIR, x + sx, y + sy, sw, sh);
  // 長瀏海：一撮一撮垂到眼睛上，尾端尖尖的
  const bangs: readonly (readonly [number, number])[] = [
    [20, 7], [23, 11], [26, 8], [29, 13], [32, 9], [35, 12], [38, 8], [41, 6],
  ];
  for (const [bx, bh] of bangs) {
    rect(ctx, HAIR, x + bx, y + 16, 3, bh - 2);
    rect(ctx, HAIR, x + bx + 1, y + 14 + bh, 1, 2);
  }
  rect(ctx, HAIR_LIGHT, x + 24, y + 9, 7, 1);
  rect(ctx, HAIR_LIGHT, x + 35, y + 8, 5, 1);
  rect(ctx, HAIR_LIGHT, x + 30, y + 18, 1, 6);
  // 細黑框長方形眼鏡
  const lens = phoneGlow ? (blink(t, 240) ? "#e6fbff" : "#9fe3ff") : LENS;
  rect(ctx, FRAME, x + 20, y + 28, 11, 1);
  rect(ctx, FRAME, x + 20, y + 34, 11, 1);
  rect(ctx, FRAME, x + 20, y + 28, 1, 7);
  rect(ctx, FRAME, x + 30, y + 28, 1, 7);
  rect(ctx, FRAME, x + 33, y + 28, 11, 1);
  rect(ctx, FRAME, x + 33, y + 34, 11, 1);
  rect(ctx, FRAME, x + 33, y + 28, 1, 7);
  rect(ctx, FRAME, x + 43, y + 28, 1, 7);
  rect(ctx, FRAME, x + 31, y + 29, 2, 1); // 鼻橋
  rect(ctx, FRAME, x + 18, y + 29, 2, 1); // 鏡腳
  rect(ctx, FRAME, x + 44, y + 29, 2, 1);
  if (phoneGlow) {
    rect(ctx, lens, x + 21, y + 31, 9, 3);
    rect(ctx, lens, x + 34, y + 31, 9, 3);
  }
  // 眼睛：半闔，有點累；瀏海蓋住上半
  const closed = !phoneGlow && saw(t, 3400) > 0.95;
  if (closed) {
    rect(ctx, EYE, x + 23, y + 32, 5, 1);
    rect(ctx, EYE, x + 36, y + 32, 5, 1);
  } else {
    rect(ctx, EYE, x + 23, y + 31, 5, 1); // 眼皮
    rect(ctx, EYE, x + 36, y + 31, 5, 1);
    rect(ctx, EYE, x + 24, y + 32, 3, 2);
    rect(ctx, EYE, x + 37, y + 32, 3, 2);
    rect(ctx, "#ffffff", x + 25, y + 32, 1, 1);
    rect(ctx, "#ffffff", x + 38, y + 32, 1, 1);
  }
  if (!phoneGlow) {
    rect(ctx, "#ffffff", x + 28, y + 29, 2, 1); // 鏡片反光
    rect(ctx, "#ffffff", x + 41, y + 29, 2, 1);
  }
  // 鼻子和嘴：平平的，嘴角微微
  rect(ctx, SKIN_SHADE, x + 31, y + 36, 2, 2);
  rect(ctx, MOUTH, x + 29, y + 40, 6, 1);
  rect(ctx, MOUTH, x + 35, y + 39, 1, 1);
  if (phoneGlow) glow(ctx, "#bfeeff", x + 32, y + 66, 12, t);
  if (gradCap) {
    rect(ctx, "#101018", x + 16, y + 2, 32, 8);
    rect(ctx, "#101018", x + 4, y - 2, 56, 5);
    rect(ctx, "#2a2a3a", x + 4, y - 2, 56, 1);
    rect(ctx, "#e8c64a", x + 50, y + 2, 2, 16);
    rect(ctx, "#e8c64a", x + 48, y + 17, 6, 4);
  }
}
