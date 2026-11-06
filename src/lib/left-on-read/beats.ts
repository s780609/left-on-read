/**
 * 結局「一段一段按著看」的進度規則。畫面在 components/original/screens/BeatPlayer.tsx。
 *
 * 這裡刻意沒有時間參數：台詞只會因為玩家按了才換，沒有任何東西會自動把字清掉。
 */

export type BeatWho = "me" | "her";

/** 這一幕是手機聊天室，訊息一出現就是完整的，不用打字機 */
export const CHAT_SCENE = "chat";

export interface Beat<S extends string = string> {
  scene: S;
  text: string;
  /** 誰講的；沒寫就是旁白 */
  who?: BeatWho;
  /** 進這一段前的黑幕放慢，用在情緒轉折 */
  fade?: "slow";
}

export interface BeatProgress {
  index: number;
  /** 這一句的字打完了沒 */
  typed: boolean;
  /** 黑幕正在落下，落完才換下一幕 */
  fading: boolean;
}

/** 和開場分鏡交界一樣的節奏 */
export const BEAT_FADE_MS = 650;
export const BEAT_SLOW_FADE_MS = 1400;

export function startBeats(beats: readonly Beat[], index = 0): BeatProgress {
  return { index, typed: beats[index]?.scene === CHAT_SCENE, fading: false };
}

/** 按一下：字還在打就先打完；打完才往下；要換幕就先落黑幕；最後一段不會再動 */
export function tapBeat(progress: BeatProgress, beats: readonly Beat[]): BeatProgress {
  if (progress.fading) return progress;
  if (!progress.typed) return { ...progress, typed: true };
  const next = beats[progress.index + 1];
  if (!next) return progress;
  if (next.scene !== beats[progress.index].scene) return { ...progress, fading: true };
  return startBeats(beats, progress.index + 1);
}

/** 打字機自己打完了 */
export function markBeatTyped(progress: BeatProgress): BeatProgress {
  return progress.typed ? progress : { ...progress, typed: true };
}

/** 黑幕全黑了，換到下一幕 */
export function finishBeatFade(progress: BeatProgress, beats: readonly Beat[]): BeatProgress {
  return progress.fading ? startBeats(beats, progress.index + 1) : progress;
}

/** 這一幕是從第幾段開始的：連續同一個場景算同一幕 */
export function beatChapterStart(beats: readonly Beat[], index: number): number {
  let start = index;
  while (start > 0 && beats[start - 1].scene === beats[index].scene) start--;
  return start;
}

/** 現在畫面上的台詞：同一幕講過的都留著，換幕才清 */
export function visibleBeats<S extends string>(beats: readonly Beat<S>[], index: number): Beat<S>[] {
  return beats.slice(beatChapterStart(beats, index), index + 1);
}

/** 換到 beat 這一段時，黑幕落下和掀開各要多久 */
export function beatFadeMs(beat: Beat | undefined): number {
  return beat?.fade === "slow" ? BEAT_SLOW_FADE_MS : BEAT_FADE_MS;
}
