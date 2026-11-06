/**
 * 片尾（ED）的分鏡表和進度規則。畫面在 components/original/screens/EdScreen.tsx。
 *
 * 和 beats.ts 不一樣，片尾是可以放著看的：每張圖停一段時間就自己換，按一下可以提早換。
 * 圖上的位置都是相對整張圖的百分比。
 */

export type EdEnding = "true" | "ladybug";

/** 圖上慢慢亮暗的光，例如手機螢幕 */
export interface EdGlow {
  x: number;
  y: number;
  /** 直徑，相對圖寬 */
  size: number;
  color: string;
}

export interface EdFrame {
  id: string;
  src: string;
  alt: string;
  caption?: string;
  /** 字幕放進圖裡畫好的空框，不放在圖下面 */
  captionInArt?: boolean;
  /** 圖裡對話框的字是亂碼，用這句蓋掉 */
  message?: { text: string; time: string };
  holdMs: number;
  /** 鏡頭慢慢推近的焦點；沒寫就不動 */
  focus?: { x: number; y: number };
  glows?: readonly EdGlow[];
}

/** 交叉淡入淡出的時間，算在每張圖的停留時間裡 */
export const ED_CROSSFADE_MS = 1100;
const CAPTION_HOLD_MS = 4400;
const TITLE_HOLD_MS = 5000;

/** 換圖後這段時間內的按鍵不算，連按兩下才不會跳過一張；片名也不會一閃就回選單 */
export const ED_TAP_GUARD_MS = 350;

const SRC = "/left-on-read/ed";

const PHONE: EdFrame = {
  id: "phone",
  src: `${SRC}/01-phone.jpg`,
  alt: "深夜的房間，冠宇披著毯子坐在床上看手機，窗外下著雨",
  caption: "凌晨，手機是房間裡唯一還亮著的東西。",
  holdMs: CAPTION_HOLD_MS,
  focus: { x: 46, y: 50 },
  glows: [{ x: 47, y: 51, size: 34, color: "#ffc97a" }],
};

const READ: Omit<EdFrame, "caption"> = {
  id: "read",
  src: `${SRC}/02-read.jpg`,
  alt: "冠宇低頭看手機，旁邊是他傳出去的訊息和綠色的已讀標記",
  captionInArt: true,
  message: { text: "今天過得好嗎？", time: "0:23 已讀" },
  holdMs: CAPTION_HOLD_MS,
  glows: [
    { x: 35, y: 55, size: 30, color: "#7fb2ff" },
    { x: 86, y: 40, size: 18, color: "#6dff9a" },
  ],
};

const TITLE: EdFrame = {
  id: "title",
  src: `${SRC}/05-title.jpg`,
  alt: "片名：已讀不回，END",
  holdMs: TITLE_HOLD_MS,
  glows: [{ x: 50, y: 70, size: 16, color: "#6dff9a" }],
};

export const ED_SEQUENCES: Record<EdEnding, readonly EdFrame[]> = {
  true: [
    PHONE,
    { ...READ, caption: "已讀。這兩個字，我看過很多次。" },
    {
      id: "morning",
      src: `${SRC}/06-morning.jpg`,
      alt: "早晨的房間灑滿陽光，手機留在枕頭上，床邊有背包和吃完的泡麵",
      caption: "天亮了。手機留在枕頭上，我先起床。",
      holdMs: CAPTION_HOLD_MS,
      focus: { x: 22, y: 52 },
    },
    {
      id: "walk",
      src: `${SRC}/04-walk.jpg`,
      alt: "夕陽下的河邊木棧道，冠宇和小晴的背影站在一起",
      caption: "她沒有回我訊息。因為她就站在旁邊。",
      holdMs: CAPTION_HOLD_MS,
      focus: { x: 50, y: 40 },
    },
    TITLE,
  ],
  ladybug: [
    PHONE,
    { ...READ, caption: "已讀。後來我不用再看這兩個字了。" },
    {
      id: "yoshiwara",
      src: `${SRC}/03-yoshiwara.jpg`,
      alt: "大阪飛田新地夜街，低矮木造店屋與紙燈籠，冠宇背影走在風俗店屋門口",
      caption: "飛田新地。紙燈籠比訊息還亮，格子門一開就有人朝外叫。",
      holdMs: CAPTION_HOLD_MS,
      focus: { x: 50, y: 42 },
      glows: [
        { x: 28, y: 28, size: 28, color: "#ff6f91" },
        { x: 72, y: 36, size: 22, color: "#ffb347" },
      ],
    },
    {
      id: "bangkok",
      src: `${SRC}/03-bangkok.jpg`,
      alt: "曼谷牛仔街霓虹夜色，冠宇背影站在 Nana 與 Cowboy 招牌之間",
      caption: "牛仔街。熱風、香水、標好的價錢。他沉下去了。",
      holdMs: CAPTION_HOLD_MS,
      focus: { x: 48, y: 50 },
      glows: [
        { x: 30, y: 35, size: 30, color: "#ff4fd8" },
        { x: 70, y: 40, size: 26, color: "#4ff0ff" },
      ],
    },
    TITLE,
  ],
};

/** 放著不按的話，整段片尾多長 */
export function edTotalMs(frames: readonly EdFrame[]): number {
  return frames.reduce((sum, f) => sum + f.holdMs, 0);
}

/** 下一張是第幾張；最後一張之後是 null，也就是回選單 */
export function nextEdIndex(index: number, frames: readonly EdFrame[]): number | null {
  return index + 1 < frames.length ? index + 1 : null;
}

/** 這張圖才剛出現的話，先不理玩家的按鍵 */
export function edTapAccepted(sinceFrameMs: number): boolean {
  return sinceFrameMs >= ED_TAP_GUARD_MS;
}
