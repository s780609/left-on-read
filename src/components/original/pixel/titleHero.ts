/**
 * 標題畫面的主視覺，邏輯尺寸 360×300（遊戲內場景的兩倍，比例相同）：
 * 深夜陽台上低頭看手機的冠宇，身邊飄著 Swipy 上的女生，和她們冷冷的回覆。
 * 背景和卡片只算一次存成離屏 canvas，之後每格只貼圖，不用重算肖像。
 */

import { generateGirl, type Girl } from "../../../lib/left-on-read/girl.ts";
import { blink, glow, pixelText, rect, sprite, textWidth, type Ctx } from "./draw.ts";
import { drawGirl, faceCrop, PHOTO_H, PHOTO_W } from "./girlSprite.ts";
import { drawGuanyuBust } from "./guanyuSprite.ts";

export const TITLE_W = 360;
export const TITLE_H = 300;

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const CARD_W = 68;
const CARD_H = 92;
const PHOTO_BOX = { x: 2, y: 2, w: 64, h: 70 };
/** 照片裁切的範圍，比例要跟 PHOTO_BOX 一樣 */
const CROP_W = 84;
const CROP_H = 92;

const BUST_X = 116;
const BUST_Y = 148;
const BUST_W = 128;
const BUST_H = 140;

/** 冠宇的頭：卡片和對話框都不能蓋到 */
export const GUANYU_HEAD: Box = { x: 142, y: 150, w: 76, h: 72 };

export interface TitleFragment {
  /** 這段對話屬於哪個女生；seed 固定，標題畫面才不會每次都換人 */
  seed: number;
  card: Box;
  /** 她的回覆；null 就是連回都沒有回 */
  reply: string | null;
  bubble: Box;
  /** 泡泡的小尾巴接往卡片的方向 */
  tail: "up" | "left" | "right";
  receipt: { x: number; y: number };
}

const card = (x: number, y: number): Box => ({ x, y, w: CARD_W, h: CARD_H });

export const TITLE_FRAGMENTS: readonly TitleFragment[] = [
  { seed: 127, card: card(6, 8), reply: "。", bubble: { x: 16, y: 106, w: 34, h: 26 }, tail: "up", receipt: { x: 12, y: 136 } },
  { seed: 114, card: card(286, 12), reply: "嗯嗯", bubble: { x: 296, y: 110, w: 46, h: 26 }, tail: "up", receipt: { x: 298, y: 140 } },
  { seed: 118, card: card(6, 178), reply: "去洗澡", bubble: { x: 78, y: 196, w: 60, h: 26 }, tail: "left", receipt: { x: 84, y: 226 } },
  { seed: 106, card: card(286, 186), reply: null, bubble: { x: 240, y: 196, w: 38, h: 22 }, tail: "right", receipt: { x: 236, y: 222 } },
];

/** 冠宇打了很久的那一則，對照她們的「。」 */
export const TITLE_MESSAGE: readonly string[] = ["今天路過一間店，", "覺得妳會喜歡。", "週末要一起去嗎？"];
export const TITLE_MESSAGE_BOX: Box = { x: 108, y: 54, w: 144, h: 60 };
const MESSAGE_COLOR = "#ffb3c4";
const MESSAGE_RECEIPT = { x: 58, y: 100 };

// ---------- 對話的節奏 ----------

export type ReplyStage = "typing" | "reply" | "read";

const SLOT_MS = 2400;
const CYCLE_MS = SLOT_MS * TITLE_FRAGMENTS.length;
const TYPING_MS = 1000;
const REPLY_MS = 1000;

/** 四段對話輪流：輸入中，打了很久，結果只有一個句點，然後就只剩已讀。 */
export function replyStage(t: number, slot: number): ReplyStage {
  const local = (((t - slot * SLOT_MS) % CYCLE_MS) + CYCLE_MS) % CYCLE_MS;
  if (local < TYPING_MS) return "typing";
  return local < TYPING_MS + REPLY_MS ? "reply" : "read";
}

/** 減少動態效果時的定格：每段都已經回完、已讀了 */
export const TITLE_STILL_T = TYPING_MS + REPLY_MS + 200;

// ---------- 小零件 ----------

function makeLayer(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

/** 切掉四個角的圓角方塊，底下多一條陰影 */
function panel(ctx: Ctx, box: Box, fill: string, shadow: string) {
  const { x, y, w, h } = box;
  rect(ctx, shadow, x + 1, y + h, w - 2, 2);
  rect(ctx, fill, x + 2, y, w - 4, h);
  rect(ctx, fill, x, y + 2, w, h - 4);
  rect(ctx, fill, x + 1, y + 1, w - 2, h - 2);
}

const PERIOD = [".ooooo.", "oo...oo", "o.....o", "o.....o", "o.....o", "oo...oo", ".ooooo."];
const HEART = ["ww.ww", "wwwww", "wwwww", ".www.", "..w.."];
const BROKEN_HEART = [".pp.pp.", "pppcppp", "ppp.ppp", ".ppcpp.", "..pcp..", "...p..."];

/** 已讀的小標籤，加一個勾 */
function receipt(ctx: Ctx, x: number, y: number) {
  panel(ctx, { x, y, w: 48, h: 19 }, "#183626", "#00000088");
  pixelText(ctx, "已讀", x + 3, y + 1, 16, "#b6f0c4", "left", "normal");
  const cx = x + 38;
  const cy = y + 10;
  rect(ctx, "#a4e8b4", cx, cy, 1, 1);
  rect(ctx, "#a4e8b4", cx + 1, cy + 1, 1, 1);
  rect(ctx, "#a4e8b4", cx + 2, cy, 1, 1);
  rect(ctx, "#a4e8b4", cx + 3, cy - 1, 1, 1);
  rect(ctx, "#a4e8b4", cx + 4, cy - 2, 1, 1);
}

function typingDots(ctx: Ctx, box: Box, t: number) {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2 - 1;
  const lit = Math.floor(t / 260) % 3;
  for (let i = 0; i < 3; i++) rect(ctx, i === lit ? "#3c3a4c" : "#a7a394", cx - 7 + i * 6, cy, 3, 3);
}

/** 她的泡泡，尾巴接往她的照片 */
function herBubble(ctx: Ctx, f: TitleFragment) {
  const { bubble: b, tail } = f;
  panel(ctx, b, "#f4efe0", "#00000088");
  if (tail === "up") {
    rect(ctx, "#f4efe0", b.x + 7, b.y - 2, 6, 2);
    rect(ctx, "#f4efe0", b.x + 9, b.y - 4, 3, 2);
  } else if (tail === "left") {
    rect(ctx, "#f4efe0", b.x - 2, b.y + 9, 2, 6);
    rect(ctx, "#f4efe0", b.x - 4, b.y + 11, 2, 3);
  } else {
    rect(ctx, "#f4efe0", b.x + b.w, b.y + 7, 2, 6);
    rect(ctx, "#f4efe0", b.x + b.w + 2, b.y + 9, 2, 3);
  }
}

function drawReplyText(ctx: Ctx, f: TitleFragment) {
  if (!f.reply) return;
  const { bubble: b } = f;
  if (f.reply === "。") {
    // 全形句點的字形縮在角落，自己畫才看得到這一個圈
    sprite(ctx, PERIOD, { o: "#1a1a24" }, b.x + Math.floor((b.w - 7) / 2), b.y + 13);
    return;
  }
  pixelText(ctx, f.reply, b.x + b.w / 2, b.y + 3, 17, "#1a1a24", "center", "normal");
}

// ---------- 只算一次的圖層 ----------

function paintCard(ctx: Ctx, girl: Girl) {
  panel(ctx, { x: 0, y: 0, w: CARD_W, h: CARD_H - 2 }, "#151a3a", "#00000099");
  const photo = makeLayer(PHOTO_W, PHOTO_H);
  if (photo) {
    drawGirl(photo.ctx, girl);
    const sx = Math.round((PHOTO_W - CROP_W) / 2);
    const sy = Math.min(PHOTO_H - CROP_H, faceCrop(girl, CROP_H).y);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(photo.canvas, sx, sy, CROP_W, CROP_H, PHOTO_BOX.x, PHOTO_BOX.y, PHOTO_BOX.w, PHOTO_BOX.h);
    ctx.imageSmoothingEnabled = false;
  }
  // 照片外框和 Swipy 的愛心
  rect(ctx, "#3d4478", PHOTO_BOX.x, PHOTO_BOX.y + PHOTO_BOX.h, PHOTO_BOX.w, 1);
  rect(ctx, "#00000066", PHOTO_BOX.x + PHOTO_BOX.w - 10, PHOTO_BOX.y + 2, 9, 8);
  sprite(ctx, HEART, { w: "#ff8fa8" }, PHOTO_BOX.x + PHOTO_BOX.w - 8, PHOTO_BOX.y + 3);
  pixelText(ctx, `${girl.nickname} ${girl.age}`, CARD_W / 2, 74, 12, "#e6e2f4", "center", "normal");
}

/** 固定的假亂數：夜景每次長得一樣 */
function scatter(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const STARS: readonly (readonly [number, number])[] = (() => {
  const next = scatter(11);
  return Array.from({ length: 70 }, () => [Math.floor(next() * TITLE_W), Math.floor(next() * 170)] as const);
})();

/** 會亮會暗的窗戶：只挑幾個，整片一起閃會很吵 */
const WINDOWS: readonly (readonly [number, number])[] = (() => {
  const next = scatter(29);
  return Array.from({ length: 12 }, () => [Math.floor(next() * TITLE_W), 212 + Math.floor(next() * 34)] as const);
})();

function paintBackground(ctx: Ctx) {
  const sky = ["#05071a", "#070a22", "#090d2a", "#0c1132", "#10163c", "#151c46", "#1a2150"];
  sky.forEach((c, i) => rect(ctx, c, 0, i * 30, TITLE_W, 30));
  for (const [x, y] of STARS) rect(ctx, y < 90 ? "#59608f" : "#3f4674", x, y, 1, 1);

  // 幾朵被城市照亮的雲：一層一層疊，邊緣才不會是方塊
  for (const [x, y, w] of [[-10, 150, 84], [262, 160, 110], [120, 128, 44]] as const) {
    rect(ctx, "#121844", x + 10, y - 3, w - 24, 3);
    rect(ctx, "#121844", x + 3, y, w - 8, 3);
    rect(ctx, "#171e50", x, y + 3, w, 3);
    rect(ctx, "#121844", x + 8, y + 6, w - 12, 2);
  }

  // 遠山
  const ridge = (color: string, base: number, peaks: readonly (readonly [number, number, number])[]) => {
    for (const [px, height, slope] of peaks) {
      for (let h = 0; h < height; h++) {
        const half = (height - h) * slope;
        rect(ctx, color, px - half, base - h, half * 2, 1);
      }
    }
    rect(ctx, color, 0, base, TITLE_W, TITLE_H - base);
  };
  ridge("#141a40", 200, [[50, 24, 4], [176, 16, 6], [320, 30, 4]]);

  // 城市：樓和亮著的窗
  const next = scatter(5);
  for (const [color, top, spread, litColor] of [
    ["#0c1030", 196, 16, "#57506a"],
    ["#080b24", 212, 22, "#d8ad62"],
  ] as const) {
    let x = -4;
    while (x < TITLE_W) {
      const w = 12 + Math.floor(next() * 18);
      const y = top + Math.floor(next() * spread);
      rect(ctx, color, x, y, w, TITLE_H - y);
      for (let wy = y + 3; wy < 262; wy += 5) {
        for (let wx = x + 2; wx < x + w - 2; wx += 4) {
          if (next() > 0.68) rect(ctx, litColor, wx, wy, 2, 2);
        }
      }
      x += w + (next() > 0.8 ? 3 : 0);
    }
  }

  // 頭後面一點點光，黑髮才不會融進夜色
  glow(ctx, "#1f2758", BUST_X + BUST_W / 2, BUST_Y + 40, 84);
  glow(ctx, "#2b3470", BUST_X + BUST_W / 2, BUST_Y + 36, 54);

  // 陽台欄杆
  rect(ctx, "#050716", 0, 268, TITLE_W, TITLE_H - 268);
  rect(ctx, "#1a2048", 0, 262, TITLE_W, 2);
  rect(ctx, "#0a0d26", 0, 264, TITLE_W, 4);
  for (let x = 6; x < TITLE_W; x += 22) rect(ctx, "#0e1230", x, 268, 3, TITLE_H - 268);

  // 片名：字留在畫布上，因為 HTML 的標題只給螢幕報讀器
  const size = 38;
  const each = textWidth("已讀", size, "normal");
  const left = Math.round((TITLE_W - each - textWidth("不回", size, "normal")) / 2);
  pixelText(ctx, "已讀", left + 2, 7, size, "#000000", "left", "normal");
  pixelText(ctx, "不回", left + each + 2, 7, size, "#000000", "left", "normal");
  pixelText(ctx, "已讀", left, 5, size, "#f6f1de", "left", "normal");
  pixelText(ctx, "不回", left + each, 5, size, "#ff8fa8", "left", "normal");
  rect(ctx, "#ff8fa8", 118, 49, 52, 1);
  rect(ctx, "#ff8fa8", 190, 49, 52, 1);
  sprite(ctx, BROKEN_HEART, { p: "#ff8fa8", c: "#0a0d26" }, 177, 46);
}

function paintMessage(ctx: Ctx) {
  const box = TITLE_MESSAGE_BOX;
  panel(ctx, box, MESSAGE_COLOR, "#00000088");
  rect(ctx, MESSAGE_COLOR, box.x + box.w, box.y + 42, 2, 6);
  rect(ctx, MESSAGE_COLOR, box.x + box.w + 2, box.y + 44, 2, 3);
  TITLE_MESSAGE.forEach((line, i) => {
    pixelText(ctx, line, box.x + 8, box.y + 3 + i * 18, 15, "#2a1a22", "left", "normal");
  });
}

interface Layer {
  canvas: HTMLCanvasElement;
  ctx: Ctx;
}

interface Layers {
  background: Layer;
  cards: readonly Layer[];
  bust: Layer;
}

let layers: Layers | null = null;

function getLayers(): Layers | null {
  if (layers) return layers;
  const background = makeLayer(TITLE_W, TITLE_H);
  const bust = makeLayer(BUST_W, BUST_H);
  const cards: Layer[] = [];
  for (const f of TITLE_FRAGMENTS) {
    const layer = makeLayer(CARD_W, CARD_H);
    if (!layer) return null;
    paintCard(layer.ctx, generateGirl(f.seed));
    cards.push(layer);
  }
  if (!background || !bust) return null;
  paintBackground(background.ctx);
  paintMessage(background.ctx);
  layers = { background, cards, bust };
  return layers;
}

// ---------- 主角 ----------

/** 冠宇：沿用共用的半身像放大兩倍，再壓暗融進夜色，只留手機照亮的部分 */
function drawGuanyu(ctx: Ctx, bust: Layer, t: number) {
  const b = bust.ctx;
  b.globalCompositeOperation = "source-over";
  b.clearRect(0, 0, BUST_W, BUST_H);
  b.save();
  b.scale(2, 2);
  // 鏡片閃爍放慢，放大後才不會太吵
  drawGuanyuBust(b, 0, 0, { t: t / 4, phoneGlow: true });
  b.restore();
  b.globalCompositeOperation = "source-atop";
  rect(b, "#080c3048", 0, 0, BUST_W, BUST_H);
  rect(b, "#050824a0", 0, 96, 24, 44);
  rect(b, "#050824a0", BUST_W - 24, 96, 24, 44);
  rect(b, "#bfeeff24", 40, 52, 48, 88);
  ctx.drawImage(bust.canvas, BUST_X, BUST_Y);

  // 半身像上移後，把衣服往下補滿
  const cx = BUST_X + BUST_W / 2;
  const bottom = BUST_Y + BUST_H;
  rect(ctx, "#4a4f68", BUST_X + 12, bottom, BUST_W - 24, TITLE_H - bottom);

  // 手機和雙手，放低一點，不要擋到下巴
  glow(ctx, "#a8e8ff26", cx, 270, 22, t / 4);
  const phoneY = 264;
  rect(ctx, "#0d0f20", cx - 11, phoneY, 22, TITLE_H - phoneY);
  rect(ctx, "#20243f", cx - 10, phoneY + 1, 20, TITLE_H - phoneY - 1);
  rect(ctx, "#32375c", cx + 3, phoneY + 3, 5, 7);
  rect(ctx, "#0d0f20", cx + 4, phoneY + 5, 2, 2);
  rect(ctx, blink(t, 1700) ? "#d9f6ff" : "#a8e8ff", cx - 11, phoneY - 1, 22, 1);
  for (const [dir, side] of [[-1, cx - 17], [1, cx + 11]] as const) {
    rect(ctx, "#c99b7c", side, 284, 6, TITLE_H - 284);
    rect(ctx, "#a97c62", dir < 0 ? side + 3 : side, 288, 3, 2);
    rect(ctx, "#a97c62", dir < 0 ? side + 3 : side, 293, 3, 2);
    rect(ctx, "#8b6650", dir < 0 ? side - 6 : side + 6, 290, 6, TITLE_H - 290);
  }
}

// ---------- 每格 ----------

export function drawTitleHero(ctx: Ctx, t: number) {
  const l = getLayers();
  if (!l) return;
  ctx.drawImage(l.background.canvas, 0, 0);

  // 星星和窗戶，慢慢閃
  STARS.forEach(([x, y], i) => {
    if (i % 5 === 0 && blink(t + i * 370, 1900)) rect(ctx, "#c6cdf0", x, y, 1, 1);
  });
  WINDOWS.forEach(([x, y], i) => {
    if (blink(t + i * 610, 3100)) rect(ctx, "#ffe08a", x, y, 2, 2);
  });

  drawGuanyu(ctx, l.bust, t);

  // 已讀了，沒有回
  receipt(ctx, MESSAGE_RECEIPT.x, MESSAGE_RECEIPT.y);

  TITLE_FRAGMENTS.forEach((f, i) => {
    // 卡片微微上下飄，一次只動一個像素
    const bob = Math.round(Math.sin(t / 1100 + i * 1.7));
    ctx.drawImage(l.cards[i].canvas, f.card.x, f.card.y + bob);

    const stage = replyStage(t, i);
    if (stage === "typing") {
      herBubble(ctx, f);
      typingDots(ctx, f.bubble, t);
    } else if (f.reply) {
      herBubble(ctx, f);
      drawReplyText(ctx, f);
    }
    if (stage === "read") receipt(ctx, f.receipt.x, f.receipt.y);
  });
}

/** 減少動態效果用：永遠畫同一格 */
export function drawTitleHeroStill(ctx: Ctx) {
  drawTitleHero(ctx, TITLE_STILL_T);
}
