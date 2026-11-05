/**
 * 開場影片的場景。背景是 public/left-on-read/intro/ 的插圖，
 * 再疊上鏡頭推移、雨、時鐘、手機光、心裡的話，以及 PTT、搜尋、滑卡這些手機畫面。
 * t 是這個場景內的毫秒。
 */

import { generateGirl } from "@/lib/left-on-read/girl";
import {
  INTRO_COMMUTE_TEXT,
  INTRO_SEARCH_QUERY,
  INTRO_TAGLINE,
  INTRO_TITLE,
  SWIPE_BEATS,
  SWIPE_BEAT_MS,
  easeIn,
  easeOut,
  easedRamp,
  PTT_TITLES,
  SEARCH_BEATS,
  introClock,
  introLineAt,
  swipeBeatAt,
  typewriterCount,
  type IntroSceneId,
} from "@/lib/left-on-read/intro";
import { digits, digitsWidth, pixelText, rain, rect, saw, textWidth, type Ctx } from "./draw";
import { PHOTO_H, PHOTO_W, drawGirl } from "./girlSprite";

export const INTRO_W = 392;
export const INTRO_H = 584;
/** 插圖的原始尺寸，下面的座標都是原圖上的位置 */
const SRC_W = 784;
const SRC_H = 1168;
const TO_SCREEN = INTRO_W / SRC_W;

type ImageId = "office" | "commute" | "bed" | "phone" | "game" | "video" | "lonely";
export type IntroImages = Partial<Record<ImageId, HTMLImageElement>>;

const FACE: Record<ImageId, readonly [number, number]> = {
  office: [335, 480],
  commute: [340, 370],
  bed: [195, 480],
  phone: [385, 345],
  game: [525, 319],
  video: [188, 491],
  lonely: [285, 411],
};
/** 遊戲螢幕、橫拿的手機、床上蓋著的手機：光從這些地方來 */
const GAME_SCREEN = [342, 376] as const;
const VIDEO_PHONE = [171, 656] as const;
const LONELY_PHONE = [580, 787] as const;
const PHONE_SCREEN = [310, 650] as const;
/** 螢幕朝著他，光從手機上緣打到手和臉上 */
const PHONE_LIGHT = [335, 560] as const;

/** 載入插圖；載入失敗的就留空，那一幕只剩黑底，不會卡住開場 */
export async function loadIntroImages(): Promise<IntroImages> {
  const ids: readonly ImageId[] = ["office", "commute", "bed", "phone", "game", "video", "lonely"];
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

export interface IntroSceneOpts {
  /** 減少動態效果：鏡頭不推、不晃、卡片不甩 */
  still?: boolean;
}

/** t 從 from 走到 to 的緩動進度 0～1，慢進慢出 */
const ramp = easedRamp;
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
/** 鏡頭焦點從 a 慢慢移到 b */
const pan = (a: readonly [number, number], b: readonly [number, number], p: number) =>
  [lerp(a[0], b[0], p), lerp(a[1], b[1], p)] as const;

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

/** 心裡的話：底部一條半透明的字幕，換句時淡入、往上浮一點 */
function monologue(ctx: Ctx, id: IntroSceneId, t: number, still = false) {
  const line = introLineAt(id, t);
  if (!line) return;
  const show = easeOut(line.sinceMs / 380);
  const size = 22;
  const w = Math.min(INTRO_W - 24, textWidth(line.text, size) + 32);
  const y = 506 + (still ? 0 : Math.round(6 * (1 - show)));
  ctx.save();
  ctx.globalAlpha = show * 0.72;
  rect(ctx, "#05050c", Math.round((INTRO_W - w) / 2), y - 10, Math.round(w), size + 20);
  ctx.globalAlpha = show;
  pixelText(ctx, line.text, INTRO_W / 2, y, size, "#f6f1de", "center");
  ctx.restore();
}

/** 手機、螢幕這種冷光，一點一點地呼吸 */
function coldLight(ctx: Ctx, t: number, x: number, y: number, radius: number, color = "150,215,255", base = 0.26) {
  const pulse = base + 0.08 * Math.sin(t / 260);
  const g = ctx.createRadialGradient(x, y, 4, x, y, radius);
  g.addColorStop(0, `rgba(${color},${pulse})`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, INTRO_W, INTRO_H);
}

const at = ([x, y]: readonly [number, number]) => [x * TO_SCREEN, y * TO_SCREEN] as const;

// ---------- 場景 1：盯著時鐘等下班 ----------

const office = (ctx: Ctx, t: number, images: IntroImages, { still }: IntroSceneOpts) => {
  // 鏡頭從整間辦公室慢慢推到他臉上，起步和停下都是緩的
  const cam = still ? 0 : ramp(t, 0, 4500);
  photo(ctx, images.office, 1 + 0.14 * cam, pan([360, 560], FACE.office, cam));
  // 六點整之後他走了，辦公室的燈跟著暗下去
  darken(ctx, ramp(t, 3500, 4500) * 0.8);

  const text = introClock(t);
  const done = text === "18:00";
  const scale = 5;
  const w = digitsWidth(text, scale);
  const x = INTRO_W - w - 22;
  rect(ctx, "#000000cc", x - 10, 14, w + 20, 5 * scale + 16);
  digits(ctx, text, x, 22, done && Math.floor(t / 300) % 2 === 0 ? "#ffffff" : "#ff5a5a", scale);
};

// ---------- 場景 2：人很多，但只看得到他 ----------

const commute = (ctx: Ctx, t: number, images: IntroImages, { still }: IntroSceneOpts) => {
  const cam = still ? 0 : ramp(t, 0, 4500);
  photo(ctx, images.commute, 1 + 0.1 * cam, pan([340, 470], FACE.commute, cam));
  rain(ctx, t, 0, 0, INTRO_W, 330, 70);
  const [fx, fy] = FACE.commute;
  // 聚光燈收得慢一點，人群一點一點暗下去
  spotlight(ctx, fx * TO_SCREEN, fy * TO_SCREEN, lerp(260, 170, ramp(t, 300, 2400)), ramp(t, 300, 2400) * 0.82);
  // 字淡入、往上浮一點點再停住
  const show = easeOut((t - 1100) / 800);
  if (show > 0) {
    ctx.save();
    ctx.globalAlpha = show;
    outlined(ctx, INTRO_COMMUTE_TEXT, Math.round(420 - 8 * show), 34, "#f6f1de");
    ctx.restore();
  }
  monologue(ctx, "commute", t, still);
};

// ---------- 場景 3：丟下背包躺平 ----------

function phoneGlow(ctx: Ctx, t: number, x: number, y: number, radius: number) {
  const pulse = 0.28 + 0.1 * Math.sin(t / 240);
  const g = ctx.createRadialGradient(x, y, 4, x, y, radius);
  g.addColorStop(0, `rgba(150,215,255,${pulse})`);
  g.addColorStop(1, "rgba(150,215,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, INTRO_W, INTRO_H);
}

const room = (ctx: Ctx, t: number, images: IntroImages, { still }: IntroSceneOpts) => {
  // 整個人倒上床的那一下，畫面往下沉再彈回來，晃動慢慢收掉
  const thud = still || t >= 700 ? 0 : 7 * Math.sin((t / 700) * Math.PI * 2.5) * (1 - t / 700) ** 2;
  ctx.save();
  ctx.translate(0, thud);
  photo(ctx, images.bed, 1.04 + (still ? 0 : 0.08 * ramp(t, 0, 3000)), FACE.bed);
  ctx.restore();
  rain(ctx, t, 205, 30, 100, 135, 14);
  monologue(ctx, "room", t, still);
};

// ---------- 場景 4：開了遊戲，打不下去 ----------

const game = (ctx: Ctx, t: number, images: IntroImages, { still }: IntroSceneOpts) => {
  const cam = still ? 0 : ramp(t, 0, 3500);
  photo(ctx, images.game, 1.02 + 0.08 * cam, pan(GAME_SCREEN, FACE.game, cam));
  // 遊戲畫面一閃一閃地打在臉上，他沒什麼反應
  const [sx, sy] = at(GAME_SCREEN);
  const flash = ["255,120,200", "120,200,255", "255,220,120"][Math.floor(t / 420) % 3];
  coldLight(ctx, t, sx, sy, 150, flash, 0.16);
  // 後半段光慢慢暗下去：關掉了
  darken(ctx, ramp(t, 2400, 3500) * 0.35);
  monologue(ctx, "game", t, still);
};

// ---------- 場景 5：換看 YouTube，也看不下去 ----------

const video = (ctx: Ctx, t: number, images: IntroImages, { still }: IntroSceneOpts) => {
  const cam = still ? 0 : ramp(t, 0, 3500);
  photo(ctx, images.video, 1.04 + 0.08 * cam, FACE.video);
  const [px, py] = at(VIDEO_PHONE);
  coldLight(ctx, t, px, py, 120);
  monologue(ctx, "video", t, still);
};

// ---------- 場景 6：滑 PTT，標題一直往上跑 ----------

function phoneFrame(ctx: Ctx, bg: string) {
  rect(ctx, "#05050c", 0, 0, INTRO_W, INTRO_H);
  rect(ctx, "#101018", 36, 22, 320, 540);
  rect(ctx, bg, 44, 38, 304, 508);
}

const ptt = (ctx: Ctx, t: number, images: IntroImages, { still }: IntroSceneOpts) => {
  phoneFrame(ctx, "#000000");
  rect(ctx, "#1f3fbf", 44, 38, 304, 28);
  pixelText(ctx, "【看板】Gossiping", 54, 44, 16, "#ffffff");
  // 標題一條一條往上跑，滑得越來越慢
  const rowH = 34;
  const scroll = still ? 0 : (1 - (1 - Math.min(1, t / 3500)) ** 2) * rowH * 6;
  ctx.save();
  ctx.beginPath();
  ctx.rect(44, 70, 304, 476);
  ctx.clip();
  for (let i = 0; i < PTT_TITLES.length + 6; i++) {
    const y = 80 + i * rowH - scroll;
    if (y < 50 || y > 560) continue;
    const title = PTT_TITLES[i % PTT_TITLES.length];
    const push = [12, 3, 87, 1, 45, 2, 9, 31, 5, 18][i % 10];
    pixelText(ctx, push >= 30 ? "爆" : String(push), 58, y, 15, push >= 30 ? "#ff5a5a" : "#7fd67f");
    pixelText(ctx, title, 92, y, 15, title.startsWith("Re:") ? "#c8c8c8" : "#f0f0f0");
  }
  ctx.restore();
  // 右下角他的臉：沒表情
  const size = 92;
  const x = INTRO_W - size - 8;
  const y = INTRO_H - size - 8;
  rect(ctx, "#000000", x - 3, y - 3, size + 6, size + 6);
  rect(ctx, "#f6f1de", x - 1, y - 1, size + 2, size + 2);
  if (images.video) {
    ctx.imageSmoothingEnabled = true;
    const [fx, fy] = FACE.video;
    ctx.drawImage(images.video, fx - 95, fy - 95, 190, 190, x, y, size, size);
  }
  ctx.fillStyle = "rgba(10,12,30,0.35)";
  ctx.fillRect(x, y, size, size);
  monologue(ctx, "ptt", t, still);
};

// ---------- 場景 7：突然好安靜，好冷 ----------

const lonely = (ctx: Ctx, t: number, images: IntroImages, { still }: IntroSceneOpts) => {
  // 鏡頭往後退，房間顯得越來越大
  const cam = still ? 1 : ramp(t, 0, 4500);
  photo(ctx, images.lonely, 1.16 - 0.14 * cam, FACE.lonely);
  rain(ctx, t, 200, 22, 120, 166, 16);
  // 越來越冷：整個畫面慢慢壓上一層藍
  ctx.fillStyle = `rgba(20,40,110,${0.08 + 0.2 * ramp(t, 1500, 4000)})`;
  ctx.fillRect(0, 0, INTRO_W, INTRO_H);
  // 蓋著的手機邊緣透著光，最後亮了一下：他想到了什麼
  const [px, py] = at(LONELY_PHONE);
  coldLight(ctx, t, px, py, 60 + 30 * ramp(t, 2800, 3400), "150,215,255", 0.22 + 0.16 * ramp(t, 2800, 3400));
  // 他把手機拿起來：交疊到坐起來看手機的那張圖
  const pickUp = ramp(t, 3500, 4300);
  if (pickUp > 0) {
    photo(ctx, images.phone, 1 + (still ? 0 : 0.06 * ramp(t, 3500, 4500)), PHONE_SCREEN, pickUp);
    ctx.globalAlpha = pickUp;
    phoneGlow(ctx, t, PHONE_LIGHT[0] * TO_SCREEN, PHONE_LIGHT[1] * TO_SCREEN, 110);
    ctx.globalAlpha = 1;
  }
  monologue(ctx, "lonely", t, still);
};

// ---------- 場景 8：查最多人用的交友 App，下載、打開 ----------

function swipyIcon(ctx: Ctx, x: number, y: number, size: number) {
  rect(ctx, "#000000", x - 2, y - 2, size + 4, size + 4);
  rect(ctx, "#ff6f91", x, y, size, size);
  pixelText(ctx, "♥", x + size / 2, y + size * 0.18, Math.round(size * 0.6), "#ffffff", "center");
}

/** Swipy 的啟動畫面：粉紅底、大愛心 */
function swipySplash(ctx: Ctx, alpha: number) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  rect(ctx, "#ff6f91", 44, 38, 304, 508);
  pixelText(ctx, "♥", INTRO_W / 2, 210, 72, "#ffffff", "center");
  pixelText(ctx, "Swipy", INTRO_W / 2, 300, 34, "#ffffff", "center");
  ctx.restore();
}

const search = (ctx: Ctx, t: number, _images: IntroImages, { still }: IntroSceneOpts) => {
  const { typedAt, resultsAt, installAt, installedAt, openAt } = SEARCH_BEATS;
  phoneFrame(ctx, "#1b1b30");
  // 搜尋框：一個字一個字打進去，游標一閃一閃
  rect(ctx, "#000000", 58, 56, 276, 40);
  rect(ctx, "#f4efe0", 60, 58, 272, 36);
  const typed = INTRO_SEARCH_QUERY.slice(0, typewriterCount(INTRO_SEARCH_QUERY, Math.max(0, t - 200), (INTRO_SEARCH_QUERY.length * 1000) / (typedAt - 200)));
  pixelText(ctx, typed, 72, 67, 18, "#20203c");
  if (t < resultsAt && saw(t, 700) < 0.5) rect(ctx, "#20203c", 74 + textWidth(typed, 18), 66, 2, 20);

  const results = easeOut((t - resultsAt) / 400);
  if (results > 0) {
    ctx.save();
    ctx.globalAlpha = results;
    const lift = still ? 0 : Math.round(10 * (1 - results));
    // 第一個結果就是它
    const y = 116 + lift;
    rect(ctx, "#26264a", 56, y, 280, 120);
    swipyIcon(ctx, 68, y + 14, 56);
    pixelText(ctx, "Swipy", 136, y + 14, 22, "#f6f1de");
    pixelText(ctx, "下載排行第 1 名", 136, y + 42, 15, "#ffd27a");
    pixelText(ctx, "★ 4.8　大家都在用", 136, y + 62, 15, "#a8acc8");
    // 取得 → 下載中 → 開啟
    const installing = t >= installAt && t < installedAt;
    const installed = t >= installedAt;
    const label = installed ? "開啟" : installing ? "" : "取得";
    const pressed = (t >= installAt && t < installAt + 160) || (t >= openAt && t < openAt + 160);
    rect(ctx, "#000000", 244, y + 84, 82, 28);
    rect(ctx, pressed ? "#ffb3c6" : "#ff6f91", 246, y + 86, 78, 24);
    if (installing) {
      const p = (t - installAt) / (installedAt - installAt);
      rect(ctx, "#ffffff", 250, y + 96, Math.round(70 * p), 4);
    } else pixelText(ctx, label, 285, y + 89, 15, "#ffffff", "center");
    // 其他結果灰灰的，他沒在看
    for (let i = 0; i < 3; i++) {
      const ry = y + 140 + i * 74;
      rect(ctx, "#20203c", 56, ry, 280, 60);
      rect(ctx, "#33335a", 68, ry + 12, 36, 36);
      rect(ctx, "#33335a", 116, ry + 16, 130 - i * 20, 10);
      rect(ctx, "#2a2a4a", 116, ry + 34, 170 - i * 30, 8);
    }
    ctx.restore();
  }
  // 打開：粉紅的啟動畫面漲滿螢幕
  swipySplash(ctx, easeOut((t - openAt - 150) / 450));
  monologue(ctx, "search", t, still);
};

// ---------- 場景 9：開始滑 ----------

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

function swipeUi(ctx: Ctx, images: IntroImages, index: number, exit: number, still = false) {
  const { dir } = SWIPE_BEATS[index];
  rect(ctx, "#05050c", 0, 0, INTRO_W, INTRO_H);
  rect(ctx, "#101018", 36, 22, 320, 540);
  rect(ctx, "#1b1b30", 44, 38, 304, 508);
  pixelText(ctx, "Swipy", 56, 46, 22, "#ff9fb4");

  // 下一張在底下等著，上面這張飛出去
  // 底下那張跟著慢慢浮上來
  const rise = still ? 1 : 0.95 + 0.05 * easeOut(exit);
  ctx.save();
  ctx.translate(CARD_X + CARD_W / 2, CARD_Y + CARD_H / 2);
  ctx.scale(rise, rise);
  ctx.translate(-(CARD_X + CARD_W / 2), -(CARD_Y + CARD_H / 2));
  drawCard(ctx, CARD_SEEDS[index + 1]);
  ctx.restore();
  if (exit < 1) {
    const sign = dir === "right" ? 1 : -1;
    const fly = still ? 0 : easeIn(exit);
    ctx.save();
    ctx.globalAlpha = still ? 1 - exit : 1;
    ctx.translate(CARD_X + CARD_W / 2 + sign * fly * 400, CARD_Y + CARD_H);
    ctx.rotate(sign * fly * 0.26);
    ctx.translate(-(CARD_X + CARD_W / 2), -(CARD_Y + CARD_H));
    drawCard(ctx, CARD_SEEDS[index]);
    if (exit > 0) {
      const color = dir === "right" ? "#ff5a7e" : "#e8e8f0";
      ctx.globalAlpha = Math.min(1, exit * 4) * ctx.globalAlpha;
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

/** 換表情時小視窗交疊一下，不要一下子跳掉 */
function moodInsetBlend(ctx: Ctx, images: IntroImages, t: number) {
  const { index } = swipeBeatAt(t);
  const into = (t - index * SWIPE_BEAT_MS) / 300;
  if (index === 0 || into >= 1) return;
  if (SWIPE_BEATS[index - 1].mood === SWIPE_BEATS[index].mood) return;
  ctx.save();
  ctx.globalAlpha = 1 - easeOut(into);
  moodInset(ctx, index - 1, images);
  ctx.restore();
}

const swipe = (ctx: Ctx, t: number, images: IntroImages, { still }: IntroSceneOpts) => {
  const { index, exit } = swipeBeatAt(t);
  swipeUi(ctx, images, index, exit, still);
  moodInsetBlend(ctx, images, t);
  // 開頭接著上一幕的啟動畫面，粉紅慢慢退掉，露出第一張卡
  swipySplash(ctx, 1 - ramp(t, 100, 700));
};

// ---------- 場景 10：螢幕暗掉，倒回床上，片名 ----------

const end = (ctx: Ctx, t: number, images: IntroImages, { still }: IntroSceneOpts) => {
  rect(ctx, "#000000", 0, 0, INTRO_W, INTRO_H);
  if (t < 3000) {
    const { index, exit } = swipeBeatAt(Number.MAX_SAFE_INTEGER);
    // 螢幕暗掉，床那張圖從黑裡浮出來，再一起沉下去
    const screenOff = ramp(t, 0, 1400);
    if (screenOff < 1) {
      swipeUi(ctx, images, index, exit, still);
      darken(ctx, screenOff);
    }
    const bed = ramp(t, 1000, 2000);
    photo(ctx, images.bed, still ? 1.14 : 1.12 + 0.03 * ramp(t, 1000, 3000), FACE.bed, bed);
    if (bed > 0) darken(ctx, 0.35 + ramp(t, 2100, 3000) * 0.65);
    return;
  }
  // 片名淡入、從下面浮上來一點；粉紅線從中間往兩邊拉開；標語晚一拍
  const title = easeOut((t - 3100) / 900);
  const line = easeOut((t - 3400) / 700);
  const tag = easeOut((t - 4000) / 700);
  const lift = still ? 0 : Math.round(10 * (1 - title));
  ctx.save();
  ctx.globalAlpha = title;
  pixelText(ctx, INTRO_TITLE, INTRO_W / 2 + 3, 203 + lift, 76, "#7a2c44", "center");
  pixelText(ctx, INTRO_TITLE, INTRO_W / 2, 200 + lift, 76, "#f6f1de", "center");
  ctx.globalAlpha = 1;
  const lineW = Math.round((INTRO_W - 92) * line);
  if (lineW > 0) rect(ctx, "#ff6f91", INTRO_W / 2 - lineW / 2, 292, lineW, 4);
  ctx.globalAlpha = tag;
  pixelText(ctx, INTRO_TAGLINE, INTRO_W / 2, 316 + (still ? 0 : Math.round(6 * (1 - tag))), 22, "#a8acc8", "center");
  ctx.restore();
  // 游標一閃一閃，像在等對方輸入
  if (t > 4500 && saw(t, 900) < 0.5) rect(ctx, "#a8acc8", INTRO_W / 2 - 3, 362, 6, 14);
};

export const INTRO_SCENES: Record<
  IntroSceneId,
  (ctx: Ctx, tMs: number, images: IntroImages, opts: IntroSceneOpts) => void
> = {
  office,
  commute,
  room,
  game,
  video,
  ptt,
  lonely,
  search,
  swipe,
  end,
};
