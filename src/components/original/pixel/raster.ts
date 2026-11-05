/**
 * 逐像素的小型算圖工具：形狀先畫進遮罩，再上色、描邊、疊到圖層上，最後才轉成 fillRect。
 * 不碰 DOM，算出來的結果可以在 Node 測試裡直接比對。
 * 座標是連續的：第 i 個像素涵蓋 [i, i+1)，所以左右鏡射就是 x → w - x。
 */

import { rect, type Ctx } from "./draw.ts";

export type Point = readonly [number, number];
/** 0xrrggbb */
export type Rgb = number;

export interface Mask {
  w: number;
  h: number;
  d: Uint8Array;
}

/** 透明是 -1，其他是 0xrrggbb */
export interface Picture {
  w: number;
  h: number;
  d: Int32Array;
}

// ---------- 顏色 ----------

export function rgb(hex: string): Rgb {
  return parseInt(hex.slice(1, 7), 16);
}

export function hexOf(color: Rgb): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  const channel = (shift: number) => {
    const from = (a >> shift) & 255;
    const to = (b >> shift) & 255;
    return Math.round(from + (to - from) * t);
  };
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

/** 由亮到暗的色階；暗部往冷紫偏，亮部往暖白偏，比純粹調明度耐看 */
export interface Ramp {
  line: Rgb;
  deep: Rgb;
  shade: Rgb;
  base: Rgb;
  light: Rgb;
  shine: Rgb;
}

const COOL = rgb("#1c1230");
const WARM = rgb("#fff4dc");

export function rampOf(base: Rgb): Ramp {
  return {
    line: mix(base, COOL, 0.72),
    deep: mix(base, COOL, 0.42),
    shade: mix(base, COOL, 0.22),
    base,
    light: mix(base, WARM, 0.22),
    shine: mix(base, WARM, 0.48),
  };
}

// ---------- 遮罩與形狀 ----------

export function createMask(w: number, h: number): Mask {
  return { w, h, d: new Uint8Array(w * h) };
}

export function has(m: Mask, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < m.w && y < m.h && m.d[y * m.w + x] === 1;
}

/** 通過每個控制點的平滑曲線（Catmull-Rom）。closed 時頭尾相接 */
export function curve(points: readonly Point[], closed = false, steps = 8): Point[] {
  const n = points.length;
  if (n < 3) return [...points];
  const at = (i: number) => (closed ? points[(i + n) % n] : points[Math.max(0, Math.min(n - 1, i))]);
  const out: Point[] = [];
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const blend = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3);
      out.push([blend(p0[0], p1[0], p2[0], p3[0]), blend(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  if (!closed) out.push(points[n - 1]);
  return out;
}

/** 掃描線填多邊形（奇偶規則），取樣點在像素中心。value 給 0 就是挖掉 */
export function fillPolygon(m: Mask, points: readonly Point[], value: 0 | 1 = 1) {
  const n = points.length;
  if (n < 3) return;
  const ys = points.map((p) => p[1]);
  const top = Math.max(0, Math.floor(Math.min(...ys)));
  const bottom = Math.min(m.h - 1, Math.ceil(Math.max(...ys)));
  for (let y = top; y <= bottom; y++) {
    const sy = y + 0.5;
    const hits: number[] = [];
    for (let i = 0; i < n; i++) {
      const [ax, ay] = points[i];
      const [bx, by] = points[(i + 1) % n];
      if (ay <= sy === by <= sy) continue;
      hits.push(ax + ((sy - ay) / (by - ay)) * (bx - ax));
    }
    hits.sort((a, b) => a - b);
    for (let k = 0; k + 1 < hits.length; k += 2) {
      const from = Math.max(0, Math.ceil(hits[k] - 0.5));
      const to = Math.min(m.w - 1, Math.floor(hits[k + 1] - 0.5));
      for (let x = from; x <= to; x++) m.d[y * m.w + x] = value;
    }
  }
}

export function fillBlob(m: Mask, points: readonly Point[], value: 0 | 1 = 1) {
  fillPolygon(m, curve(points, true), value);
}

export function fillEllipse(m: Mask, cx: number, cy: number, rx: number, ry: number, value: 0 | 1 = 1) {
  for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(m.h - 1, Math.ceil(cy + ry)); y++) {
    for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(m.w - 1, Math.ceil(cx + rx)); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) m.d[y * m.w + x] = value;
    }
  }
}

/**
 * 左右對稱的輪廓：profile 是 [離頂端幾列, 半寬]，中間平滑內插。
 * 臉和身體用這個，兩邊才會一個像素都不差。
 */
export function fillProfile(m: Mask, cx: number, top: number, profile: readonly Point[]) {
  const dense = curve(profile, false, 12);
  const end = profile[profile.length - 1][0];
  for (let row = 0; row < end; row++) {
    const sy = row + 0.5;
    let half = 0;
    for (let i = 0; i + 1 < dense.length; i++) {
      const [ay, ah] = dense[i];
      const [by, bh] = dense[i + 1];
      if (sy >= ay && sy <= by) {
        half = by === ay ? ah : ah + ((sy - ay) / (by - ay)) * (bh - ah);
        break;
      }
    }
    const y = top + row;
    if (y < 0 || y >= m.h) continue;
    const span = Math.round(half);
    for (let x = Math.max(0, cx - span); x < Math.min(m.w, cx + span); x++) m.d[y * m.w + x] = 1;
  }
}

export function unionMask(into: Mask, other: Mask) {
  for (let i = 0; i < into.d.length; i++) if (other.d[i]) into.d[i] = 1;
}

/** 把遮罩往 (dx, dy) 平移後的新遮罩，用來做投影 */
export function shifted(m: Mask, dx: number, dy: number): Mask {
  const out = createMask(m.w, m.h);
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      if (m.d[y * m.w + x] && x + dx >= 0 && x + dx < m.w && y + dy >= 0 && y + dy < m.h) {
        out.d[(y + dy) * m.w + x + dx] = 1;
      }
    }
  }
  return out;
}

export function flipped(m: Mask): Mask {
  const out = createMask(m.w, m.h);
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) out.d[y * m.w + (m.w - 1 - x)] = m.d[y * m.w + x];
  }
  return out;
}

/** 順著光線的反方向（右下）走幾步還在形狀裡：越小越靠近背光面 */
export function depthToward(m: Mask, x: number, y: number, dx: number, dy: number, max: number): number {
  for (let k = 1; k <= max; k++) {
    // 走出畫布底部不算邊緣：衣服是被照片裁掉，不是到那裡就結束
    if (y + dy * k < m.h && !has(m, x + dx * k, y + dy * k)) return k - 1;
  }
  return max;
}

// ---------- 圖層 ----------

export function createPicture(w: number, h: number): Picture {
  return { w, h, d: new Int32Array(w * h).fill(-1) };
}

export function put(p: Picture, x: number, y: number, color: Rgb) {
  if (x < 0 || y < 0 || x >= p.w || y >= p.h) return;
  p.d[y * p.w + x] = color;
}

/** 半透明疊色：只疊在已經有顏色的地方 */
export function tint(p: Picture, x: number, y: number, color: Rgb, alpha: number) {
  if (x < 0 || y < 0 || x >= p.w || y >= p.h) return;
  const i = y * p.w + x;
  if (p.d[i] >= 0) p.d[i] = mix(p.d[i], color, alpha);
}

export function paint(p: Picture, m: Mask, colorAt: (x: number, y: number) => Rgb | null) {
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      if (!m.d[y * m.w + x]) continue;
      const color = colorAt(x, y);
      if (color !== null) p.d[y * p.w + x] = color;
    }
  }
}

/** 描邊只畫在形狀內側，形狀不會變胖 */
export function isEdge(m: Mask, x: number, y: number): boolean {
  const below = y + 1 >= m.h || has(m, x, y + 1);
  return has(m, x, y) && !(has(m, x - 1, y) && has(m, x + 1, y) && has(m, x, y - 1) && below);
}

/** 順著曲線畫線；clip 有給就只畫在遮罩裡 */
export function strokeLine(p: Picture, points: readonly Point[], color: Rgb, clip?: Mask, thick = 1) {
  const dense = points.length >= 3 ? curve(points, false, 14) : points;
  for (let i = 0; i + 1 < dense.length; i++) {
    const [ax, ay] = dense[i];
    const [bx, by] = dense[i + 1];
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 2));
    for (let s = 0; s <= steps; s++) {
      const x = Math.floor(ax + ((bx - ax) * s) / steps);
      const y = Math.floor(ay + ((by - ay) * s) / steps);
      for (let t = 0; t < thick; t++) {
        if (!clip || has(clip, x + t, y)) put(p, x + t, y, color);
      }
    }
  }
}

/** 字串點陣，跟 draw.ts 的 sprite 同一種格式；mirror 時以 x 為右緣往左畫 */
export function stamp(
  p: Picture,
  rows: readonly string[],
  palette: Readonly<Record<string, Rgb>>,
  x: number,
  y: number,
  mirror = false
) {
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const color = palette[row[i]];
      if (color !== undefined) put(p, mirror ? x + row.length - 1 - i : x + i, y + j, color);
    }
  });
}

/** 疊到畫布：同一列相同顏色併成一條，fillRect 次數才不會爆量 */
export function blit(ctx: Ctx, p: Picture) {
  for (let y = 0; y < p.h; y++) {
    let x = 0;
    while (x < p.w) {
      const color = p.d[y * p.w + x];
      let run = 1;
      while (x + run < p.w && p.d[y * p.w + x + run] === color) run++;
      if (color >= 0) rect(ctx, hexOf(color), x, y, run, 1);
      x += run;
    }
  }
}
