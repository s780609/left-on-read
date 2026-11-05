/**
 * 開場影片的時間表、文字和憂傷的旋律。畫面在 components/original/pixel/introScenes.ts。
 */

export type IntroSceneId =
  | "office"
  | "commute"
  | "room"
  | "game"
  | "video"
  | "ptt"
  | "lonely"
  | "search"
  | "swipe"
  | "end";

export interface IntroShot {
  id: IntroSceneId;
  durationMs: number;
  /** 下一個分鏡接著這個畫面演，中間不淡出 */
  continues?: boolean;
}

/**
 * 下班、兩點一線回家；遊戲、YouTube、PTT 都提不起勁；
 * 突然覺得好孤單、好冷；查了最多人用的交友 App，開始滑。
 */
export const INTRO_SHOTS: readonly IntroShot[] = [
  { id: "office", durationMs: 4500 },
  { id: "commute", durationMs: 4500 },
  { id: "room", durationMs: 3000 },
  { id: "game", durationMs: 3500 },
  { id: "video", durationMs: 3500 },
  { id: "ptt", durationMs: 3500 },
  { id: "lonely", durationMs: 4500 },
  { id: "search", durationMs: 4500, continues: true },
  { id: "swipe", durationMs: 6600, continues: true },
  { id: "end", durationMs: 5500 },
];

/** 冠宇心裡的話：每個分鏡從 atMs 開始換成這一句 */
export const INTRO_LINES: Partial<Record<IntroSceneId, readonly { atMs: number; text: string }[]>> = {
  commute: [{ atMs: 2600, text: "公司、捷運、租屋處。兩點一線。" }],
  room: [
    { atMs: 500, text: "到家了。" },
    { atMs: 1500, text: "今天也什麼都沒發生。" },
  ],
  game: [
    { atMs: 300, text: "開了遊戲。" },
    { atMs: 1700, text: "打了兩場，不知道在打什麼。" },
  ],
  video: [
    { atMs: 300, text: "換看 YouTube。" },
    { atMs: 1700, text: "推薦的影片，好像都看過了。" },
  ],
  ptt: [
    { atMs: 300, text: "滑一下 PTT。" },
    { atMs: 1900, text: "滑一滑……好無聊。" },
  ],
  lonely: [
    { atMs: 500, text: "房間突然好安靜。" },
    { atMs: 2000, text: "……好冷。" },
    { atMs: 3100, text: "不是天氣的那種冷。" },
  ],
  search: [{ atMs: 2300, text: "……試試看好了。" }],
};

/** 這個時間點該顯示哪一句、已經出現多久；還沒輪到就是 null */
export function introLineAt(id: IntroSceneId, localMs: number): { text: string; sinceMs: number } | null {
  const lines = INTRO_LINES[id];
  if (!lines) return null;
  let current: { text: string; sinceMs: number } | null = null;
  for (const line of lines) {
    if (localMs >= line.atMs) current = { text: line.text, sinceMs: localMs - line.atMs };
  }
  return current;
}

/** 搜尋框裡打的字 */
export const INTRO_SEARCH_QUERY = "最多人用的交友軟體";

/** 搜尋那一幕的節奏：打字 → 結果 → 下載 → 打開 */
export const SEARCH_BEATS = {
  typedAt: 1500,
  resultsAt: 1700,
  installAt: 2700,
  installedAt: 3500,
  openAt: 3800,
} as const;

/** PTT 上滑過去的標題（都是虛構的） */
export const PTT_TITLES: readonly string[] = [
  "[問卦] 下班回家都在幹嘛？",
  "[閒聊] 一個人吃飯都配什麼",
  "[問卦] 有沒有北漂的八卦",
  "Re: [問卦] 下班回家都在幹嘛？",
  "[新聞] 雙北房租再創新高",
  "[心情] 今天也沒有人敲我",
  "[問卦] 週末都待在家正常嗎",
  "[閒聊] 交友軟體真的有用嗎",
  "[問卦] 為什麼越滑越空虛",
  "[閒聊] 好冷，大家都在幹嘛",
];

export const INTRO_COMMUTE_TEXT = "北漂第 2 年";
export const INTRO_TITLE = "已讀不回";
export const INTRO_TAGLINE = "每天都在等一個回覆。";

const TOTAL_MS = INTRO_SHOTS.reduce((sum, s) => sum + s.durationMs, 0);

export function introShotAt(tMs: number): { index: number; localMs: number; done: boolean } {
  if (tMs >= TOTAL_MS) {
    const index = INTRO_SHOTS.length - 1;
    return { index, localMs: INTRO_SHOTS[index].durationMs, done: true };
  }
  let start = 0;
  for (let index = 0; index < INTRO_SHOTS.length; index++) {
    const { durationMs } = INTRO_SHOTS[index];
    if (tMs < start + durationMs) return { index, localMs: tMs - start, done: false };
    start += durationMs;
  }
  return { index: 0, localMs: 0, done: false };
}

// ---------- 緩動與轉場：鏡頭、淡入淡出都用這些，動起來才不會一格一格硬切 ----------

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** 慢進慢出 */
export function easeInOut(p: number): number {
  const x = clamp01(p);
  return 0.5 - 0.5 * Math.cos(Math.PI * x);
}

/** 快進慢停：字和卡片落定用 */
export function easeOut(p: number): number {
  const x = clamp01(p);
  return 1 - (1 - x) ** 3;
}

/** 慢起快走：卡片被甩出去用 */
export function easeIn(p: number): number {
  const x = clamp01(p);
  return x * x * x;
}

/** t 從 from 走到 to 的緩動進度 0～1 */
export function easedRamp(t: number, from: number, to: number): number {
  return easeInOut((t - from) / (to - from));
}

/** 分鏡之間淡入淡出的長度 */
export const INTRO_FADE_MS = 650;

/**
 * 這一格要蓋多少黑（0～1）。接著演的分鏡之間不淡出；
 * 其他交界前後各淡 INTRO_FADE_MS，用緩動讓黑幕自然地落下、再自然地掀開。
 */
export function shotFadeAt(index: number, localMs: number): number {
  const shot = INTRO_SHOTS[index];
  if (!shot) return 0;
  const prev = INTRO_SHOTS[index - 1];
  const fadeIn = prev?.continues ? Infinity : localMs;
  const fadeOut = shot.continues ? Infinity : shot.durationMs - localMs;
  const f = Math.min(fadeIn, fadeOut);
  if (f >= INTRO_FADE_MS) return 0;
  return 1 - easeInOut(Math.max(0, f) / INTRO_FADE_MS);
}

/** 辦公室的時鐘：盯著它從 17:58 走到 18:00 */
export function introClock(localMs: number): string {
  if (localMs < 1700) return "17:58";
  if (localMs < 3100) return "17:59";
  return "18:00";
}

export function typewriterCount(text: string, localMs: number, charsPerSec: number): number {
  return Math.min(text.length, Math.floor((localMs * charsPerSec) / 1000));
}

export type SwipeMood = "bored" | "hope" | "empty";

export const SWIPE_BEAT_MS = 1100;
/** 卡片最後這段時間飛出去 */
const SWIPE_EXIT_MS = 300;
export const SWIPE_BEATS: readonly { dir: "left" | "right"; mood: SwipeMood }[] = [
  { dir: "left", mood: "bored" },
  { dir: "left", mood: "bored" },
  { dir: "right", mood: "hope" },
  { dir: "left", mood: "hope" },
  { dir: "left", mood: "empty" },
  { dir: "left", mood: "empty" },
];

/** 這個時間點滑到第幾張；exit 是這張卡飛出去的進度（0～1） */
export function swipeBeatAt(localMs: number): { index: number; exit: number } {
  const index = Math.min(SWIPE_BEATS.length - 1, Math.floor(localMs / SWIPE_BEAT_MS));
  const elapsed = localMs - index * SWIPE_BEAT_MS;
  return { index, exit: Math.min(1, Math.max(0, (elapsed - (SWIPE_BEAT_MS - SWIPE_EXIT_MS)) / SWIPE_EXIT_MS)) };
}

/** 慢板的 A 小調：左手分解和弦，右手一段往下走又走不回去的旋律 */
const BEAT = 0.75;
/** 和弦根音（每小節四拍） */
const CHORDS: readonly (readonly [number, number, number])[] = [
  [45, 52, 60], // Am
  [41, 48, 57], // F
  [48, 55, 64], // C
  [43, 50, 59], // G
  [45, 52, 60], // Am
  [41, 48, 57], // F
  [38, 45, 53], // Dm
  [40, 47, 56], // E
];
/** 右手旋律：[第幾拍, midi, 幾拍] */
const TUNE: readonly (readonly [number, number, number])[] = [
  [0, 76, 2], [2, 72, 1], [3, 71, 1],
  [4, 69, 3], [7, 72, 1],
  [8, 71, 2], [10, 67, 2],
  [12, 67, 1], [13, 69, 1], [14, 71, 2],
  [16, 72, 2], [18, 71, 1], [19, 69, 1],
  [20, 65, 3], [23, 69, 1],
  [24, 69, 2], [26, 65, 1], [27, 64, 1],
  [28, 64, 4],
];

function buildMelody(): { midi: number; time: number; duration: number }[] {
  const notes: { midi: number; time: number; duration: number }[] = [];
  for (let repeat = 0; repeat < 2; repeat++) {
    const offsetBeats = repeat * CHORDS.length * 4;
    CHORDS.forEach(([root, fifth, third], bar) => {
      [root, fifth, third, fifth].forEach((midi, beat) => {
        notes.push({ midi, time: (offsetBeats + bar * 4 + beat) * BEAT, duration: BEAT * 1.5 });
      });
    });
    for (const [beat, midi, beats] of TUNE) {
      notes.push({ midi, time: (offsetBeats + beat) * BEAT, duration: beats * BEAT * 0.95 });
    }
  }
  const totalSec = TOTAL_MS / 1000;
  return notes
    .filter((n) => n.time + n.duration <= totalSec)
    .sort((a, b) => a.time - b.time);
}

/** time 單位是秒，對應 scheduleNote */
export const INTRO_MELODY: readonly { midi: number; time: number; duration: number }[] = buildMelody();
