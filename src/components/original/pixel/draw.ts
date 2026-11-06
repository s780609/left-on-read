/**
 * 像素繪圖的共用工具：全部是 fillRect，不用圖片檔。
 */

export type Ctx = CanvasRenderingContext2D;

export function rect(ctx: Ctx, color: string, x: number, y: number, w = 1, h = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** 棋盤格抖色；phase 改變時格子會閃動 */
export function dither(ctx: Ctx, color: string, x: number, y: number, w: number, h: number, phase = 0) {
  ctx.fillStyle = color;
  const x0 = Math.round(x);
  const y0 = Math.round(y);
  for (let j = 0; j < h; j++) {
    for (let i = (j + phase) % 2; i < w; i += 2) ctx.fillRect(x0 + i, y0 + j, 1, 1);
  }
}

/** 由中心往外越來越稀疏的抖色光暈，用來畫手機光、路燈 */
export function glow(ctx: Ctx, color: string, cx: number, cy: number, r: number, t = 0) {
  ctx.fillStyle = color;
  const flick = Math.floor(t / 180) % 2;
  for (let j = -r; j <= r; j++) {
    for (let i = -r; i <= r; i++) {
      const d = Math.sqrt(i * i + j * j) / r;
      if (d > 1) continue;
      // 用 Bayer 2×2 門檻決定這一點亮不亮，越外圈越稀疏
      const bayer = [0.2, 0.7, 0.95, 0.45][((i + flick) & 1) + ((j & 1) << 1)];
      if (1 - d > bayer) ctx.fillRect(Math.round(cx + i), Math.round(cy + j), 1, 1);
    }
  }
}

/** 字串點陣：每列一個字串，字元查色盤，空白和 . 透明 */
export function sprite(ctx: Ctx, rows: readonly string[], palette: Record<string, string>, x: number, y: number) {
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const color = palette[row[i]];
      if (color) rect(ctx, color, x + i, y + j);
    }
  });
}

/** 3×5 數字字型：微波爐、時鐘用 */
const DIGITS: Record<string, readonly string[]> = {
  "0": ["###", "#.#", "#.#", "#.#", "###"],
  "1": [".#.", "##.", ".#.", ".#.", "###"],
  "2": ["###", "..#", "###", "#..", "###"],
  "3": ["###", "..#", "###", "..#", "###"],
  "4": ["#.#", "#.#", "###", "..#", "..#"],
  "5": ["###", "#..", "###", "..#", "###"],
  "6": ["###", "#..", "###", "#.#", "###"],
  "7": ["###", "..#", ".#.", ".#.", ".#."],
  "8": ["###", "#.#", "###", "#.#", "###"],
  "9": ["###", "#.#", "###", "..#", "###"],
  ":": ["...", ".#.", "...", ".#.", "..."],
  "+": ["...", ".#.", "###", ".#.", "..."],
  "-": ["...", "...", "###", "...", "..."],
  ",": ["...", "...", "...", ".#.", "#.."],
};

export function digits(ctx: Ctx, text: string, x: number, y: number, color: string, scale = 1) {
  let cx = x;
  ctx.fillStyle = color;
  for (const ch of text) {
    const rows = DIGITS[ch];
    rows?.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        if (row[i] === "#") ctx.fillRect(cx + i * scale, y + j * scale, scale, scale);
      }
    });
    cx += (ch === ":" || ch === "," ? 3 : 4) * scale;
  }
}

/** 數字寫完的總寬，用來置中 */
export function digitsWidth(text: string, scale = 1): number {
  let w = 0;
  for (const ch of text) w += (ch === ":" || ch === "," ? 3 : 4) * scale;
  return w - scale;
}

const FONT_STACK = 'ui-monospace, "Cascadia Mono", Consolas, "Microsoft JhengHei", "PingFang TC", "Noto Sans TC", monospace';
/** 筆畫多的字在小字級用 normal，粗體二值化後會糊成一團 */
export type TextWeight = "bold" | "normal";
const glyphCache = new Map<string, { runs: readonly (readonly [number, number, number])[]; width: number }>();

/**
 * 系統字型的文字轉成硬邊點陣：先畫到暫存 canvas，再用 alpha 門檻二值化。
 * 不新增字型檔，也能在低解析度 canvas 上得到像素字的質感。
 */
function textRuns(text: string, size: number, weight: TextWeight = "bold") {
  const key = `${weight}|${size}|${text}`;
  const cached = glyphCache.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  const c = canvas.getContext("2d", { willReadFrequently: true });
  const result = { runs: [] as (readonly [number, number, number])[], width: 0 };
  if (c) {
    const font = `${weight} ${size}px ${FONT_STACK}`;
    c.font = font;
    const width = Math.ceil(c.measureText(text).width) + 2;
    const height = size + 6;
    canvas.width = width;
    canvas.height = height;
    c.font = font;
    c.textBaseline = "top";
    c.fillStyle = "#fff";
    c.fillText(text, 1, 1);
    const data = c.getImageData(0, 0, width, height).data;
    for (let y = 0; y < height; y++) {
      let start = -1;
      for (let x = 0; x <= width; x++) {
        const on = x < width && data[(y * width + x) * 4 + 3] > 96;
        if (on && start < 0) start = x;
        if (!on && start >= 0) {
          result.runs.push([start, y, x - start]);
          start = -1;
        }
      }
    }
    result.width = width;
  }
  glyphCache.set(key, result);
  return result;
}

export function textWidth(text: string, size: number, weight: TextWeight = "bold"): number {
  return textRuns(text, size, weight).width;
}

/** 畫一段硬邊文字；align 為 center 時 x 是中心 */
export function pixelText(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  align: "left" | "center" = "left",
  weight: TextWeight = "bold"
) {
  const { runs, width } = textRuns(text, size, weight);
  const ox = Math.round(align === "center" ? x - width / 2 : x);
  const oy = Math.round(y);
  ctx.fillStyle = color;
  for (const [rx, ry, rw] of runs) ctx.fillRect(ox + rx, oy + ry, rw, 1);
}

/** 斜斜落下的雨 */
export function rain(ctx: Ctx, t: number, x: number, y: number, w: number, h: number, count: number) {
  ctx.fillStyle = "rgba(190,215,255,0.45)";
  for (let i = 0; i < count; i++) {
    const rx = x + ((i * 53 - t * 0.05) % w + w) % w;
    const ry = y + (i * 97 + t * 0.42) % h;
    ctx.fillRect(Math.round(rx), Math.round(ry), 1, 7);
  }
}

/** 由上往下的色帶，用來畫天空 */
export function bands(ctx: Ctx, colors: readonly string[], x: number, y: number, w: number, h: number) {
  const each = h / colors.length;
  colors.forEach((c, i) => rect(ctx, c, x, y + i * each, w, Math.ceil(each)));
}

/** 跟時間有關的小工具：t 毫秒、period 毫秒，回傳 0～1 的鋸齒波 */
export const saw = (t: number, period: number) => ((t % period) + period) % period / period;
/** 每 period 毫秒翻轉一次 */
export const blink = (t: number, period: number) => Math.floor(t / period) % 2 === 0;
