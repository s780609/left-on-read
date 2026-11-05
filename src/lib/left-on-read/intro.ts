/**
 * 開場影片的時間表、文字和憂傷的旋律。畫面在 components/original/pixel/introScenes.ts。
 */

export type IntroSceneId = "office" | "commute" | "room" | "swipe" | "end";

export interface IntroShot {
  id: IntroSceneId;
  durationMs: number;
  /** 下一個分鏡接著這個畫面演，中間不淡出 */
  continues?: boolean;
}

export const INTRO_SHOTS: readonly IntroShot[] = [
  { id: "office", durationMs: 7000 },
  { id: "commute", durationMs: 6000 },
  { id: "room", durationMs: 7000, continues: true },
  { id: "swipe", durationMs: 9000, continues: true },
  { id: "end", durationMs: 6000 },
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
  if (localMs < 2400) return "17:58";
  if (localMs < 4200) return "17:59";
  return "18:00";
}

export function typewriterCount(text: string, localMs: number, charsPerSec: number): number {
  return Math.min(text.length, Math.floor((localMs * charsPerSec) / 1000));
}

export type SwipeMood = "bored" | "hope" | "empty";

export const SWIPE_BEAT_MS = 1500;
/** 卡片最後這段時間飛出去 */
const SWIPE_EXIT_MS = 350;
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
