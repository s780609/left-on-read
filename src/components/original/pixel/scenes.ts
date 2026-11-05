/**
 * 遊戲中的場景，邏輯尺寸 180×150：都是插圖，再疊上一點小動畫。
 * 每個都有小動畫，t 是毫秒。
 */

import type { MealDish } from "@/lib/left-on-read/meals";
import { blink, digits, digitsWidth, glow, pixelText, rain, rect, saw, type Ctx } from "./draw";

export const SCENE_W = 180;
export const SCENE_H = 150;

// ---------- 插圖場景：開場的直式圖裁一段，或 scene/ 底下專門畫的 6:5 橫圖 ----------

const PHOTO_SRC = {
  office: "/left-on-read/intro/office.jpg",
  commute: "/left-on-read/intro/commute.jpg",
  bed: "/left-on-read/intro/bed.jpg",
  phone: "/left-on-read/intro/phone.jpg",
  eatery: "/left-on-read/scene/eatery.jpg",
  eateryBowl: "/left-on-read/scene/eatery-bowl.jpg",
  eateryDumplings: "/left-on-read/scene/eatery-dumplings.jpg",
  eateryHotpot: "/left-on-read/scene/eatery-hotpot.jpg",
  eateryFastfood: "/left-on-read/scene/eatery-fastfood.jpg",
  weekend: "/left-on-read/scene/weekend.jpg",
  night: "/left-on-read/scene/night.jpg",
  noodle: "/left-on-read/scene/noodle.jpg",
} as const;
type PhotoId = keyof typeof PHOTO_SRC;
const PHOTO_SRC_W = 784;
const photos = new Map<PhotoId, HTMLImageElement>();

function photoOf(id: PhotoId): HTMLImageElement {
  let img = photos.get(id);
  if (!img) {
    img = new Image();
    img.src = PHOTO_SRC[id];
    photos.set(id, img);
  }
  return img;
}

/** 把圖裡從 top 開始的一段畫滿場景，鏡頭像呼吸一樣微微推拉；還沒載好就先黑著 */
function photoScene(ctx: Ctx, id: PhotoId, top: number, t: number) {
  rect(ctx, "#08080f", 0, 0, SCENE_W, SCENE_H);
  const img = photoOf(id);
  if (!img.complete || img.naturalWidth === 0) return;
  const zoom = 1.02 + 0.015 * Math.sin(t / 2600);
  const sw = PHOTO_SRC_W / zoom;
  const sh = (sw * SCENE_H) / SCENE_W;
  const fullH = (PHOTO_SRC_W * SCENE_H) / SCENE_W;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, (PHOTO_SRC_W - sw) / 2, top + (fullH - sh) / 2, sw, sh, 0, 0, SCENE_W, SCENE_H);
  ctx.restore();
}

export function drawOfficeScene(ctx: Ctx, t: number) {
  photoScene(ctx, "office", 215, t);
}

export function drawCommuteScene(ctx: Ctx, t: number) {
  photoScene(ctx, "commute", 110, t);
  rain(ctx, t, 0, 0, SCENE_W, SCENE_H, 30);
}

export function drawNoodleScene(ctx: Ctx, t: number) {
  photoScene(ctx, "noodle", 0, t);
  // 泡麵的熱氣
  for (let i = 0; i < 3; i++) {
    const p = saw(t + i * 700, 2100);
    rect(ctx, "#ffffff44", 84 + i * 4 + Math.sin(p * 6 + i) * 2, 82 - p * 18, 1, 2);
  }
}

export function drawNightScene(ctx: Ctx, t: number) {
  photoScene(ctx, "night", 0, t);
}

export function drawPhoneScene(ctx: Ctx, t: number) {
  photoScene(ctx, "phone", 170, t);
  // 手機是這個房間唯一的光
  glow(ctx, "#a8e8ff33", 71, 110, 30, t);
}

export function drawSleepScene(ctx: Ctx, t: number) {
  photoScene(ctx, "night", 0, t);
  rect(ctx, "#00000088", 0, 0, SCENE_W, SCENE_H);
  if (blink(t, 700)) pixelText(ctx, "z", 62, 36, 11, "#cbd5e8");
  if (blink(t + 350, 700)) pixelText(ctx, "Z", 70, 24, 14, "#cbd5e8");
}

/** 店裡那張圖：桌上擺的跟點的那道一樣，熱氣從碗口冒出來（速食沒有熱氣） */
const EATERY: Record<MealDish, { id: PhotoId; steam: readonly [number, number] | null }> = {
  bento: { id: "eatery", steam: [62, 102] },
  bowl: { id: "eateryBowl", steam: [60, 98] },
  dumplings: { id: "eateryDumplings", steam: [60, 110] },
  hotpot: { id: "eateryHotpot", steam: [58, 102] },
  fastfood: { id: "eateryFastfood", steam: null },
};

const eateryDraws = new Map<MealDish, (ctx: Ctx, t: number) => void>();

/** 同一道菜拿到同一個函式，畫面重繪時場景不會重來 */
export function eateryScene(dish: MealDish) {
  const cached = eateryDraws.get(dish);
  if (cached) return cached;
  const { id, steam } = EATERY[dish];
  const draw = (ctx: Ctx, t: number) => {
    photoScene(ctx, id, 0, t);
    if (!steam) return;
    for (let i = 0; i < 3; i++) {
      const p = saw(t + i * 800, 2400);
      rect(ctx, "#ffffff55", steam[0] + i * 9 + Math.sin(p * 6 + i) * 2, steam[1] - p * 16, 1, 2);
    }
  };
  eateryDraws.set(dish, draw);
  return draw;
}

export function drawWeekendScene(ctx: Ctx, t: number) {
  photoScene(ctx, "weekend", 0, t);
  // 窗戶進來的光裡，灰塵在飄
  for (let i = 0; i < 5; i++) {
    const p = saw(t + i * 1500, 7000);
    rect(ctx, "#fff8e0aa", 30 + i * 7, 14 + p * 36, 1, 1);
  }
}

// ---------- 領薪日：手機上的銀行通知 ----------

export function drawPaydaySlip(ctx: Ctx, t: number, net: string) {
  drawOfficeScene(ctx, t);
  rect(ctx, "#00000066", 0, 0, 180, 150);
  rect(ctx, "#101018", 56, 22, 68, 112);
  rect(ctx, "#e9f3e4", 60, 28, 60, 98);
  rect(ctx, "#2f7d5b", 60, 28, 60, 14);
  pixelText(ctx, "入帳通知", 90, 28, 12, "#ffffff", "center");
  const center = (text: string, y: number, color: string) => digits(ctx, text, 90 - digitsWidth(text, 2) / 2, y, color, 2);
  center("+36,000", 52, "#2f7d5b");
  center("-12,500", 72, "#c9352b");
  rect(ctx, "#8d9c88", 66, 90, 48, 1);
  center(net, 100, blink(t, 500) ? "#101018" : "#2f7d5b");
}
