/**
 * 女角的照片，邏輯尺寸 120×150：照片背景畫在這裡，人物由 girlPortrait.ts 逐層算好再疊上來。
 */

import type { Girl } from "../../../lib/left-on-read/girl.ts";
import type { PhotoBgId } from "../../../lib/left-on-read/girlData.ts";
import { bands, dither, rect, type Ctx } from "./draw.ts";
import { PORTRAIT_H, PORTRAIT_W, headTop, renderPortrait } from "./girlPortrait.ts";
import { blit } from "./raster.ts";

export const PHOTO_W = PORTRAIT_W;
export const PHOTO_H = PORTRAIT_H;

// ---------- 照片背景 ----------

const CAT_ROWS = ["c.....c", "cc...cc", "ccccccc", "cWcccWc", "ccccccc", ".ccpcc.", ".ccccc.", "ccccccc", "ccccccc", "ccccccc"];

const PHOTO_BG: Record<PhotoBgId, (ctx: Ctx) => void> = {
  cafe(ctx) {
    rect(ctx, "#6b4a35", 0, 0, 120, 150);
    rect(ctx, "#7d5a42", 0, 0, 120, 74);
    // 大窗戶和窗外的街
    rect(ctx, "#2d2019", 6, 8, 48, 56);
    bands(ctx, ["#cfe6f2", "#dfeef2", "#f0efdc"], 8, 10, 44, 34);
    rect(ctx, "#8ea69a", 8, 44, 44, 18);
    rect(ctx, "#2d2019", 29, 10, 2, 52);
    // 掛燈
    for (const lx of [76, 100]) {
      rect(ctx, "#2d2019", lx, 0, 1, 16);
      rect(ctx, "#2d2019", lx - 4, 16, 9, 5);
      rect(ctx, "#ffdf8c", lx - 2, 21, 5, 2);
    }
    // 層架和杯子
    rect(ctx, "#3f2b1f", 64, 42, 56, 3);
    for (const [cx, cc] of [[68, "#f2eadb"], [79, "#c97a58"], [90, "#7fa58c"], [104, "#f2eadb"]] as const) {
      rect(ctx, cc, cx, 33, 7, 9);
      rect(ctx, "#00000033", cx + 5, 33, 2, 9);
    }
    rect(ctx, "#3f2b1f", 0, 128, 120, 22);
  },
  beach(ctx) {
    bands(ctx, ["#7fc8ea", "#94d3ee", "#aadff0", "#c6ebf1", "#e6f3e6"], 0, 0, 120, 72);
    rect(ctx, "#fff3b0", 92, 12, 12, 12);
    rect(ctx, "#fff9d8", 94, 14, 8, 8);
    // 雲
    rect(ctx, "#ffffff", 14, 18, 22, 4);
    rect(ctx, "#ffffff", 20, 14, 12, 4);
    rect(ctx, "#ffffff", 62, 30, 16, 3);
    // 海和浪
    bands(ctx, ["#3f9fc8", "#4bafd0", "#62c0d8"], 0, 72, 120, 26);
    for (const [wx, wy] of [[8, 78], [40, 84], [76, 76], [96, 88], [20, 92]] as const) rect(ctx, "#d8f4f8", wx, wy, 12, 1);
    rect(ctx, "#efdcae", 0, 98, 120, 52);
    dither(ctx, "#dcc48f", 0, 98, 120, 52);
  },
  mountain(ctx) {
    bands(ctx, ["#9ccfe6", "#b4dcec", "#d0e8ef"], 0, 0, 120, 60);
    rect(ctx, "#ffffff", 72, 14, 24, 4);
    rect(ctx, "#ffffff", 78, 10, 12, 4);
    // 三層山稜線
    const ridge = (color: string, base: number, peaks: readonly (readonly [number, number])[]) => {
      for (const [px, height] of peaks) {
        for (let h = 0; h < height; h += 2) {
          rect(ctx, color, px - (height - h), base - h, (height - h) * 2, 2);
        }
      }
      rect(ctx, color, 0, base, 120, 150 - base);
    };
    ridge("#90aeba", 62, [[22, 26], [70, 34], [110, 22]]);
    ridge("#5f8a78", 82, [[6, 24], [54, 28], [96, 30]]);
    ridge("#3f6a55", 104, [[30, 22], [82, 20]]);
    // 登山步道的欄杆
    rect(ctx, "#7a5c3f", 0, 128, 120, 2);
    for (let i = 4; i < 120; i += 22) rect(ctx, "#7a5c3f", i, 118, 2, 32);
  },
  market(ctx) {
    bands(ctx, ["#120f2a", "#1a1636", "#262047"], 0, 0, 120, 70);
    // 招牌和燈泡串
    rect(ctx, "#c8392b", 4, 16, 44, 18);
    rect(ctx, "#ffd76a", 8, 20, 8, 2);
    rect(ctx, "#ffd76a", 8, 25, 26, 2);
    rect(ctx, "#2e8f7f", 76, 10, 40, 22);
    rect(ctx, "#f4f0d0", 80, 15, 20, 3);
    rect(ctx, "#f4f0d0", 80, 22, 30, 2);
    for (let i = 0; i < 120; i += 8) {
      const ly = 42 + (i % 16 === 0 ? 2 : 0);
      rect(ctx, "#3a3450", i, ly - 2, 8, 1);
      rect(ctx, i % 24 === 0 ? "#ff8f6a" : "#ffe08a", i + 3, ly, 2, 2);
    }
    // 攤車
    rect(ctx, "#3a2f55", 0, 60, 120, 90);
    rect(ctx, "#e8a13c", 0, 60, 34, 12);
    rect(ctx, "#fff0c0", 4, 73, 26, 12);
    rect(ctx, "#b04a35", 88, 58, 32, 14);
    rect(ctx, "#fff0c0", 92, 73, 24, 12);
    dither(ctx, "#00000055", 0, 110, 120, 40);
  },
  cat(ctx) {
    rect(ctx, "#ecdcc4", 0, 0, 120, 150);
    dither(ctx, "#e2d0b6", 0, 0, 120, 92);
    // 窗簾和相框
    rect(ctx, "#b3cdd4", 4, 8, 18, 44);
    rect(ctx, "#9ab9c2", 4, 8, 3, 44);
    rect(ctx, "#6d5a48", 96, 16, 18, 22);
    rect(ctx, "#f6efe0", 98, 18, 14, 18);
    // 沙發
    rect(ctx, "#7c8fa8", 0, 92, 120, 58);
    rect(ctx, "#6a7c94", 0, 92, 120, 6);
    // 貓趴在她肩膀旁邊的沙發背上
    const cat = { c: "#d98b3f", W: "#ffffff", p: "#f2a6a0" };
    const rows = CAT_ROWS;
    for (let j = 0; j < rows.length; j++) {
      for (let i = 0; i < rows[j].length; i++) {
        const color = cat[rows[j][i] as keyof typeof cat];
        if (color) rect(ctx, color, 8 + i * 2, 66 + j * 2, 2, 2);
      }
    }
    rect(ctx, "#b56f2b", 10, 74, 2, 2);
    rect(ctx, "#b56f2b", 20, 74, 2, 2);
    // 尾巴
    rect(ctx, "#d98b3f", 22, 80, 8, 3);
    rect(ctx, "#b56f2b", 28, 78, 3, 3);
  },
  gym(ctx) {
    rect(ctx, "#3b3f4a", 0, 0, 120, 150);
    // 大鏡子和倒影
    rect(ctx, "#8ea4b0", 4, 6, 112, 70);
    dither(ctx, "#a4b8c2", 4, 6, 112, 70);
    rect(ctx, "#2b2e36", 58, 6, 2, 70);
    // 日光燈
    rect(ctx, "#f4f8ff", 14, 2, 36, 2);
    rect(ctx, "#f4f8ff", 70, 2, 36, 2);
    // 啞鈴架
    rect(ctx, "#1f2128", 0, 92, 120, 4);
    for (let i = 4; i < 118; i += 18) {
      rect(ctx, "#15161c", i, 86, 3, 6);
      rect(ctx, "#60656f", i + 3, 88, 6, 2);
      rect(ctx, "#15161c", i + 9, 86, 3, 6);
    }
    rect(ctx, "#2b2e36", 0, 112, 120, 38);
    rect(ctx, "#d9412f", 0, 112, 120, 2);
  },
  books(ctx) {
    rect(ctx, "#4a3526", 0, 0, 120, 150);
    const palette = ["#b5533c", "#476b8c", "#d2a64a", "#6d8a5f", "#8b5a7a", "#d9cfb8", "#3f4a5c"];
    for (let row = 0; row < 4; row++) {
      const y = 4 + row * 30;
      rect(ctx, "#2f2015", 0, y + 26, 120, 3);
      let x = 2;
      let n = row * 3;
      while (x < 116) {
        const w = 3 + ((n * 7) % 4);
        const h = 16 + ((n * 5) % 9);
        rect(ctx, palette[n % palette.length], x, y + 26 - h, w, h);
        rect(ctx, "#00000022", x + w - 1, y + 26 - h, 1, h);
        x += w + (n % 5 === 0 ? 3 : 1);
        n++;
      }
    }
  },
  ferris(ctx) {
    bands(ctx, ["#3a2f6b", "#6a3f80", "#b4557d", "#e88a68", "#f6bd6e"], 0, 0, 120, 100);
    // 摩天輪
    const wx = 88;
    const wy = 46;
    const spokes = 12;
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2;
      for (let r = 0; r < 30; r += 2) rect(ctx, "#2b2147", wx + Math.cos(a) * r, wy + Math.sin(a) * r);
      rect(ctx, i % 3 === 0 ? "#ffe08a" : "#ff9fb0", wx + Math.cos(a) * 31 - 2, wy + Math.sin(a) * 31 - 2, 4, 4);
    }
    rect(ctx, "#2b2147", wx - 8, wy, 2, 60);
    rect(ctx, "#2b2147", wx + 7, wy, 2, 60);
    // 城市剪影
    rect(ctx, "#2b2147", 0, 92, 120, 58);
    for (const [bx, bh] of [[0, 14], [14, 26], [32, 10], [44, 20], [62, 8]] as const) {
      rect(ctx, "#2b2147", bx, 92 - bh, 13, bh);
      rect(ctx, "#ffd76a", bx + 3, 96 - bh, 2, 2);
    }
  },
};

// ---------- 組合 ----------

export function drawGirl(ctx: Ctx, girl: Girl) {
  PHOTO_BG[girl.photoBg](ctx);
  blit(ctx, renderPortrait(girl));
}

/** 照片裡以臉為中心的正方形範圍：配對畫面和聊天頭像都從這裡裁 */
export function faceCrop(girl: Girl, size: number) {
  const hy = headTop(girl);
  return { x: Math.round((PHOTO_W - size) / 2), y: Math.max(0, hy + 24 - Math.round(size / 2)) };
}

const AVATAR_CROP = 72;

/** 聊天室用的小頭像：臉裁成 40×40，最近鄰縮放保留像素感 */
export function drawGirlAvatar(ctx: Ctx, girl: Girl, source: HTMLCanvasElement) {
  const { x, y } = faceCrop(girl, AVATAR_CROP);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, x, y, AVATAR_CROP, AVATAR_CROP, 0, 0, 40, 40);
}
