/**
 * 開場影片的 5 個場景。背景是 public/left-on-read/intro/ 的四張圖，
 * 再疊上鏡頭推移、雨、時鐘、手機光和滑卡介面。t 是這個場景內的毫秒。
 */

import { generateGirl } from "@/lib/left-on-read/girl";
import {
  INTRO_COMMUTE_TEXT,
  INTRO_TAGLINE,
  INTRO_TITLE,
  SWIPE_BEATS,
  introClock,
  swipeBeatAt,
  type IntroSceneId,
} from "@/lib/left-on-read/intro";
import { digits, digitsWidth, pixelText, rain, rect, saw, type Ctx } from "./draw";
import { PHOTO_H, PHOTO_W, drawGirl } from "./girlSprite";

export const INTRO_W = 392;
export const INTRO_H = 584;
/** 四張圖的原始尺寸，下面的座標都是原圖上的位置 */
const SRC_W = 784;
const SRC_H = 1168;
const TO_SCREEN = INTRO_W / SRC_W;

type ImageId = "office" | "commute" | "bed" | "phone";
export type IntroImages = Partial<Record<ImageId, HTMLImageElement>>;

const FACE: Record<ImageId, readonly [number, number]> = {
  office: [335, 480],
  commute: [340, 370],
  bed: [195, 480],
  phone: [385, 345],
};
const PHONE_SCREEN = [310, 650] as const;

/** 載入四張圖；載入失敗的就留空，那一幕只剩黑底，不會卡住開場 */
export async function loadIntroImages(): Promise<IntroImages> {
  const ids: readonly ImageId[] = ["office", "commute", "bed", "phone"];
  const entries = await Promise.all(
    ids.map(
      (id) =>
        new Promise<[ImageId, HTMLImageElement | null]>((resolve) => {
          const img = new Image();
          img.onload = () => resolve([id, img]);
          img.onerror = () => resolve([id, null]);
          img.src = `/left-on-read/intro/${id}.jpg`;
        })
    )
  );
  const images: IntroImages = {};
  for (const [id, img] of entries) if (img) images[id] = img;
  return images;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** t 從 from 走到 to 的進度 0～1 */
const ramp = (t: number, from: number, to: number) => clamp01((t - from) / (to - from));

/** 畫一張圖：zoom 放大時 focus 這個點留在原位，鏡頭就像慢慢推向它 */
function photo(
  ctx: Ctx,
  img: HTMLImageElement | undefined,
  zoom: number,
  [fx, fy]: readonly [number, number],
  alpha = 1
) {
  if (!img || alpha <= 0) return;
  const sw = SRC_W / zoom;
  const sh = SRC_H / zoom;
  ctx.save();
  ctx.globalAlpha = alpha;
  // 圖本身就是像素畫，平滑取樣鏡頭移動時才不會閃爍
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, (SRC_W - sw) * (fx / SRC_W), (SRC_H - sh) * (fy / SRC_H), sw, sh, 0, 0, INTRO_W, INTRO_H);
  ctx.restore();
}

function darken(ctx: Ctx, alpha: number) {
  if (alpha <= 0) return;
  ctx.fillStyle = `rgba(0,0,0,${Math.min(1, alpha)})`;
  ctx.fillRect(0, 0, INTRO_W, INTRO_H);
}

/** 其他地方壓暗，只留一個圓 */
function spotlight(ctx: Ctx, cx: number, cy: number, radius: number, strength: number) {
  if (strength <= 0) return;
  const g = ctx.createRadialGradient(cx, cy, radius * 0.35, cx, cy, radius);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, INTRO_W, INTRO_H);
}

/** 有黑邊的字，疊在圖上才看得清楚 */
function outlined(ctx: Ctx, text: string, y: number, size: number, color: string) {
  const cx = INTRO_W / 2;
  for (const [ox, oy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [2, 2]] as const) {
    pixelText(ctx, text, cx + ox, y + oy, size, "#000000", "center");
  }
  pixelText(ctx, text, cx, y, size, color, "center");
}

// ---------- 場景 1：盯著時鐘等下班 ----------

const office = (ctx: Ctx, t: number, images: IntroImages) => {
  photo(ctx, images.office, 1 + 0.14 * (t / 7000), FACE.office);
  // 六點整之後他走了，辦公室的燈跟著暗下去
  darken(ctx, ramp(t, 5400, 7000) * 0.8);

  const text = introClock(t);
  const done = text === "18:00";
  const scale = 5;
  const w = digitsWidth(text, scale);
  const x = INTRO_W - w - 22;
  rect(ctx, "#000000cc", x - 10, 14, w + 20, 5 * scale + 16);
  digits(ctx, text, x, 22, done && Math.floor(t / 300) % 2 === 0 ? "#ffffff" : "#ff5a5a", scale);
};

// ---------- 場景 2：人很多，但只看得到他 ----------

const commute = (ctx: Ctx, t: number, images: IntroImages) => {
  photo(ctx, images.commute, 1 + 0.1 * (t / 6000), FACE.commute);
  rain(ctx, t, 0, 0, INTRO_W, 330, 70);
  const [fx, fy] = FACE.commute;
  spotlight(ctx, fx * TO_SCREEN, fy * TO_SCREEN, 170, ramp(t, 400, 2600) * 0.82);
  if (t > 1800) outlined(ctx, INTRO_COMMUTE_TEXT, 470, 34, "#f6f1de");
};

// ---------- 場景 3：丟下背包躺平，然後坐起來拿手機 ----------

function phoneGlow(ctx: Ctx, t: number, x: number, y: number, radius: number) {
  const pulse = 0.28 + 0.1 * Math.sin(t / 240);
  const g = ctx.createRadialGradient(x, y, 4, x, y, radius);
  g.addColorStop(0, `rgba(150,215,255,${pulse})`);
  g.addColorStop(1, "rgba(150,215,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, INTRO_W, INTRO_H);
}

const room = (ctx: Ctx, t: number, images: IntroImages) => {
  // 整個人倒上床的那一下，畫面晃一晃
  const thud = t < 320 ? Math.round(Math.sin(t / 22) * (320 - t) * 0.03) : 0;
  ctx.save();
  ctx.translate(0, thud);
  photo(ctx, images.bed, 1.04 + 0.1 * (t / 5200), FACE.bed);
  ctx.restore();
  rain(ctx, t, 205, 30, 100, 135, 14);

  const sitUp = ramp(t, 4300, 5200);
  if (sitUp > 0) {
    photo(ctx, images.phone, 1 + 0.08 * ramp(t, 4300, 7000), PHONE_SCREEN, sitUp);
    ctx.globalAlpha = sitUp;
    phoneGlow(ctx, t, PHONE_SCREEN[0] * TO_SCREEN, PHONE_SCREEN[1] * TO_SCREEN, 110);
    ctx.globalAlpha = 1;
  }
};

// ---------- 場景 4：手機畫面放大，開始滑 ----------

const CARD_SEEDS = [11, 23, 37, 41, 53, 67, 79] as const;
const cardCache = new Map<number, { photo: HTMLCanvasElement; label: string }>();

function card(seed: number) {
  const cached = cardCache.get(seed);
  if (cached) return cached;
  const girl = generateGirl(seed);
  const canvas = document.createElement("canvas");
  canvas.width = PHOTO_W;
  canvas.height = PHOTO_H;
  const c = canvas.getContext("2d");
  if (c) drawGirl(c, girl);
  const entry = { photo: canvas, label: `${girl.nickname} ${girl.age}` };
  cardCache.set(seed, entry);
  return entry;
}

const CARD_X = 56;
const CARD_Y = 76;
const CARD_W = 280;
const CARD_PHOTO_H = 350;
const CARD_H = CARD_PHOTO_H + 46;

function drawCard(ctx: Ctx, seed: number) {
  const { photo: picture, label } = card(seed);
  rect(ctx, "#000000", CARD_X - 3, CARD_Y - 3, CARD_W + 6, CARD_H + 6);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(picture, CARD_X, CARD_Y, CARD_W, CARD_PHOTO_H);
  rect(ctx, "#f4efe0", CARD_X, CARD_Y + CARD_PHOTO_H, CARD_W, 46);
  pixelText(ctx, label, CARD_X + 10, CARD_Y + CARD_PHOTO_H + 11, 22, "#20203c");
}

/** 右下角的小視窗：他現在的表情 */
function moodInset(ctx: Ctx, index: number, images: IntroImages) {
  const { mood } = SWIPE_BEATS[index];
  const img = mood === "hope" ? images.phone : images.office;
  const [fx, fy] = mood === "hope" ? FACE.phone : FACE.office;
  const size = 92;
  const x = INTRO_W - size - 8;
  const y = INTRO_H - size - 8;
  rect(ctx, "#000000", x - 3, y - 3, size + 6, size + 6);
  rect(ctx, "#f6f1de", x - 1, y - 1, size + 2, size + 2);
  if (img) {
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, fx - 95, fy - 95, 190, 190, x, y, size, size);
  }
  if (mood === "empty") {
    ctx.fillStyle = "rgba(10,12,30,0.45)";
    ctx.fillRect(x, y, size, size);
  }
}

function swipeUi(ctx: Ctx, images: IntroImages, index: number, exit: number) {
  const { dir } = SWIPE_BEATS[index];
  rect(ctx, "#05050c", 0, 0, INTRO_W, INTRO_H);
  rect(ctx, "#101018", 36, 22, 320, 540);
  rect(ctx, "#1b1b30", 44, 38, 304, 508);
  pixelText(ctx, "Swipy", 56, 46, 22, "#ff9fb4");

  // 下一張在底下等著，上面這張飛出去
  drawCard(ctx, CARD_SEEDS[index + 1]);
  if (exit < 1) {
    const sign = dir === "right" ? 1 : -1;
    ctx.save();
    ctx.translate(CARD_X + CARD_W / 2 + sign * exit * exit * 380, CARD_Y + CARD_H);
    ctx.rotate(sign * exit * 0.22);
    ctx.translate(-(CARD_X + CARD_W / 2), -(CARD_Y + CARD_H));
    drawCard(ctx, CARD_SEEDS[index]);
    if (exit > 0) {
      const color = dir === "right" ? "#ff5a7e" : "#e8e8f0";
      outlined(ctx, dir === "right" ? "♥" : "✕", CARD_Y + 110, 90, color);
    }
    ctx.restore();
  }

  // 按鈕：往哪邊滑，那顆就亮一下
  const pressed = exit > 0 ? dir : null;
  rect(ctx, "#000000", 118, 486, 52, 52);
  rect(ctx, pressed === "left" ? "#ffffff" : "#f4efe0", 121, 489, 46, 46);
  pixelText(ctx, "✕", 144, 497, 26, "#c0463c", "center");
  rect(ctx, "#000000", 196, 486, 52, 52);
  rect(ctx, pressed === "right" ? "#ffb3c6" : "#ff6f91", 199, 489, 46, 46);
  pixelText(ctx, "♥", 222, 497, 26, "#ffffff", "center");

  moodInset(ctx, index, images);
}

const swipe = (ctx: Ctx, t: number, images: IntroImages) => {
  const { index, exit } = swipeBeatAt(t);
  swipeUi(ctx, images, index, exit);
  // 開頭接著上一幕，鏡頭一路推進手機裡
  const dive = ramp(t, 0, 900);
  if (dive < 1) photo(ctx, images.phone, 1.08 + dive * dive * 3, PHONE_SCREEN, 1 - ramp(t, 550, 900));
};

// ---------- 場景 5：螢幕暗掉，倒回床上，片名 ----------

const end = (ctx: Ctx, t: number, images: IntroImages) => {
  rect(ctx, "#000000", 0, 0, INTRO_W, INTRO_H);
  if (t < 3000) {
    const { index, exit } = swipeBeatAt(Number.MAX_SAFE_INTEGER);
    if (t < 1500) swipeUi(ctx, images, index, exit);
    darken(ctx, ramp(t, 0, 1400));
    photo(ctx, images.bed, 1.14, FACE.bed, ramp(t, 1200, 1900));
    if (t > 1200) darken(ctx, 0.35 + ramp(t, 2200, 3000) * 0.65);
    return;
  }
  ctx.save();
  ctx.globalAlpha = ramp(t, 3100, 3700);
  pixelText(ctx, INTRO_TITLE, INTRO_W / 2 + 3, 203, 76, "#7a2c44", "center");
  pixelText(ctx, INTRO_TITLE, INTRO_W / 2, 200, 76, "#f6f1de", "center");
  rect(ctx, "#ff6f91", 46, 292, INTRO_W - 92, 4);
  ctx.globalAlpha = ramp(t, 4000, 4500);
  pixelText(ctx, INTRO_TAGLINE, INTRO_W / 2, 316, 22, "#a8acc8", "center");
  ctx.restore();
  // 游標一閃一閃，像在等對方輸入
  if (t > 4500 && saw(t, 900) < 0.5) rect(ctx, "#a8acc8", INTRO_W / 2 - 3, 362, 6, 14);
};

export const INTRO_SCENES: Record<IntroSceneId, (ctx: Ctx, tMs: number, images: IntroImages) => void> = {
  office,
  commute,
  room,
  swipe,
  end,
};
