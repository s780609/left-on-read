/**
 * 女角的照片，邏輯尺寸 120×150。分層順序：
 * 照片背景 → 後髮 → 身體 → 服裝 → 脖子和頭 → 眼睛 → 嘴巴 → 前髮 → 配件。
 * 全部穿日常服裝。身材只改身高、肩寬和輪廓寬度，其他不做差異。
 */

import type { Girl } from "@/lib/left-on-read/girl";
import {
  BODY_TYPES,
  HAIR_COLORS,
  OUTFITS,
  SKINS,
  type AccessoryId,
  type EyesId,
  type HairId,
  type MouthId,
  type OutfitId,
  type PhotoBgId,
} from "@/lib/left-on-read/girlData";
import { bands, dither, rect, type Ctx } from "./draw";

export const PHOTO_W = 120;
export const PHOTO_H = 150;

const CX = 60;
const HEAD_W = 28;
const HEAD_H = 30;
const HEAD_X = CX - HEAD_W / 2;
const BASE_HEAD_Y = 44;
/** 放大後，一般身高的頭頂在照片的位置 */
const PERSON_TOP = 30;

type HairColor = (typeof HAIR_COLORS)[number];
type Skin = (typeof SKINS)[number];
type Outfit = (typeof OUTFITS)[number];

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

// ---------- 頭髮 ----------

interface HairLayer {
  back: (ctx: Ctx, c: HairColor, hy: number) => void;
  front: (ctx: Ctx, c: HairColor, hy: number) => void;
}

/** 頭頂的髮蓋，所有髮型共用 */
function cap(ctx: Ctx, c: HairColor, hy: number) {
  rect(ctx, c.base, HEAD_X, hy - 3, HEAD_W, 8);
  rect(ctx, c.base, HEAD_X - 1, hy, HEAD_W + 2, 6);
  rect(ctx, c.base, HEAD_X + 3, hy - 4, HEAD_W - 6, 1);
  rect(ctx, c.shine, HEAD_X + 6, hy - 2, 10, 1);
  rect(ctx, c.shine, HEAD_X + 18, hy - 1, 4, 1);
}

/** 中分的兩側瀏海 */
function parted(ctx: Ctx, c: HairColor, hy: number) {
  cap(ctx, c, hy);
  rect(ctx, c.base, HEAD_X, hy + 5, 10, 3);
  rect(ctx, c.base, HEAD_X, hy + 8, 6, 3);
  rect(ctx, c.base, HEAD_X, hy + 11, 3, 8);
  rect(ctx, c.base, HEAD_X + HEAD_W - 10, hy + 5, 10, 3);
  rect(ctx, c.base, HEAD_X + HEAD_W - 6, hy + 8, 6, 3);
  rect(ctx, c.base, HEAD_X + HEAD_W - 3, hy + 11, 3, 8);
}

const HAIR_LAYERS: Record<HairId, HairLayer> = {
  long: {
    back(ctx, c, hy) {
      rect(ctx, c.base, HEAD_X - 4, hy, HEAD_W + 8, 66);
      rect(ctx, c.shade, HEAD_X - 4, hy + 8, 2, 58);
      rect(ctx, c.shade, HEAD_X + HEAD_W + 2, hy + 8, 2, 58);
    },
    front: parted,
  },
  wavy: {
    back(ctx, c, hy) {
      rect(ctx, c.base, HEAD_X - 4, hy, HEAD_W + 8, 58);
      // 兩側一進一出，像大波浪
      for (let i = 0; i < 9; i++) {
        const off = i % 2 === 0 ? -8 : -6;
        const y = hy + 8 + i * 7;
        rect(ctx, c.base, HEAD_X + off, y, 8, 7);
        rect(ctx, c.base, HEAD_X + HEAD_W - off - 8, y, 8, 7);
        rect(ctx, i % 2 === 0 ? c.shine : c.shade, HEAD_X + off + 1, y + 2, 3, 2);
        rect(ctx, i % 2 === 0 ? c.shade : c.shine, HEAD_X + HEAD_W - off - 5, y + 2, 3, 2);
      }
    },
    front(ctx, c, hy) {
      cap(ctx, c, hy);
      // 旁分
      rect(ctx, c.base, HEAD_X, hy + 5, 15, 3);
      rect(ctx, c.base, HEAD_X, hy + 8, 9, 3);
      rect(ctx, c.base, HEAD_X, hy + 11, 4, 6);
      rect(ctx, c.base, HEAD_X + HEAD_W - 4, hy + 5, 4, 12);
    },
  },
  bob: {
    back(ctx, c, hy) {
      rect(ctx, c.base, HEAD_X - 5, hy - 1, HEAD_W + 10, 32);
      rect(ctx, c.shade, HEAD_X - 5, hy + 29, HEAD_W + 10, 2);
      rect(ctx, c.base, HEAD_X - 3, hy + 31, HEAD_W + 6, 1);
    },
    front(ctx, c, hy) {
      cap(ctx, c, hy);
      for (let i = 0; i < HEAD_W; i += 4) rect(ctx, c.base, HEAD_X + i, hy + 5, 4, 2 + ((i / 4) % 2));
      rect(ctx, c.base, HEAD_X - 1, hy + 5, 4, 20);
      rect(ctx, c.base, HEAD_X + HEAD_W - 3, hy + 5, 4, 20);
    },
  },
  pixie: {
    back(ctx, c, hy) {
      rect(ctx, c.base, HEAD_X - 2, hy - 1, HEAD_W + 4, 18);
      rect(ctx, c.shade, HEAD_X - 2, hy + 15, HEAD_W + 4, 2);
    },
    front(ctx, c, hy) {
      cap(ctx, c, hy);
      rect(ctx, c.base, HEAD_X + 8, hy + 5, 20, 3);
      rect(ctx, c.base, HEAD_X + 16, hy + 8, 12, 2);
      rect(ctx, c.base, HEAD_X - 1, hy + 5, 3, 8);
      rect(ctx, c.shade, HEAD_X + 8, hy + 7, 8, 1);
      // 頂上翹起來的幾撮
      rect(ctx, c.base, HEAD_X + 4, hy - 6, 3, 3);
      rect(ctx, c.base, HEAD_X + 12, hy - 7, 4, 4);
      rect(ctx, c.base, HEAD_X + 20, hy - 6, 3, 3);
    },
  },
  ponytail: {
    back(ctx, c, hy) {
      rect(ctx, c.base, HEAD_X - 1, hy - 1, HEAD_W + 2, 14);
      // 馬尾甩向一邊
      rect(ctx, c.base, HEAD_X + HEAD_W, hy + 2, 8, 7);
      rect(ctx, c.base, HEAD_X + HEAD_W + 4, hy + 8, 9, 14);
      rect(ctx, c.base, HEAD_X + HEAD_W + 5, hy + 22, 8, 12);
      rect(ctx, c.base, HEAD_X + HEAD_W + 6, hy + 34, 5, 8);
      rect(ctx, c.shine, HEAD_X + HEAD_W + 6, hy + 12, 2, 16);
      rect(ctx, "#d9534f", HEAD_X + HEAD_W - 1, hy + 2, 3, 6);
    },
    front(ctx, c, hy) {
      cap(ctx, c, hy);
      rect(ctx, c.base, HEAD_X - 1, hy + 5, 3, 6);
      rect(ctx, c.base, HEAD_X + HEAD_W - 2, hy + 5, 3, 6);
      rect(ctx, c.base, HEAD_X + 3, hy + 5, 6, 1);
    },
  },
  bun: {
    back(ctx, c, hy) {
      rect(ctx, c.base, HEAD_X - 1, hy - 1, HEAD_W + 2, 12);
      // 頭頂的丸子
      rect(ctx, c.base, CX - 7, hy - 14, 14, 11);
      rect(ctx, c.base, CX - 5, hy - 16, 10, 2);
      rect(ctx, c.shine, CX - 4, hy - 13, 5, 2);
      rect(ctx, c.shade, CX - 7, hy - 5, 14, 2);
    },
    front(ctx, c, hy) {
      cap(ctx, c, hy);
      rect(ctx, c.base, HEAD_X - 1, hy + 5, 2, 12);
      rect(ctx, c.base, HEAD_X + HEAD_W - 1, hy + 5, 2, 12);
    },
  },
  braid: {
    back(ctx, c, hy) {
      rect(ctx, c.base, HEAD_X - 2, hy, HEAD_W + 4, 20);
    },
    front(ctx, c, hy) {
      cap(ctx, c, hy);
      rect(ctx, c.base, HEAD_X, hy + 5, 12, 3);
      rect(ctx, c.base, HEAD_X, hy + 8, 6, 2);
      rect(ctx, c.base, HEAD_X - 1, hy + 8, 4, 16);
      rect(ctx, c.base, HEAD_X + HEAD_W - 3, hy + 5, 4, 12);
      // 垂在肩上的辮子
      for (let i = 0; i < 7; i++) {
        const y = hy + 22 + i * 6;
        const off = i % 2 === 0 ? 0 : 2;
        rect(ctx, c.base, HEAD_X - 5 + off, y, 7, 6);
        rect(ctx, c.shade, HEAD_X - 5 + off, y + 5, 7, 1);
        rect(ctx, c.shine, HEAD_X - 3 + off, y + 2, 2, 1);
      }
      rect(ctx, "#e6b84c", HEAD_X - 3, hy + 64, 5, 2);
    },
  },
  bangs: {
    back(ctx, c, hy) {
      rect(ctx, c.base, HEAD_X - 4, hy, HEAD_W + 8, 50);
      rect(ctx, c.shade, HEAD_X - 4, hy + 48, HEAD_W + 8, 2);
    },
    front(ctx, c, hy) {
      cap(ctx, c, hy);
      // 一刀切的齊瀏海
      rect(ctx, c.base, HEAD_X, hy + 5, HEAD_W, 7);
      rect(ctx, c.shade, HEAD_X, hy + 11, HEAD_W, 1);
      rect(ctx, c.shine, HEAD_X + 5, hy + 7, 8, 1);
      rect(ctx, c.base, HEAD_X - 1, hy + 5, 3, 22);
      rect(ctx, c.base, HEAD_X + HEAD_W - 2, hy + 5, 3, 22);
    },
  },
  wolf: {
    back(ctx, c, hy) {
      rect(ctx, c.base, HEAD_X - 4, hy, HEAD_W + 8, 24);
      // 下半段一撮一撮，長短不一
      for (const [dx, h] of [[-4, 40], [0, 34], [4, 44], [HEAD_W - 4, 44], [HEAD_W, 34], [HEAD_W + 2, 42]] as const) {
        rect(ctx, c.base, HEAD_X + dx, hy + 20, 4, h);
        rect(ctx, c.shade, HEAD_X + dx, hy + 20 + h - 2, 4, 2);
      }
    },
    front(ctx, c, hy) {
      cap(ctx, c, hy);
      for (const [dx, h] of [[0, 6], [5, 9], [10, 5], [14, 8], [19, 5], [24, 7]] as const) {
        rect(ctx, c.base, HEAD_X + dx, hy + 5, 4, h);
      }
      rect(ctx, c.base, HEAD_X - 1, hy + 5, 3, 16);
      rect(ctx, c.base, HEAD_X + HEAD_W - 2, hy + 5, 3, 16);
    },
  },
};

// ---------- 臉 ----------

const EYE_DARK = "#2a1c1c";

const EYE_DRAW: Record<EyesId, (ctx: Ctx, x: number, y: number, mirror: boolean) => void> = {
  round(ctx, x, y) {
    rect(ctx, "#ffffff", x, y, 5, 5);
    rect(ctx, EYE_DARK, x + 1, y, 4, 5);
    rect(ctx, "#ffffff", x + 1, y + 1, 1, 1);
  },
  almond(ctx, x, y, mirror) {
    rect(ctx, EYE_DARK, x, y + 1, 6, 1);
    rect(ctx, EYE_DARK, mirror ? x : x + 5, y, 1, 1);
    rect(ctx, "#ffffff", x + 1, y + 2, 4, 2);
    rect(ctx, EYE_DARK, x + 2, y + 2, 2, 2);
  },
  sleepy(ctx, x, y) {
    rect(ctx, EYE_DARK, x, y + 1, 6, 2);
    rect(ctx, "#ffffff", x + 1, y + 3, 4, 1);
    rect(ctx, EYE_DARK, x + 2, y + 3, 2, 1);
  },
  smile(ctx, x, y) {
    rect(ctx, EYE_DARK, x, y + 2, 1, 2);
    rect(ctx, EYE_DARK, x + 1, y + 1, 3, 1);
    rect(ctx, EYE_DARK, x + 4, y + 2, 1, 2);
  },
  lash(ctx, x, y, mirror) {
    rect(ctx, "#ffffff", x, y + 1, 5, 4);
    rect(ctx, EYE_DARK, x + 1, y + 1, 3, 4);
    rect(ctx, "#ffffff", x + 1, y + 2, 1, 1);
    rect(ctx, EYE_DARK, x, y, 5, 1);
    rect(ctx, EYE_DARK, mirror ? x - 1 : x + 5, y, 1, 2);
  },
};

const MOUTH_DRAW: Record<MouthId, (ctx: Ctx, x: number, y: number, skin: Skin) => void> = {
  smile(ctx, x, y) {
    rect(ctx, "#b4524d", x - 3, y, 1, 1);
    rect(ctx, "#b4524d", x - 2, y + 1, 5, 1);
    rect(ctx, "#b4524d", x + 3, y, 1, 1);
  },
  small(ctx, x, y) {
    rect(ctx, "#b4524d", x - 1, y, 3, 1);
  },
  grin(ctx, x, y) {
    rect(ctx, "#b4524d", x - 3, y, 7, 3);
    rect(ctx, "#ffffff", x - 2, y, 5, 1);
  },
  flat(ctx, x, y, skin) {
    rect(ctx, skin.shade, x - 3, y, 7, 1);
    rect(ctx, "#a4524d", x - 2, y, 5, 1);
  },
};

// ---------- 服裝 ----------

interface Frame {
  sy: number;
  shoulder: number;
  torso: number;
  skin: Skin;
}

const OUTFIT_DRAW: Record<OutfitId, (ctx: Ctx, o: Outfit, f: Frame) => void> = {
  tee(ctx, o, f) {
    rect(ctx, f.skin.base, CX - 7, f.sy, 14, 3);
    rect(ctx, o.trim, CX - 8, f.sy + 3, 16, 1);
    // 短袖口，下面露出手臂
    const armW = (f.shoulder - f.torso) / 2;
    if (armW >= 3) {
      rect(ctx, f.skin.base, CX - f.shoulder / 2, f.sy + 30, armW, 150);
      rect(ctx, f.skin.base, CX + f.torso / 2, f.sy + 30, armW, 150);
      rect(ctx, o.trim, CX - f.shoulder / 2, f.sy + 29, armW, 1);
      rect(ctx, o.trim, CX + f.torso / 2, f.sy + 29, armW, 1);
    }
  },
  shirt(ctx, o, f) {
    rect(ctx, f.skin.base, CX - 3, f.sy, 6, 4);
    rect(ctx, o.trim, CX - 8, f.sy, 6, 5);
    rect(ctx, o.trim, CX + 2, f.sy, 6, 5);
    rect(ctx, o.trim, CX, f.sy + 4, 1, 150);
    for (let y = f.sy + 10; y < 150; y += 9) rect(ctx, "#ffffff", CX, y, 1, 2);
    rect(ctx, "#6f96bd", CX - f.torso / 2 + 3, f.sy + 16, 7, 7);
  },
  sweater(ctx, o, f) {
    rect(ctx, o.trim, CX - 7, f.sy - 2, 14, 5);
    for (let y = f.sy + 8; y < 150; y += 5) dither(ctx, o.trim, CX - f.torso / 2, y, f.torso, 1);
  },
  hoodie(ctx, o, f) {
    rect(ctx, o.trim, CX - 12, f.sy - 3, 24, 7);
    rect(ctx, f.skin.base, CX - 4, f.sy - 1, 8, 4);
    rect(ctx, "#f0ece0", CX - 4, f.sy + 4, 1, 12);
    rect(ctx, "#f0ece0", CX + 3, f.sy + 4, 1, 12);
    rect(ctx, o.trim, CX - f.torso / 2 + 3, f.sy + 38, f.torso - 6, 1);
  },
  jacket(ctx, o, f) {
    rect(ctx, o.trim, CX - 7, f.sy, 14, 150);
    rect(ctx, f.skin.base, CX - 4, f.sy, 8, 3);
    rect(ctx, "#2a3448", CX - 9, f.sy, 3, 150);
    rect(ctx, "#2a3448", CX + 6, f.sy, 3, 150);
    rect(ctx, "#2a3448", CX - f.torso / 2 + 3, f.sy + 34, 8, 2);
    rect(ctx, "#2a3448", CX + f.torso / 2 - 11, f.sy + 34, 8, 2);
  },
  cardigan(ctx, o, f) {
    rect(ctx, o.trim, CX - 6, f.sy, 12, 150);
    rect(ctx, f.skin.base, CX - 4, f.sy, 8, 3);
    for (let y = f.sy + 10; y < 150; y += 10) rect(ctx, "#8a6f35", CX + 7, y, 2, 2);
    rect(ctx, "#b8974a", CX + 6, f.sy, 1, 150);
    rect(ctx, "#b8974a", CX - 7, f.sy, 1, 150);
  },
  overalls(ctx, o, f) {
    // 底下是淺色 T 恤，上面是吊帶和胸前口袋
    rect(ctx, o.trim, CX - f.shoulder / 2, f.sy + 2, f.shoulder, 150);
    rect(ctx, f.skin.base, CX - 6, f.sy, 12, 3);
    rect(ctx, o.base, CX - 11, f.sy + 2, 4, 20);
    rect(ctx, o.base, CX + 7, f.sy + 2, 4, 20);
    rect(ctx, o.base, CX - 13, f.sy + 20, 26, 150);
    rect(ctx, "#47688c", CX - 6, f.sy + 26, 12, 8);
    rect(ctx, "#e6c04f", CX - 10, f.sy + 21, 2, 2);
    rect(ctx, "#e6c04f", CX + 8, f.sy + 21, 2, 2);
  },
  blazer(ctx, o, f) {
    rect(ctx, o.trim, CX - 6, f.sy, 12, 34);
    rect(ctx, f.skin.base, CX - 3, f.sy, 6, 4);
    rect(ctx, "#1d1d26", CX - 9, f.sy, 4, 30);
    rect(ctx, "#1d1d26", CX + 5, f.sy, 4, 30);
    rect(ctx, "#1d1d26", CX, f.sy + 34, 1, 150);
    rect(ctx, "#70707f", CX + 2, f.sy + 40, 2, 2);
  },
};

// ---------- 配件 ----------

const ACCESSORY_DRAW: Record<AccessoryId, (ctx: Ctx, hy: number, f: Frame) => void> = {
  none() {},
  glasses(ctx, hy) {
    const y = hy + 13;
    const c = "#5a4634";
    for (const x of [HEAD_X + 4, HEAD_X + 16]) {
      rect(ctx, c, x, y, 9, 1);
      rect(ctx, c, x, y + 7, 9, 1);
      rect(ctx, c, x - 1, y + 1, 1, 6);
      rect(ctx, c, x + 9, y + 1, 1, 6);
    }
    rect(ctx, c, HEAD_X + 13, y + 3, 3, 1);
  },
  earrings(ctx, hy) {
    for (const x of [HEAD_X - 2, HEAD_X + HEAD_W + 1]) {
      rect(ctx, "#f2cf5b", x, hy + 21, 2, 2);
      rect(ctx, "#ffe89a", x, hy + 23, 2, 3);
      rect(ctx, "#d8a93a", x, hy + 26, 2, 1);
    }
  },
  headband(ctx, hy) {
    rect(ctx, "#d9605f", HEAD_X - 1, hy + 1, HEAD_W + 2, 3);
    rect(ctx, "#f08b86", HEAD_X - 1, hy + 1, HEAD_W + 2, 1);
    rect(ctx, "#d9605f", HEAD_X + HEAD_W - 6, hy - 3, 7, 4);
    rect(ctx, "#b8474a", HEAD_X + HEAD_W - 3, hy - 2, 2, 2);
  },
  cap(ctx, hy) {
    rect(ctx, "#31506e", HEAD_X - 1, hy - 7, HEAD_W + 2, 12);
    rect(ctx, "#31506e", HEAD_X + 2, hy - 9, HEAD_W - 4, 2);
    rect(ctx, "#223a52", HEAD_X - 4, hy + 4, HEAD_W + 8, 3);
    rect(ctx, "#f4f0d8", CX - 3, hy - 4, 6, 5);
    rect(ctx, "#31506e", CX - 1, hy - 3, 2, 3);
  },
  mask(ctx, hy, f) {
    // 口罩蓋住嘴巴，舉著手機自拍
    rect(ctx, "#f4f6f7", HEAD_X + 4, hy + 18, HEAD_W - 8, 11);
    rect(ctx, "#d7dde1", HEAD_X + 4, hy + 21, HEAD_W - 8, 1);
    rect(ctx, "#d7dde1", HEAD_X + 4, hy + 25, HEAD_W - 8, 1);
    rect(ctx, "#e6eaec", HEAD_X + 1, hy + 17, 3, 1);
    rect(ctx, "#e6eaec", HEAD_X + HEAD_W - 4, hy + 17, 3, 1);
    const px = CX + 16;
    rect(ctx, f.skin.base, px + 2, hy + 44, 7, 8);
    rect(ctx, "#1a1a22", px, hy + 28, 12, 20);
    rect(ctx, "#39394a", px + 1, hy + 29, 10, 18);
    rect(ctx, "#8a8aa0", px + 2, hy + 30, 3, 3);
  },
};

// ---------- 組合 ----------

export function drawGirl(ctx: Ctx, girl: Girl) {
  const skin = SKINS.find((s) => s.id === girl.face.skin) ?? SKINS[0];
  const color = HAIR_COLORS.find((c) => c.id === girl.face.hairColor) ?? HAIR_COLORS[0];
  const outfit = OUTFITS.find((o) => o.id === girl.outfit) ?? OUTFITS[0];
  const body = BODY_TYPES.find((b) => b.id === girl.body) ?? BODY_TYPES[2];
  const hair = HAIR_LAYERS[girl.face.hair];
  const hy = BASE_HEAD_Y - body.lift;
  const sy = hy + HEAD_H + 6;
  const frame: Frame = { sy, shoulder: body.shoulder, torso: body.torso, skin };

  PHOTO_BG[girl.photoBg](ctx);

  // 人物放大兩倍，照片才像自拍，身高差異也看得出來：頭頂落在 PERSON_TOP - 2 × lift
  ctx.save();
  ctx.translate(-CX, PERSON_TOP - 2 * BASE_HEAD_Y);
  ctx.scale(2, 2);
  hair.back(ctx, color, hy);

  // 身體：肩線、整片服裝、手臂的分界線
  const sx = CX - body.shoulder / 2;
  rect(ctx, outfit.base, sx + 4, sy, body.shoulder - 8, 3);
  rect(ctx, outfit.base, sx, sy + 3, body.shoulder, PHOTO_H - sy);
  const shade = "#00000030";
  const armLine = (body.shoulder - body.torso) / 2;
  if (armLine >= 2) {
    rect(ctx, shade, CX - body.torso / 2 - 1, sy + 12, 1, PHOTO_H - sy);
    rect(ctx, shade, CX + body.torso / 2, sy + 12, 1, PHOTO_H - sy);
  }
  OUTFIT_DRAW[girl.outfit](ctx, outfit, frame);

  // 脖子和頭
  rect(ctx, skin.shade, CX - 5, hy + HEAD_H - 2, 10, 9);
  rect(ctx, skin.base, HEAD_X + 2, hy, HEAD_W - 4, HEAD_H);
  rect(ctx, skin.base, HEAD_X, hy + 3, HEAD_W, HEAD_H - 8);
  rect(ctx, skin.shade, HEAD_X + 3, hy + HEAD_H, HEAD_W - 6, 1);
  rect(ctx, skin.base, HEAD_X - 1, hy + 15, 1, 5);
  rect(ctx, skin.base, HEAD_X + HEAD_W, hy + 15, 1, 5);

  // 眉毛、眼睛、腮紅、鼻子、嘴
  const ey = hy + 14;
  const lx = HEAD_X + 5;
  const rx = HEAD_X + HEAD_W - 11;
  rect(ctx, color.shade, lx, ey - 3, 6, 1);
  rect(ctx, color.shade, rx, ey - 3, 6, 1);
  EYE_DRAW[girl.face.eyes](ctx, lx, ey, true);
  EYE_DRAW[girl.face.eyes](ctx, rx, ey, false);
  dither(ctx, skin.blush, HEAD_X + 2, hy + 20, 6, 3);
  dither(ctx, skin.blush, HEAD_X + HEAD_W - 8, hy + 20, 6, 3);
  rect(ctx, skin.shade, CX, hy + 20, 2, 2);
  if (girl.face.accessory !== "mask") MOUTH_DRAW[girl.face.mouth](ctx, CX, hy + 24, skin);

  hair.front(ctx, color, hy);
  ACCESSORY_DRAW[girl.face.accessory](ctx, hy, frame);
  ctx.restore();
}

/** 聊天室用的小頭像：把照片的臉裁成 40×40 */
export function drawGirlAvatar(ctx: Ctx, girl: Girl, source: HTMLCanvasElement) {
  const body = BODY_TYPES.find((b) => b.id === girl.body) ?? BODY_TYPES[2];
  const top = PERSON_TOP - 2 * body.lift;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, CX - 40, Math.max(0, top - 10), 80, 80, 0, 0, 40, 40);
}
