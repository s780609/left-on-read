/**
 * 女角的半身像，邏輯尺寸 120×150，一個邏輯像素就是一個像素（不放大）。分層順序：
 * 後髮 → 脖子 → 身體和服裝 → 臉 → 五官 → 前髮 → 配件。
 * 每一層都由 Girl 的欄位獨立決定，算圖本身不用亂數：同樣的資料一定得到同樣的像素。
 * 全部穿日常服裝。身材只改身高、肩寬和輪廓寬度，其他不做差異；比例是成年人的比例。
 */

import type { Girl } from "../../../lib/left-on-read/girl.ts";
import {
  BODY_TYPES,
  EYE_COLORS,
  FACE_SHAPES,
  HAIR_COLORS,
  LIP_COLORS,
  OUTFITS,
  SKINS,
  type AccessoryId,
  type BrowId,
  type EyesId,
  type HairId,
  type MouthId,
  type OutfitId,
} from "../../../lib/left-on-read/girlData.ts";
import {
  createMask,
  createPicture,
  curve,
  depthToward,
  fillBlob,
  fillEllipse,
  fillPolygon,
  fillProfile,
  flipped,
  has,
  isEdge,
  mix,
  paint,
  put,
  rampOf,
  rgb,
  shifted,
  stamp,
  strokeLine,
  tint,
  type Mask,
  type Picture,
  type Point,
  type Ramp,
  type Rgb,
} from "./raster.ts";

export const PORTRAIT_W = 120;
export const PORTRAIT_H = 150;
const CX = 60;
/** 一般身高的頭頂 */
const BASE_HEAD_Y = 30;
/** 頭頂到肩頸交界 */
const NECK_BASE = 59;

export type PortraitLook = Pick<Girl, "face" | "body" | "outfit" | "outfitColor">;

const newMask = () => createMask(PORTRAIT_W, PORTRAIT_H);
const mirrorX = (x: number) => PORTRAIT_W - x;
const mirrorPoints = (points: readonly Point[]): Point[] => points.map(([x, y]) => [mirrorX(x), y]);
/** 右半邊的輪廓（由上到下）補成左右對稱的封閉形狀 */
const symmetric = (right: readonly Point[]): Point[] => [...right, ...mirrorPoints(right).reverse()];
const checker = (x: number, y: number) => (x + y) % 2 === 0;

/** 通用的柔和明暗：光從左上來，右下是暗面，交界用抖色過渡 */
function softShade(m: Mask, x: number, y: number, r: Ramp): Rgb {
  if (isEdge(m, x, y)) return r.line;
  const dark = depthToward(m, x, y, 1, 1, 6);
  if (dark <= 2) return r.deep;
  if (dark === 3) return checker(x, y) ? r.deep : r.shade;
  if (dark === 4) return r.shade;
  if (dark === 5) return checker(x, y) ? r.shade : r.base;
  const lit = depthToward(m, x, y, -1, -1, 3);
  if (lit <= 1) return r.light;
  if (lit === 2) return checker(x, y) ? r.light : r.base;
  return r.base;
}

// ---------- 頭髮 ----------

interface HairShape {
  back: Mask;
  front: Mask;
  /** 髮絲的走向，畫在遮罩裡面 */
  backLines: readonly (readonly Point[])[];
  frontLines: readonly (readonly Point[])[];
  /** 髮圈、髮尾綁帶：畫在頭髮上的小東西 */
  ties?: readonly { x: number; y: number; w: number; h: number }[];
}

/** 頭頂的髮量：half 是兩側最寬的半寬，lower 是側邊蓋到離頭頂幾列 */
function crown(m: Mask, hy: number, half = 28, lower = 34) {
  fillBlob(
    m,
    symmetric([
      [60, hy - 8],
      [72, hy - 7],
      [CX + half - 6, hy - 2],
      [CX + half - 1, hy + 8],
      [CX + half, hy + 20],
      [CX + half - 1, hy + lower],
      [64, hy + lower + 1],
    ])
  );
}

/** 中分的臉部開口 */
function partedWindow(m: Mask, hy: number, cheek = 41, apex = 6) {
  const right: Point[] = [
    [60, hy + apex],
    [68, hy + apex + 4],
    [75, hy + apex + 11],
    [mirrorX(cheek), hy + apex + 22],
    [mirrorX(cheek) + 1, hy + apex + 34],
  ];
  fillPolygon(m, [...curve(right), [mirrorX(cheek) + 1, hy + 70], [cheek - 1, hy + 70], ...curve(mirrorPoints(right)).reverse()], 0);
}

/** 旁分的臉部開口：髮線在右邊（畫面左），瀏海斜斜掃過額頭 */
function sweptWindow(m: Mask, hy: number, cheek = 40) {
  const top = curve([
    [cheek, hy + 34],
    [cheek + 1, hy + 24],
    [44, hy + 14],
    [50, hy + 8],
    [58, hy + 12],
    [68, hy + 18],
    [76, hy + 25],
    [79, hy + 36],
  ]);
  fillPolygon(m, [...top, [mirrorX(cheek), hy + 70], [cheek, hy + 70]], 0);
}

/** 瀏海的鋸齒下緣：xs 是分段，ys 是每段的髮尾高度 */
function fringeWindow(m: Mask, hy: number, depths: readonly number[], cheek = 40) {
  const left = cheek;
  const right = mirrorX(cheek);
  const step = (right - left) / (depths.length - 1);
  const edge: Point[] = depths.map((d, i) => [left + i * step, hy + d]);
  fillPolygon(m, [[left, hy + 70], ...edge, [right, hy + 70]], 0);
}

function bothSides(m: Mask, points: readonly Point[]) {
  fillBlob(m, points);
  fillBlob(m, mirrorPoints(points));
}

/** 兩側一進一出的波浪邊，回傳一串輪廓點 */
function waveEdge(x: number, fromY: number, toY: number, amp: number, period: number, phase = 0): Point[] {
  const out: Point[] = [];
  for (let y = fromY; y <= toY; y += 3) {
    const grow = Math.min(1, (y - fromY) / 18);
    out.push([x + (Math.sin((y - fromY) / period + phase) - Math.sin(phase)) * amp * grow, y]);
  }
  return out;
}

const FAN_TOP = (hy: number): Point => [60, hy - 7];

/** 髮絲從髮旋附近散開，起點錯開、中段往外鼓，才不會像帳篷骨架 */
function fan(origin: Point, targets: readonly Point[]): Point[][] {
  return targets.map((t, i) => {
    const dx = t[0] - origin[0];
    const dy = t[1] - origin[1];
    // 長短錯開，不然起點排成一列會像梳子
    const start: Point = [origin[0] + dx * 0.42, origin[1] + dy * (0.3 + ((i * 3) % 4) * 0.1)];
    const middle: Point = [origin[0] + dx * 0.78, origin[1] + dy * 0.52];
    return [start, middle, [t[0], t[1] - 1]];
  });
}

const HAIR_SHAPES: Record<HairId, (hy: number) => HairShape> = {
  long(hy) {
    const back = newMask();
    fillBlob(back, symmetric([[60, hy - 7], [76, hy - 5], [86, hy + 8], [90, hy + 30], [91, hy + 66], [90, hy + 96], [80, hy + 104], [62, hy + 106]]));
    const front = newMask();
    crown(front, hy);
    partedWindow(front, hy);
    bothSides(front, [[35, hy + 18], [31, hy + 42], [28, hy + 66], [30, hy + 84], [37, hy + 96], [43, hy + 82], [43, hy + 56], [42, hy + 28]]);
    return {
      back,
      front,
      backLines: [[[34, hy + 40], [32, hy + 100]], [[86, hy + 40], [88, hy + 100]], [[80, hy + 40], [82, hy + 96]]],
      frontLines: [
        ...fan([60, hy + 5], [[40, hy + 26], [45, hy + 14], [52, hy + 9], [80, hy + 26], [75, hy + 14], [68, hy + 9]]),
        [[37, hy + 30], [35, hy + 60], [36, hy + 86]],
        [[83, hy + 30], [85, hy + 60], [84, hy + 86]],
      ],
    };
  },
  wavy(hy) {
    const back = newMask();
    const right = waveEdge(90, hy + 8, hy + 96, 4, 7);
    fillPolygon(back, [[60, hy - 7], ...curve([[76, hy - 5], [86, hy + 2], ...right]), [62, hy + 104], ...curve(mirrorPoints([[76, hy - 5], [86, hy + 2], ...waveEdge(90, hy + 8, hy + 96, 4, 7, 1.5)])).reverse()]);
    const front = newMask();
    crown(front, hy);
    sweptWindow(front, hy);
    const wave = (x: number, phase: number): Point[] => waveEdge(x, hy + 22, hy + 82, 2.5, 6, phase);
    fillPolygon(front, [...curve(wave(31, 0)), [39, hy + 90], ...curve(wave(42, 0.8)).reverse()]);
    fillPolygon(front, [...curve(wave(89, 1.6)), [81, hy + 90], ...curve(wave(78, 2.4)).reverse()]);
    return {
      back,
      front,
      backLines: [waveEdge(84, hy + 26, hy + 92, 3, 7, 1), waveEdge(36, hy + 26, hy + 92, 3, 7, 2)],
      frontLines: [
        ...fan([50, hy + 6], [[42, hy + 16], [40, hy + 26], [62, hy + 12], [72, hy + 20], [80, hy + 30]]),
        waveEdge(36, hy + 28, hy + 80, 2.5, 6, 0.4),
        waveEdge(84, hy + 28, hy + 80, 2.5, 6, 2),
      ],
    };
  },
  bob(hy) {
    const back = newMask();
    fillBlob(back, symmetric([[60, hy - 7], [76, hy - 5], [87, hy + 8], [90, hy + 28], [90, hy + 46], [84, hy + 57], [72, hy + 60], [62, hy + 60]]));
    const front = newMask();
    crown(front, hy, 29);
    fringeWindow(front, hy, [24, 19, 20, 18, 21, 19, 20, 18, 21, 19, 20, 24]);
    bothSides(front, [[35, hy + 14], [31, hy + 34], [31, hy + 50], [37, hy + 60], [44, hy + 57], [43, hy + 40], [42, hy + 22]]);
    // 空氣瀏海：露出一點額頭
    for (const x of [50, 63]) fillPolygon(front, [[x, hy + 22], [x + 1, hy + 11], [x + 3, hy + 22]], 0);
    return {
      back,
      front,
      backLines: [[[86, hy + 34], [85, hy + 56]], [[34, hy + 34], [35, hy + 56]]],
      frontLines: [
        ...fan(FAN_TOP(hy), [[44, hy + 20], [50, hy + 20], [56, hy + 19], [64, hy + 19], [70, hy + 20], [76, hy + 20]]),
        [[37, hy + 28], [36, hy + 44], [39, hy + 56]],
        [[83, hy + 28], [84, hy + 44], [81, hy + 56]],
      ],
    };
  },
  pixie(hy) {
    const back = newMask();
    fillBlob(back, symmetric([[60, hy - 8], [74, hy - 7], [83, hy], [87, hy + 12], [86, hy + 28], [80, hy + 42], [66, hy + 46]]));
    const front = newMask();
    crown(front, hy, 25, 20);
    sweptWindow(front, hy, 37);
    bothSides(front, [[37, hy + 12], [34, hy + 24], [35, hy + 38], [39, hy + 42], [40, hy + 26]]);
    // 頭頂翹起來的幾撮
    for (const [x, y] of [[44, -8], [55, -11], [68, -10], [78, -6]] as const) {
      fillPolygon(front, [[x - 4, hy + y + 5], [x + 2, hy + y - 2], [x + 5, hy + y + 6]]);
    }
    return {
      back,
      front,
      backLines: [],
      frontLines: [
        ...fan([50, hy + 4], [[39, hy + 14], [44, hy + 10], [60, hy + 11], [70, hy + 18], [78, hy + 26]]),
        [[36, hy + 18], [37, hy + 36]],
        [[84, hy + 18], [83, hy + 36]],
      ],
    };
  },
  ponytail(hy) {
    const back = newMask();
    crown(back, hy, 25, 20);
    // 馬尾甩向畫面右邊，hairSide 會整個鏡射
    fillBlob(back, [[82, hy + 2], [94, hy + 6], [103, hy + 26], [107, hy + 52], [102, hy + 80], [94, hy + 96], [91, hy + 72], [93, hy + 46], [88, hy + 22]]);
    const front = newMask();
    crown(front, hy, 25, 20);
    partedWindow(front, hy, 39, 5);
    bothSides(front, [[38, hy + 14], [35, hy + 26], [36, hy + 40], [39, hy + 44], [40, hy + 26]]);
    return {
      back,
      front,
      backLines: [
        [[90, hy + 10], [98, hy + 34], [99, hy + 66]],
        [[93, hy + 12], [103, hy + 40], [100, hy + 76]],
        [[88, hy + 14], [94, hy + 40], [95, hy + 80]],
      ],
      frontLines: fan([60, hy + 4], [[40, hy + 22], [46, hy + 12], [53, hy + 7], [80, hy + 22], [74, hy + 12], [67, hy + 7]]),
      ties: [{ x: 84, y: hy + 1, w: 5, h: 6 }],
    };
  },
  bun(hy) {
    const back = newMask();
    crown(back, hy, 25, 20);
    fillEllipse(back, 60, hy - 10, 12, 10);
    const front = newMask();
    crown(front, hy, 25, 20);
    partedWindow(front, hy, 39, 5);
    bothSides(front, [[38, hy + 14], [36, hy + 26], [37, hy + 44], [39, hy + 48], [40, hy + 28]]);
    return {
      back,
      front,
      backLines: [
        curve([[52, hy - 12], [58, hy - 17], [66, hy - 14], [68, hy - 8]]),
        curve([[54, hy - 7], [60, hy - 12], [65, hy - 9]]),
      ],
      frontLines: fan([60, hy + 4], [[40, hy + 22], [46, hy + 12], [53, hy + 7], [80, hy + 22], [74, hy + 12], [67, hy + 7], [60, hy - 7]]),
      ties: [{ x: 54, y: hy - 3, w: 12, h: 2 }],
    };
  },
  braid(hy) {
    const back = newMask();
    fillBlob(back, symmetric([[60, hy - 7], [76, hy - 5], [85, hy + 8], [88, hy + 26], [84, hy + 42], [70, hy + 50], [62, hy + 50]]));
    const front = newMask();
    crown(front, hy);
    sweptWindow(front, hy);
    // 兩邊的髮束收到畫面左下的辮子
    fillBlob(front, [[35, hy + 18], [32, hy + 36], [33, hy + 48], [40, hy + 54], [43, hy + 42], [41, hy + 26]]);
    fillBlob(front, [[85, hy + 18], [87, hy + 32], [83, hy + 44], [78, hy + 42], [79, hy + 26]]);
    const lines: Point[][] = [...fan([50, hy + 6], [[41, hy + 18], [40, hy + 30], [62, hy + 12], [72, hy + 20], [80, hy + 30]])];
    for (let i = 0; i < 7; i++) {
      const y = hy + 50 + i * 6;
      const x = 38 - i * 1.2 + (i % 2 === 0 ? -1.2 : 1.2);
      fillEllipse(front, x, y, 6, 4.2);
      lines.push(i % 2 === 0 ? [[x - 5, y - 2], [x + 4, y + 3]] : [[x + 5, y - 2], [x - 4, y + 3]]);
    }
    fillPolygon(front, [[26, hy + 90], [30, hy + 98], [34, hy + 90]]);
    return {
      back,
      front,
      backLines: [],
      frontLines: lines,
      ties: [{ x: 27, y: hy + 87, w: 6, h: 3 }],
    };
  },
  bangs(hy) {
    const back = newMask();
    fillBlob(back, symmetric([[60, hy - 7], [76, hy - 5], [87, hy + 8], [90, hy + 30], [90, hy + 62], [89, hy + 86], [76, hy + 90], [62, hy + 90]]));
    const front = newMask();
    crown(front, hy, 29);
    fringeWindow(front, hy, [25, 21, 21, 21, 22, 21, 21, 22, 21, 21, 21, 25]);
    bothSides(front, [[35, hy + 14], [32, hy + 40], [32, hy + 64], [35, hy + 76], [41, hy + 76], [42, hy + 50], [42, hy + 22]]);
    return {
      back,
      front,
      backLines: [[[86, hy + 36], [86, hy + 86]], [[34, hy + 36], [34, hy + 86]]],
      frontLines: [
        ...fan(FAN_TOP(hy), [[42, hy + 21], [46, hy + 21], [50, hy + 21], [54, hy + 21], [58, hy + 21], [62, hy + 21], [66, hy + 21], [70, hy + 21], [74, hy + 21], [78, hy + 21]]),
        [[37, hy + 30], [37, hy + 72]],
        [[83, hy + 30], [83, hy + 72]],
      ],
    };
  },
  wolf(hy) {
    const back = newMask();
    fillPolygon(back, [
      ...curve(symmetric([[60, hy - 7], [76, hy - 5], [86, hy + 6], [90, hy + 24]]).slice(0, 4)),
      [92, hy + 44], [87, hy + 50], [91, hy + 70], [84, hy + 66], [85, hy + 86], [76, hy + 72], [70, hy + 76],
      [64, hy + 66], [56, hy + 66], [50, hy + 76], [44, hy + 72], [35, hy + 86], [36, hy + 66], [29, hy + 70], [33, hy + 50], [28, hy + 44],
      ...curve(mirrorPoints([[60, hy - 7], [76, hy - 5], [86, hy + 6], [90, hy + 24]])).reverse(),
    ]);
    const front = newMask();
    crown(front, hy, 29);
    fringeWindow(front, hy, [30, 17, 23, 16, 24, 15, 22, 17, 25, 16, 22, 30]);
    bothSides(front, [[35, hy + 16], [31, hy + 34], [30, hy + 56], [34, hy + 72], [38, hy + 54], [41, hy + 60], [42, hy + 36], [41, hy + 20]]);
    return {
      back,
      front,
      backLines: [[[86, hy + 34], [88, hy + 64]], [[34, hy + 34], [32, hy + 64]], [[80, hy + 44], [78, hy + 68]], [[40, hy + 44], [42, hy + 68]]],
      frontLines: [
        ...fan(FAN_TOP(hy), [[42, hy + 18], [48, hy + 20], [54, hy + 16], [60, hy + 20], [66, hy + 18], [72, hy + 20], [78, hy + 18]]),
        [[36, hy + 30], [34, hy + 62]],
        [[84, hy + 30], [86, hy + 62]],
      ],
    };
  },
  halfup(hy) {
    const back = newMask();
    fillBlob(back, symmetric([[60, hy - 7], [76, hy - 5], [86, hy + 8], [89, hy + 30], [91, hy + 66], [90, hy + 90], [78, hy + 98], [62, hy + 98]]));
    fillEllipse(back, 60, hy - 7, 8, 5);
    const front = newMask();
    crown(front, hy, 28, 26);
    partedWindow(front, hy, 38, 4);
    // 只留兩小撮修飾臉型
    bothSides(front, [[38, hy + 14], [36, hy + 28], [37, hy + 48], [39, hy + 58], [41, hy + 44], [41, hy + 24]]);
    bothSides(front, [[35, hy + 22], [31, hy + 50], [30, hy + 72], [33, hy + 86], [38, hy + 92], [41, hy + 74], [41, hy + 52], [39, hy + 30]]);
    return {
      back,
      front,
      backLines: [[[86, hy + 40], [87, hy + 92]], [[34, hy + 40], [33, hy + 92]], [[80, hy + 44], [82, hy + 90]]],
      frontLines: [
        ...fan([60, hy + 3], [[40, hy + 22], [46, hy + 10], [53, hy + 5], [80, hy + 22], [74, hy + 10], [67, hy + 5]]),
        ...fan(FAN_TOP(hy), [[42, hy + 6], [78, hy + 6]]),
        [[35, hy + 34], [34, hy + 62], [36, hy + 84]],
        [[85, hy + 34], [86, hy + 62], [84, hy + 84]],
      ],
      ties: [{ x: 55, y: hy - 6, w: 10, h: 2 }],
    };
  },
  lob(hy) {
    const back = newMask();
    const right = waveEdge(89, hy + 8, hy + 74, 3, 6);
    const shape: Point[] = [[76, hy - 5], [85, hy + 2], ...right];
    fillPolygon(back, [[60, hy - 7], ...curve(shape), [62, hy + 80], ...curve(mirrorPoints(shape)).reverse()]);
    const front = newMask();
    crown(front, hy, 29);
    partedWindow(front, hy, 41, 8);
    const wave = (x: number, phase: number): Point[] => waveEdge(x, hy + 24, hy + 66, 2.5, 5, phase);
    fillPolygon(front, [...curve(wave(32, 0)), [38, hy + 74], ...curve(wave(43, 0.7)).reverse()]);
    fillPolygon(front, [...curve(wave(88, 3.1)), [82, hy + 74], ...curve(wave(77, 3.8)).reverse()]);
    return {
      back,
      front,
      backLines: [waveEdge(84, hy + 24, hy + 72, 2.5, 6, 1), waveEdge(36, hy + 24, hy + 72, 2.5, 6, 2)],
      frontLines: [
        ...fan([60, hy + 7], [[41, hy + 26], [46, hy + 16], [53, hy + 11], [79, hy + 26], [74, hy + 16], [67, hy + 11]]),
        waveEdge(37, hy + 28, hy + 66, 2.5, 5, 0.3),
        waveEdge(83, hy + 28, hy + 66, 2.5, 5, 3.4),
      ],
    };
  },
};

interface HairTone {
  line: Rgb;
  deep: Rgb;
  shade: Rgb;
  base: Rgb;
  light: Rgb;
  shine: Rgb;
}

function hairTone(color: (typeof HAIR_COLORS)[number]): HairTone {
  const shade = rgb(color.shade);
  const base = rgb(color.base);
  const shine = rgb(color.shine);
  return {
    line: mix(shade, rgb("#120a1c"), 0.55),
    deep: mix(shade, rgb("#120a1c"), 0.2),
    shade,
    base,
    light: mix(base, shine, 0.55),
    shine,
  };
}

const RING_PATTERN = [2, 4, 1, 3, 5, 2, 1, 4, 2, 3, 1, 5, 2];

function paintHairBack(p: Picture, m: Mask, t: HairTone, lines: HairShape["backLines"]) {
  paint(p, m, (x, y) => {
    if (isEdge(m, x, y)) return t.line;
    const inner = mix(t.shade, t.base, 0.3);
    const dark = depthToward(m, x, y, 1, 0, 4);
    if (dark <= 1) return t.deep;
    if (dark === 2 && checker(x, y)) return t.deep;
    return inner;
  });
  for (const line of lines) strokeLine(p, line, t.deep, m);
}

function paintHairFront(p: Picture, m: Mask, t: HairTone, lines: HairShape["frontLines"], hy: number) {
  paint(p, m, (x, y) => {
    if (isEdge(m, x, y)) return t.line;
    const dark = depthToward(m, x, y, 1, 1, 4);
    if (dark <= 1) return t.shade;
    if (dark === 2) return checker(x, y) ? t.shade : t.base;
    return t.base;
  });
  lines.forEach((line, i) => {
    strokeLine(p, line, t.shade, m);
    // 隔一條在旁邊補一道亮線，髮束才有厚度
    if (i % 2 === 0) strokeLine(p, line.map(([x, y]): Point => [x + 1, y]), t.light, m);
  });
  // 天使光環：順著頭型的一圈鋸齒高光，落在頭頂和額頭之間
  for (let x = 37; x < 84; x++) {
    const nx = (x - 56) / 28;
    const y0 = Math.round(hy + 1 + nx * nx * 8);
    const len = RING_PATTERN[x % RING_PATTERN.length];
    for (let k = 0; k < len; k++) {
      const y = y0 + k;
      if (!has(m, x, y) || isEdge(m, x, y)) continue;
      put(p, x, y, k === 0 && len > 2 && Math.abs(nx) < 0.55 ? t.shine : t.light);
    }
  }
}

function hairTies(p: Picture, shape: HairShape, tie: Rgb) {
  for (const { x, y, w, h } of shape.ties ?? []) {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) put(p, x + i, y + j, j === 0 ? mix(tie, 0xffffff, 0.25) : tie);
    }
  }
}

function flipPicture(p: Picture): Picture {
  const out = createPicture(p.w, p.h);
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) out.d[y * p.w + (p.w - 1 - x)] = p.d[y * p.w + x];
  }
  return out;
}

function overlay(into: Picture, top: Picture) {
  for (let i = 0; i < into.d.length; i++) if (top.d[i] >= 0) into.d[i] = top.d[i];
}

// ---------- 五官 ----------

/**
 * 左眼的點陣（畫面左），外眼角在左，寬 12。右眼左右鏡射，高光另外畫，兩眼才會朝同一個方向反光。
 * L 上睫毛 l 下眼線 w 眼白 s 眼白陰影 D 虹膜暗部 M 虹膜中間 H 虹膜亮部 P 瞳孔
 */
const EYE_ROWS: Record<EyesId, readonly string[]> = {
  round: [
    "....LLLLLLL..",
    "..LLLLLLLLLL.",
    "LLLsDDDDDDsL.",
    "L.wDDDPPPDDw.",
    "..wDDPPPPDDw.",
    "..wDMPPPPMDw.",
    "..wDMMPPMMDw.",
    "..wwMMHHMMww.",
    "...wwMHHMww..",
    "....wwwwww...",
    ".....llll....",
  ],
  almond: [
    "LL...LLLLLL..",
    ".LLLLLLLLLLL.",
    "..LLsDDDDDDsL",
    "..wDDDPPPDDw.",
    "..wDDPPPPDDw.",
    "..wDMPPPPMDw.",
    "...wMMHHMMw..",
    "....wwwwww...",
    "......lll....",
  ],
  sleepy: [
    ".............",
    ".............",
    ".LLLLLLLLLLL.",
    "LLLLLLLLLLLLL",
    "..sDDDPPPDDs.",
    "..wDDPPPPDDw.",
    "..wDMPPPPMDw.",
    "..wwMMHHMMww.",
    "...wwMHHMww..",
    ".....llll....",
  ],
  smile: [
    ".............",
    ".............",
    ".............",
    "....LLLLL....",
    "..LLLLLLLLL..",
    ".LLL.....LLL.",
    "LL.........L.",
    "L............",
  ],
  lash: [
    "L...LLLLLLL..",
    "LLLLLLLLLLLL.",
    ".LLLsDDDDDDsL",
    "..wDDDPPPDDw.",
    "..wDDPPPPDDw.",
    "..wDMPPPPMDw.",
    "..wDMMPPMMDw.",
    "..wwMMHHMMww.",
    "...wwMHHMww..",
    "....wwwwww...",
    "....lllllll..",
  ],
  droopy: [
    ".....LLLLLLL.",
    "...LLLLLLLLLL",
    "..LLsDDDDDDsL",
    ".LwDDDPPPDDw.",
    "LLwDDPPPPDDw.",
    "L.wDMPPPPMDw.",
    "..wDMMPPMMDw.",
    "...wMMHHMMww.",
    "....wMHHMww..",
    ".....wwwww...",
    ".....llll....",
  ],
};

const EYE_X = 41;
const EYE_W = 13;
const LASH = rgb("#2a1a20");

function drawEyes(p: Picture, look: PortraitLook, hy: number, skinLine: Rgb, skinShade: Rgb) {
  const eyes = look.face.eyes;
  const color = EYE_COLORS.find((c) => c.id === look.face.eyeColor) ?? EYE_COLORS[0];
  const rows = EYE_ROWS[eyes];
  const palette: Record<string, Rgb> = {
    L: LASH,
    l: mix(skinLine, LASH, 0.25),
    w: rgb("#ffffff"),
    s: rgb("#d4d6e4"),
    D: rgb(color.deep),
    M: rgb(color.mid),
    H: rgb(color.light),
    P: mix(rgb(color.deep), 0x000000, 0.45),
  };
  const y = hy + 25;
  const rightX = PORTRAIT_W - EYE_X - EYE_W;
  stamp(p, rows, palette, EYE_X, y, false);
  stamp(p, rows, palette, rightX, y, true);
  // 雙眼皮的摺痕
  if (eyes !== "smile" && eyes !== "sleepy") {
    for (let i = 4; i < 10; i++) {
      put(p, EYE_X + i, y - 2, skinShade);
      put(p, PORTRAIT_W - 1 - EYE_X - i, y - 2, skinShade);
    }
  }
  // 高光：兩眼都在左上。鏡射後虹膜的左緣差一格
  if (eyes !== "smile") {
    const row = eyes === "sleepy" ? 4 : 3;
    const soft = mix(0xffffff, rgb(color.light), 0.35);
    for (const irisLeft of [EYE_X + 3, rightX + 2]) {
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) if (i + j < 4) put(p, irisLeft + 1 + i, y + row + j, 0xffffff);
      put(p, irisLeft + 6, y + row + 3, soft);
      put(p, irisLeft + 6, y + row + 2, soft);
    }
  }
}

const BROW_POINTS: Record<BrowId, (hy: number) => Point[]> = {
  soft: (hy) => [[41, hy + 20], [47, hy + 18], [53, hy + 19]],
  arched: (hy) => [[40, hy + 21], [46, hy + 17], [53, hy + 19]],
  flat: (hy) => [[41, hy + 19], [48, hy + 19], [53, hy + 19]],
  worried: (hy) => [[41, hy + 21], [47, hy + 19], [53, hy + 17]],
};

function drawBrows(p: Picture, brow: BrowId, hy: number, color: Rgb) {
  const points = BROW_POINTS[brow](hy);
  strokeLine(p, points, color);
  strokeLine(p, mirrorPoints(points), color);
}

type Mouth = (p: Picture, y: number, lip: Rgb, line: Rgb) => void;

const hline = (p: Picture, x: number, y: number, w: number, color: Rgb) => {
  for (let i = 0; i < w; i++) put(p, x + i, y, color);
};

const MOUTH_DRAW: Record<MouthId, Mouth> = {
  smile(p, y, lip, line) {
    put(p, 55, y, line);
    hline(p, 56, y + 1, 8, line);
    put(p, 64, y, line);
    hline(p, 58, y + 2, 4, mix(lip, 0xffffff, 0.2));
  },
  small(p, y, lip, line) {
    hline(p, 58, y, 4, line);
    hline(p, 58, y + 1, 4, lip);
  },
  grin(p, y, lip, line) {
    hline(p, 55, y, 10, line);
    hline(p, 56, y + 1, 8, 0xffffff);
    hline(p, 56, y + 2, 8, 0xffffff);
    put(p, 55, y + 1, line);
    put(p, 64, y + 1, line);
    hline(p, 56, y + 3, 8, line);
    hline(p, 58, y + 4, 4, lip);
  },
  flat(p, y, lip, line) {
    hline(p, 56, y, 8, line);
    hline(p, 58, y + 1, 4, mix(lip, 0xffffff, 0.3));
  },
  pout(p, y, lip, line) {
    hline(p, 58, y - 1, 4, lip);
    hline(p, 57, y, 6, line);
    hline(p, 57, y + 1, 6, lip);
    hline(p, 58, y + 2, 4, mix(lip, 0xffffff, 0.35));
  },
  laugh(p, y, lip, line) {
    hline(p, 55, y - 1, 10, line);
    hline(p, 55, y, 10, rgb("#6e2230"));
    hline(p, 56, y, 8, 0xffffff);
    hline(p, 55, y + 1, 10, rgb("#6e2230"));
    hline(p, 56, y + 2, 8, rgb("#6e2230"));
    hline(p, 57, y + 3, 6, lip);
    hline(p, 58, y + 4, 4, line);
    put(p, 54, y, line);
    put(p, 65, y, line);
    put(p, 55, y + 2, line);
    put(p, 64, y + 2, line);
    put(p, 56, y + 3, line);
    put(p, 63, y + 3, line);
  },
  smirk(p, y, lip, line) {
    hline(p, 56, y + 1, 7, line);
    put(p, 63, y, line);
    put(p, 64, y - 1, line);
    hline(p, 58, y + 2, 3, lip);
  },
};

// ---------- 服裝 ----------

interface OutfitFrame {
  ny: number;
  /** 肩膀、軀幹的半寬 */
  s: number;
  t: number;
  body: Mask;
  main: Ramp;
  trim: Ramp;
  skin: Ramp;
  stripe: Rgb | null;
}

/** 領口露出的皮膚：往下一點點有衣領的投影 */
function neckline(p: Picture, f: OutfitFrame, points: readonly Point[]) {
  const m = newMask();
  fillPolygon(m, points);
  paint(p, m, (x, y) => {
    if (y <= f.ny + 1) return f.skin.shade;
    return has(m, x, y - 2) ? f.skin.base : f.skin.shade;
  });
}

function shadedPart(p: Picture, m: Mask, r: Ramp) {
  paint(p, m, (x, y) => softShade(m, x, y, r));
}

/** 領子這種薄薄一片的東西：只留細邊和底部一條陰影，整片打陰影會變成一顆球 */
/** 外套裡面的內搭：夾在中間，不用自己的立體感，只有靠外套那側暗一條 */
function innerLayer(p: Picture, f: OutfitFrame, points: readonly Point[]) {
  const m = newMask();
  fillPolygon(m, points);
  paint(p, m, (x, y) => {
    if (x > CX + 4 || !has(m, x + 3, y)) return f.trim.shade;
    return has(m, x, y - 3) ? f.trim.base : f.trim.shade;
  });
}

function flatPart(p: Picture, m: Mask, r: Ramp) {
  paint(p, m, (x, y) => {
    if (isEdge(m, x, y)) return r.deep;
    return has(m, x, y + 2) ? r.base : r.shade;
  });
}

/** 手臂和軀幹的分界、腋下的皺摺 */
function armLines(p: Picture, f: OutfitFrame, color: Rgb) {
  for (const side of [-1, 1]) {
    const x0 = CX + side * f.t;
    const armpit = f.ny + 22;
    strokeLine(p, [[x0, armpit], [x0 + side * 0.5, f.ny + 50], [x0 + side, PORTRAIT_H]], color, f.body);
  }
}

function stripes(p: Picture, f: OutfitFrame, color: Rgb, gap: number, from: number) {
  for (let y = from; y < PORTRAIT_H; y += gap) {
    for (let x = 0; x < PORTRAIT_W; x++) {
      if (has(f.body, x, y) && !isEdge(f.body, x, y)) put(p, x, y, color);
    }
  }
}

function buttonColumn(p: Picture, x: number, from: number, to: number, gap: number, color: Rgb, shine: Rgb) {
  for (let y = from; y < to; y += gap) {
    put(p, x, y, color);
    put(p, x + 1, y, color);
    put(p, x, y + 1, color);
    put(p, x + 1, y + 1, shine);
  }
}

/** 短袖：手肘以下是手臂 */
function bareArms(p: Picture, f: OutfitFrame, sleeveEnd: number) {
  const arm = newMask();
  for (let y = sleeveEnd; y < PORTRAIT_H; y++) {
    for (let x = 0; x < PORTRAIT_W; x++) {
      if (has(f.body, x, y) && Math.abs(x + 0.5 - CX) > f.t + 1) arm.d[y * arm.w + x] = 1;
    }
  }
  paint(p, arm, (x, y) => {
    if (isEdge(arm, x, y) && (x < CX ? !has(arm, x - 1, y) : !has(arm, x + 1, y))) return f.skin.line;
    const dark = depthToward(arm, x, y, 1, 0, 3);
    if (dark <= 1) return f.skin.shade;
    return y < sleeveEnd + 2 ? f.skin.shade : f.skin.base;
  });
  for (let x = 0; x < PORTRAIT_W; x++) {
    if (has(arm, x, sleeveEnd)) {
      put(p, x, sleeveEnd - 1, f.main.line);
      put(p, x, sleeveEnd - 2, f.main.shade);
    }
  }
}

const OUTFIT_DRAW: Record<OutfitId, (p: Picture, f: OutfitFrame) => void> = {
  tee(p, f) {
    if (f.stripe !== null) stripes(p, f, f.stripe, 6, f.ny + 14);
    bareArms(p, f, f.ny + 36);
    armLines(p, f, f.main.shade);
    neckline(p, f, curve([[50, f.ny], [52, f.ny + 5], [60, f.ny + 8], [68, f.ny + 5], [70, f.ny]]));
    strokeLine(p, [[49, f.ny + 1], [52, f.ny + 6], [60, f.ny + 9], [68, f.ny + 6], [71, f.ny + 1]], f.trim.base);
    strokeLine(p, [[48, f.ny + 2], [52, f.ny + 8], [60, f.ny + 11], [68, f.ny + 8], [72, f.ny + 2]], f.main.shade);
    // 下擺的皺摺
    strokeLine(p, [[CX - f.t + 3, f.ny + 36], [CX - f.t + 9, f.ny + 41]], f.main.shade, f.body);
    strokeLine(p, [[CX + f.t - 3, f.ny + 34], [CX + f.t - 10, f.ny + 40]], f.main.shade, f.body);
  },
  shirt(p, f) {
    if (f.stripe !== null) {
      for (let x = (CX - f.s) | 0; x < CX + f.s; x += 5) {
        for (let y = f.ny + 8; y < PORTRAIT_H; y++) if (has(f.body, x, y) && !isEdge(f.body, x, y)) put(p, x, y, f.stripe);
      }
    }
    armLines(p, f, f.main.shade);
    neckline(p, f, [[54, f.ny - 1], [66, f.ny - 1], [60, f.ny + 12]]);
    strokeLine(p, [[60, f.ny + 12], [60, PORTRAIT_H]], f.main.shade, f.body);
    strokeLine(p, [[62, f.ny + 14], [62, PORTRAIT_H]], f.main.shade, f.body);
    buttonColumn(p, 60, f.ny + 18, PORTRAIT_H, 13, f.trim.shade, f.trim.shine);
    for (const pts of [
      [[53, f.ny - 2], [44, f.ny + 4], [50, f.ny + 13], [60, f.ny + 11]],
      [[67, f.ny - 2], [76, f.ny + 4], [70, f.ny + 13], [60, f.ny + 11]],
    ] as const) {
      const c = newMask();
      fillPolygon(c, pts);
      flatPart(p, c, f.trim);
    }
    // 胸前口袋
    const pocket = newMask();
    fillPolygon(pocket, [[66, f.ny + 22], [78, f.ny + 22], [78, f.ny + 34], [72, f.ny + 37], [66, f.ny + 34]]);
    paint(p, pocket, (x, y) => (isEdge(pocket, x, y) ? f.main.shade : null));
  },
  sweater(p, f) {
    // 針織的橫紋
    for (let y = f.ny + 14; y < PORTRAIT_H; y += 4) {
      for (let x = 0; x < PORTRAIT_W; x++) {
        if (has(f.body, x, y) && !isEdge(f.body, x, y) && checker(x, y)) tint(p, x, y, f.main.deep, 0.35);
      }
    }
    armLines(p, f, f.main.deep);
    // 辮子花樣
    for (const x of [CX - 12, CX + 12]) {
      for (let y = f.ny + 16; y < PORTRAIT_H; y += 6) {
        strokeLine(p, [[x - 2, y], [x + 2, y + 3], [x - 2, y + 6]], f.main.shade, f.body);
        put(p, x + 1, y + 1, f.main.light);
      }
    }
    neckline(p, f, curve([[52, f.ny - 1], [54, f.ny + 3], [60, f.ny + 5], [66, f.ny + 3], [68, f.ny - 1]]));
    const rib = newMask();
    fillPolygon(rib, [...curve([[49, f.ny - 2], [52, f.ny + 5], [60, f.ny + 8], [68, f.ny + 5], [71, f.ny - 2]]), ...curve([[68, f.ny - 3], [66, f.ny + 1], [60, f.ny + 3], [54, f.ny + 1], [52, f.ny - 3]])]);
    paint(p, rib, (x, y) => (isEdge(rib, x, y) ? f.trim.line : x % 2 === 0 ? f.trim.base : f.trim.shade));
  },
  hoodie(p, f) {
    armLines(p, f, f.main.shade);
    neckline(p, f, curve([[53, f.ny - 2], [55, f.ny + 4], [60, f.ny + 6], [65, f.ny + 4], [67, f.ny - 2]]));
    // 帽子塌在領口兩邊，開口是一條深色的縫
    for (const side of [-1, 1]) {
      const at = (dx: number) => CX + side * dx;
      const hood = newMask();
      fillBlob(hood, [[at(5), f.ny - 5], [at(13), f.ny - 7], [at(19), f.ny], [at(17), f.ny + 10], [at(8), f.ny + 13], [at(0), f.ny + 11], [at(5), f.ny + 4]]);
      flatPart(p, hood, f.main);
      strokeLine(p, [[at(7), f.ny - 2], [at(12), f.ny + 3], [at(9), f.ny + 9]], f.main.shade, hood);
    }
    // 抽繩
    for (const [x, tip] of [[56, f.ny + 30], [64, f.ny + 26]] as const) {
      strokeLine(p, [[x, f.ny + 11], [x + (x < 60 ? -1 : 1), tip]], rgb("#f0ece0"));
      put(p, x + (x < 60 ? -1 : 1), tip + 1, rgb("#c9c2b0"));
      put(p, x + (x < 60 ? -1 : 1), tip + 2, rgb("#c9c2b0"));
    }
    // 大口袋
    strokeLine(p, [[42, f.ny + 58], [46, f.ny + 48], [74, f.ny + 48], [78, f.ny + 58]], f.main.shade, f.body);
  },
  jacket(p, f) {
    innerLayer(p, f, [[52, f.ny + 1], [68, f.ny + 1], [71, PORTRAIT_H], [49, PORTRAIT_H]]);
    neckline(p, f, curve([[52, f.ny - 1], [54, f.ny + 5], [60, f.ny + 7], [66, f.ny + 5], [68, f.ny - 1]]));
    strokeLine(p, [[52, f.ny + 4], [60, f.ny + 9], [68, f.ny + 4]], f.trim.shade);
    armLines(p, f, f.main.deep);
    for (const side of [-1, 1]) {
      const at = (dx: number) => CX + side * dx;
      const lapel = newMask();
      fillPolygon(lapel, [[at(7), f.ny - 3], [at(19), f.ny + 3], [at(14), f.ny + 18], [at(11), PORTRAIT_H], [at(9), PORTRAIT_H]]);
      shadedPart(p, lapel, f.main);
      // 胸口袋蓋、車縫線
      const flap = newMask();
      fillPolygon(flap, [[at(f.t - 12), f.ny + 26], [at(f.t - 2), f.ny + 26], [at(f.t - 3), f.ny + 31], [at(f.t - 11), f.ny + 31]]);
      paint(p, flap, (x, y) => (isEdge(flap, x, y) ? f.main.deep : f.main.light));
      strokeLine(p, [[at(f.t - 13), f.ny + 42], [at(f.t - 1), f.ny + 42]], f.main.shade, f.body);
      put(p, at(f.t - 7), f.ny + 28, rgb("#d9b45f"));
    }
  },
  cardigan(p, f) {
    innerLayer(p, f, [[50, f.ny + 1], [70, f.ny + 1], [72, PORTRAIT_H], [48, PORTRAIT_H]]);
    neckline(p, f, curve([[52, f.ny - 1], [54, f.ny + 4], [60, f.ny + 6], [66, f.ny + 4], [68, f.ny - 1]]));
    armLines(p, f, f.main.shade);
    for (const side of [-1, 1]) {
      const at = (dx: number) => CX + side * dx;
      const band = newMask();
      fillPolygon(band, [[at(9), f.ny - 3], [at(13), f.ny - 2], [at(16), f.ny + 16], [at(13), PORTRAIT_H], [at(8), PORTRAIT_H], [at(10), f.ny + 18]]);
      paint(p, band, (x, y) => (isEdge(band, x, y) ? f.main.deep : y % 2 === 0 ? f.main.light : f.main.base));
    }
    buttonColumn(p, CX - 12, f.ny + 22, PORTRAIT_H, 13, f.main.deep, f.main.shine);
    // 細細的針織
    for (let y = f.ny + 20; y < PORTRAIT_H; y += 5) {
      for (let x = 0; x < PORTRAIT_W; x++) {
        if (has(f.body, x, y) && !isEdge(f.body, x, y) && Math.abs(x - CX) > 17 && checker(x, y)) tint(p, x, y, f.main.shade, 0.5);
      }
    }
  },
  overalls(p, f) {
    // 底下是淺色 T 恤
    paint(p, f.body, (x, y) => softShade(f.body, x, y, f.trim));
    bareArms(p, f, f.ny + 36);
    armLines(p, f, f.trim.shade);
    neckline(p, f, curve([[50, f.ny], [52, f.ny + 5], [60, f.ny + 8], [68, f.ny + 5], [70, f.ny]]));
    strokeLine(p, [[49, f.ny + 1], [52, f.ny + 6], [60, f.ny + 9], [68, f.ny + 6], [71, f.ny + 1]], f.trim.shade);
    const bib = newMask();
    fillPolygon(bib, [[44, f.ny + 26], [76, f.ny + 26], [79, f.ny + 44], [82, PORTRAIT_H], [38, PORTRAIT_H], [41, f.ny + 44]]);
    for (const side of [-1, 1]) {
      const at = (dx: number) => CX + side * dx;
      fillPolygon(bib, [[at(23), f.ny + 2], [at(29), f.ny + 3], [at(14), f.ny + 30], [at(9), f.ny + 30]]);
    }
    shadedPart(p, bib, f.main);
    // 胸前口袋和金屬釦
    const pocket = newMask();
    fillPolygon(pocket, [[52, f.ny + 34], [68, f.ny + 34], [68, f.ny + 45], [60, f.ny + 49], [52, f.ny + 45]]);
    paint(p, pocket, (x, y) => (isEdge(pocket, x, y) ? f.main.deep : f.main.light));
    for (const x of [46, 72]) {
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) put(p, x + i, f.ny + 26 + j, i + j < 2 ? rgb("#f6dd8a") : rgb("#c7a23e"));
    }
  },
  blazer(p, f) {
    innerLayer(p, f, [[52, f.ny + 1], [68, f.ny + 1], [62, f.ny + 44], [58, f.ny + 44]]);
    neckline(p, f, [[54, f.ny - 1], [66, f.ny - 1], [60, f.ny + 10]]);
    armLines(p, f, f.main.line);
    strokeLine(p, [[60, f.ny + 44], [61, PORTRAIT_H]], f.main.line, f.body);
    for (const side of [-1, 1]) {
      const at = (dx: number) => CX + side * dx;
      const lapel = newMask();
      fillPolygon(lapel, [[at(8), f.ny - 3], [at(20), f.ny + 6], [at(16), f.ny + 13], [at(21), f.ny + 18], [at(0), f.ny + 46]]);
      paint(p, lapel, (x, y) => {
        if (isEdge(lapel, x, y)) return f.main.line;
        return depthToward(lapel, x, y, 1, 0, 3) <= 1 ? f.main.base : f.main.light;
      });
      strokeLine(p, [[at(f.t - 11), f.ny + 44], [at(f.t - 2), f.ny + 44]], f.main.line, f.body);
    }
    buttonColumn(p, 62, f.ny + 50, f.ny + 52, 13, f.main.shine, f.main.light);
  },
  turtleneck(p, f) {
    armLines(p, f, f.main.deep);
    // 直向羅紋
    for (let x = 0; x < PORTRAIT_W; x += 3) {
      for (let y = f.ny + 12; y < PORTRAIT_H; y++) {
        if (has(f.body, x, y) && !isEdge(f.body, x, y)) tint(p, x, y, f.main.shade, 0.55);
      }
    }
    const collar = newMask();
    fillBlob(collar, [[50, f.ny - 12], [60, f.ny - 10], [70, f.ny - 12], [72, f.ny + 4], [60, f.ny + 8], [48, f.ny + 4]]);
    paint(p, collar, (x, y) => {
      if (isEdge(collar, x, y)) return f.trim.line;
      if (x % 3 === 0) return f.trim.deep;
      return depthToward(collar, x, y, 1, 0, 3) <= 1 ? f.trim.base : f.main.base;
    });
  },
  dress(p, f) {
    armLines(p, f, f.main.deep);
    neckline(p, f, curve([[51, f.ny - 1], [54, f.ny + 4], [60, f.ny + 6], [66, f.ny + 4], [69, f.ny - 1]]));
    // 彼得潘小圓領
    for (const side of [-1, 1]) {
      const at = (dx: number) => CX + side * dx;
      const collar = newMask();
      fillBlob(collar, [[at(0), f.ny + 6], [at(9), f.ny - 2], [at(16), f.ny - 1], [at(20), f.ny + 5], [at(16), f.ny + 11], [at(7), f.ny + 11]]);
      flatPart(p, collar, f.trim);
    }
    // 胸前的小釦子和腰線，下面是裙襬的摺子
    buttonColumn(p, 59, f.ny + 20, f.ny + 58, 9, f.trim.base, f.trim.shine);
    for (let x = 0; x < PORTRAIT_W; x++) {
      if (has(f.body, x, f.ny + 62) && Math.abs(x - CX + 0.5) < f.t) put(p, x, f.ny + 62, f.main.deep);
    }
  },
};

/** 連帽衫的帽子在脖子後面，要先畫 */
function hoodBehind(p: Picture, f: OutfitFrame) {
  const hood = newMask();
  fillBlob(hood, [[42, f.ny + 4], [44, f.ny - 9], [60, f.ny - 13], [76, f.ny - 9], [78, f.ny + 4], [60, f.ny + 8]]);
  flatPart(p, hood, f.trim);
}

// ---------- 配件 ----------

interface AccessoryFrame {
  hy: number;
  ny: number;
  skin: Ramp;
  /** hairSide 是 right 時，偏一邊的配件也要跟著換邊 */
  side: 1 | -1;
}

function glassesLens(p: Picture, x: number, y: number, w: number, h: number) {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      tint(p, x + i, y + j, 0xdcecff, i + j < 4 ? 0.2 : 0.08);
    }
  }
}

function fillSprite(p: Picture, m: Mask, r: Ramp) {
  paint(p, m, (x, y) => softShade(m, x, y, r));
}

const ACCESSORY_DRAW: Record<AccessoryId, (p: Picture, f: AccessoryFrame) => void> = {
  none() {},
  glasses(p, { hy }) {
    const c = rgb("#3a2c30");
    const y = hy + 24;
    for (const x of [39, 64]) {
      glassesLens(p, x + 1, y + 1, 15, 12);
      for (let i = 1; i < 16; i++) {
        put(p, x + i, y, c);
        put(p, x + i, y + 13, c);
      }
      for (let j = 1; j < 13; j++) {
        put(p, x, y + j, c);
        put(p, x + 16, y + j, c);
      }
    }
    for (let i = 56; i < 64; i++) put(p, i, y + 3, c);
    for (const x of [37, 38, 81, 82]) put(p, x, y + 3, c);
  },
  roundGlasses(p, { hy }) {
    const c = rgb("#a57d3e");
    const y = hy + 30;
    for (const cx of [47.5, 72.5]) {
      const ring = newMask();
      fillEllipse(ring, cx, y, 9.5, 9.5);
      paint(p, ring, (x, yy) => {
        if (isEdge(ring, x, yy)) return c;
        tint(p, x, yy, 0xdcecff, x - cx + yy - y < -4 ? 0.2 : 0.08);
        return null;
      });
    }
    for (let i = 57; i < 63; i++) put(p, i, y - 3, c);
    for (const x of [37, 82]) put(p, x, y - 2, c);
  },
  earrings(p, { hy }) {
    for (const x of [35, 84]) {
      put(p, x, hy + 38, rgb("#f6dd8a"));
      put(p, x, hy + 39, rgb("#c7a23e"));
      for (let j = 0; j < 5; j++) {
        for (let i = 0; i < 2; i++) put(p, x + i - (j > 0 && j < 4 ? 0 : 0), hy + 40 + j, j === 4 ? rgb("#c7a23e") : i === 0 ? rgb("#fff0b0") : rgb("#e6c04f"));
      }
    }
  },
  necklace(p, { ny }) {
    const chain = rgb("#e6c04f");
    strokeLine(p, [[50, ny + 2], [55, ny + 9], [60, ny + 12], [65, ny + 9], [70, ny + 2]], chain);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) put(p, 59 + i, ny + 12 + j, i + j < 2 ? rgb("#fff0b0") : rgb("#d8a93a"));
  },
  headband(p, { hy }) {
    const band = newMask();
    const top = curve([[31, hy + 14], [40, hy - 1], [60, hy - 6], [80, hy - 1], [89, hy + 14]]);
    const bottom = curve([[89, hy + 19], [80, hy + 5], [60, hy], [40, hy + 5], [31, hy + 19]]);
    fillPolygon(band, [...top, ...bottom]);
    fillSprite(p, band, rampOf(rgb("#d9605f")));
  },
  ribbon(p, { hy, side }) {
    const r = rampOf(rgb("#e0708a"));
    const cx = CX + side * 15;
    const cy = hy - 3;
    const bow = newMask();
    fillPolygon(bow, [[cx - 11, cy - 6], [cx, cy], [cx - 11, cy + 6]]);
    fillPolygon(bow, [[cx + 11, cy - 6], [cx, cy], [cx + 11, cy + 6]]);
    fillSprite(p, bow, r);
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) put(p, cx + i, cy + j, Math.abs(i) === 2 || Math.abs(j) === 2 ? r.deep : r.light);
  },
  hairclip(p, { hy, side }) {
    const x0 = CX + side * 16;
    for (const [dy, color] of [[0, "#ffd76a"], [5, "#ff9fb4"]] as const) {
      for (let i = 0; i < 6; i++) {
        for (const t of [0, 1]) put(p, x0 + side * i, hy + 8 + dy + t, t === 0 ? rgb(color) : mix(rgb(color), 0x402030, 0.3));
      }
    }
  },
  cap(p, { hy }) {
    const r = rampOf(rgb("#3d6288"));
    const crownMask = newMask();
    fillBlob(crownMask, symmetric([[60, hy - 12], [74, hy - 10], [85, hy - 1], [88, hy + 12], [62, hy + 13]]));
    fillSprite(p, crownMask, r);
    const brim = newMask();
    fillBlob(brim, symmetric([[60, hy + 8], [80, hy + 9], [88, hy + 13], [84, hy + 18], [62, hy + 16]]));
    fillSprite(p, brim, rampOf(r.shade));
    // 帽子正面的小徽章
    for (let j = 0; j < 7; j++) for (let i = 0; i < 9; i++) put(p, 56 + i, hy - 2 + j, i === 0 || j === 0 || i === 8 || j === 6 ? r.deep : rgb("#f4f0d8"));
    for (let j = 1; j < 6; j++) put(p, 60, hy - 2 + j, r.base);
  },
  beanie(p, { hy }) {
    const r = rampOf(rgb("#c97a58"));
    const m = newMask();
    fillBlob(m, symmetric([[60, hy - 15], [74, hy - 12], [84, hy - 2], [88, hy + 8], [62, hy + 10]]));
    paint(p, m, (x, y) => {
      const c = softShade(m, x, y, r);
      return !isEdge(m, x, y) && x % 4 === 0 ? mix(c, r.deep, 0.6) : c;
    });
    const fold = newMask();
    fillBlob(fold, symmetric([[60, hy + 2], [84, hy + 3], [89, hy + 10], [86, hy + 15], [62, hy + 14]]));
    paint(p, fold, (x, y) => {
      const c = softShade(fold, x, y, r);
      return !isEdge(fold, x, y) && x % 3 === 0 ? r.shade : c;
    });
  },
  mask(p, { hy, ny, skin }) {
    // 口罩蓋住嘴巴，舉著手機自拍
    const r = rampOf(rgb("#f4f6f7"));
    const m = newMask();
    fillBlob(m, symmetric([[60, hy + 36], [70, hy + 36], [79, hy + 39], [77, hy + 47], [69, hy + 53], [62, hy + 55]]));
    paint(p, m, (x, y) => {
      if (isEdge(m, x, y)) return rgb("#a8b2bc");
      if ((y - hy) % 6 === 0) return rgb("#d7dde1");
      return depthToward(m, x, y, 1, 1, 3) <= 1 ? rgb("#dfe4e8") : r.base;
    });
    // 手和手機
    const phone = { x: 88, y: ny + 22 };
    const hand = newMask();
    fillBlob(hand, [[phone.x - 3, phone.y + 20], [phone.x + 4, phone.y + 16], [phone.x + 15, phone.y + 20], [phone.x + 15, PORTRAIT_H + 4], [phone.x, PORTRAIT_H + 4]]);
    paint(p, hand, (x, y) => softShade(hand, x, y, skin));
    for (let j = 0; j < 30; j++) {
      for (let i = 0; i < 16; i++) {
        const edge = i === 0 || j === 0 || i === 15 || j === 29;
        put(p, phone.x + i, phone.y + j, edge ? rgb("#11111a") : rgb("#2c2c3c"));
      }
    }
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) put(p, phone.x + 2 + i, phone.y + 2 + j, i + j < 2 ? rgb("#9090a8") : rgb("#55556a"));
    for (let i = 0; i < 4; i++) put(p, phone.x + 12 - i, phone.y + 26 - i, rgb("#44445a"));
  },
};

// ---------- 組合 ----------

export function headTop(look: Pick<Girl, "body">): number {
  const body = BODY_TYPES.find((b) => b.id === look.body) ?? BODY_TYPES[2];
  return BASE_HEAD_Y - body.lift;
}

export function renderPortrait(look: PortraitLook): Picture {
  const { face } = look;
  const skinData = SKINS.find((s) => s.id === face.skin) ?? SKINS[0];
  const skin: Ramp = {
    line: rgb(skinData.line),
    deep: mix(rgb(skinData.shade), rgb(skinData.line), 0.35),
    shade: rgb(skinData.shade),
    base: rgb(skinData.base),
    light: mix(rgb(skinData.base), 0xffffff, 0.35),
    shine: 0xffffff,
  };
  const hairData = HAIR_COLORS.find((c) => c.id === face.hairColor) ?? HAIR_COLORS[0];
  const tone = hairTone(hairData);
  const outfit = OUTFITS.find((o) => o.id === look.outfit) ?? OUTFITS[0];
  const colors: readonly { id: string; base: string; trim: string; stripe?: string }[] = outfit.colors;
  const color = colors.find((c) => c.id === look.outfitColor) ?? colors[0];
  const body = BODY_TYPES.find((b) => b.id === look.body) ?? BODY_TYPES[2];
  const shape = FACE_SHAPES.find((s) => s.id === face.shape) ?? FACE_SHAPES[0];
  const lip = rgb((LIP_COLORS.find((l) => l.id === face.lip) ?? LIP_COLORS[0]).color);

  const hy = headTop(look);
  const ny = hy + NECK_BASE;
  const pic = createPicture(PORTRAIT_W, PORTRAIT_H);
  const flip = face.hairSide === "right";
  const hair = HAIR_SHAPES[face.hair](hy);
  const tieColor = rgb("#c9465a");

  // 後髮
  const backLayer = createPicture(PORTRAIT_W, PORTRAIT_H);
  paintHairBack(backLayer, hair.back, tone, hair.backLines);
  if (face.hair === "ponytail" || face.hair === "bun" || face.hair === "halfup") hairTies(backLayer, hair, tieColor);
  overlay(pic, flip ? flipPicture(backLayer) : backLayer);

  const s = body.shoulder / 2;
  const t = body.torso / 2;
  const bodyMask = newMask();
  fillProfile(bodyMask, CX, ny, [
    [0, 8],
    [3, 11],
    [6, s * 0.52],
    [10, s * 0.74],
    [15, s * 0.9],
    [22, s * 0.98],
    [30, s],
    [60, s + 1],
    [PORTRAIT_H - ny + 1, s + 2],
  ]);
  const frame: OutfitFrame = {
    ny,
    s,
    t,
    body: bodyMask,
    main: rampOf(rgb(color.base)),
    trim: rampOf(rgb(color.trim)),
    skin,
    stripe: color.stripe ? rgb(color.stripe) : null,
  };
  if (look.outfit === "hoodie") hoodBehind(pic, frame);

  // 脖子
  const faceMask = newMask();
  fillProfile(faceMask, CX, hy, shape.profile);
  const neck = newMask();
  fillPolygon(neck, [[53, hy + 44], [67, hy + 44], [68, ny + 6], [52, ny + 6]]);
  const chinShadow = shifted(faceMask, 0, 4);
  paint(pic, neck, (x, y) => {
    if (x === 52 || x === 67) return skin.line;
    if (has(chinShadow, x, y)) return skin.deep;
    return x > 62 ? skin.shade : skin.base;
  });

  // 身體和服裝
  paint(pic, bodyMask, (x, y) => softShade(bodyMask, x, y, frame.main));
  OUTFIT_DRAW[look.outfit](pic, frame);

  // 耳朵：短髮才看得到，前髮會蓋掉
  const ears = newMask();
  fillEllipse(ears, 36, hy + 31, 3, 5);
  fillEllipse(ears, 84, hy + 31, 3, 5);
  paint(pic, ears, (x, y) => (isEdge(ears, x, y) ? skin.line : skin.shade));

  // 臉
  const frontMask = flip ? flipped(hair.front) : hair.front;
  const hairShadow = shifted(frontMask, 0, 2);
  const hairShadowSoft = shifted(frontMask, 0, 4);
  paint(pic, faceMask, (x, y) => {
    const rel = y - hy;
    if (isEdge(faceMask, x, y) && rel > 18) return skin.line;
    if (has(hairShadow, x, y)) return skin.shade;
    if (has(hairShadowSoft, x, y) && checker(x, y)) return skin.shade;
    const dark = depthToward(faceMask, x, y, -1, 0, 4);
    const right = depthToward(faceMask, x, y, 1, 0, 4);
    if (right <= 1 && rel > 22) return skin.shade;
    if (right === 2 && rel > 26 && checker(x, y)) return skin.shade;
    if (dark === 2 && rel > 24 && rel < 40) return skin.light;
    return skin.base;
  });

  // 腮紅
  const blushColor = rgb(skinData.blush);
  const strong = face.eyes === "smile" || face.mouth === "laugh" || face.mouth === "grin";
  for (const cx of [46, 74]) {
    for (let j = -4; j <= 4; j++) {
      for (let i = -8; i <= 8; i++) {
        const d = (i * i) / 64 + (j * j) / 16;
        if (d > 1) continue;
        const x = cx + i;
        const y = hy + 37 + j;
        if (!has(faceMask, x, y) || isEdge(faceMask, x, y) || has(hairShadow, x, y)) continue;
        if (d < 0.45) tint(pic, x, y, blushColor, strong ? 0.46 : 0.34);
        else if (checker(x, y)) tint(pic, x, y, blushColor, strong ? 0.3 : 0.22);
      }
    }
  }

  // 五官
  const browColor = mix(tone.shade, skin.line, 0.25);
  drawBrows(pic, face.brow, hy, browColor);
  drawEyes(pic, look, hy, skin.line, skin.shade);
  put(pic, 59, hy + 38, skin.shade);
  put(pic, 60, hy + 38, skin.shade);
  put(pic, 60, hy + 37, skin.light);
  if (face.accessory !== "mask") MOUTH_DRAW[face.mouth](pic, hy + 44, lip, mix(lip, skin.line, 0.6));
  if (face.mark === "mole") put(pic, 73, hy + 39, skin.line);
  if (face.mark === "freckles") {
    for (const [x, y] of [[43, 35], [47, 37], [51, 35], [69, 35], [73, 37], [77, 35]] as const) put(pic, x, hy + y, mix(skin.shade, skin.line, 0.5));
  }

  // 前髮
  const frontLayer = createPicture(PORTRAIT_W, PORTRAIT_H);
  paintHairFront(frontLayer, hair.front, tone, hair.frontLines, hy);
  if (face.hair === "braid") hairTies(frontLayer, hair, rgb("#e6b84c"));
  overlay(pic, flip ? flipPicture(frontLayer) : frontLayer);

  // 配件
  ACCESSORY_DRAW[face.accessory](pic, { hy, ny, skin, side: flip ? 1 : -1 });
  return pic;
}
