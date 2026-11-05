/**
 * 音名、MIDI、頻率換算，以及旋律字串解析（純函式，方便測試）。
 */

export interface MelodyNote {
  /** null = 休止 */
  midi: number | null;
  beats: number;
}

const PITCH_CLASS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const EPS = 1e-9;

/** "C4"→60、"A4"→69、"F#4"→66、"Bb3"→58；不合法丟錯 */
export function noteToMidi(name: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`不合法的音名：「${name}」`);
  const acc = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0;
  return (Number(m[3]) + 1) * 12 + PITCH_CLASS[m[1]] + acc;
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * 記法："C4"（預設 1 拍）、"G4:2"、"A4:0.5"、"R:1"（休止）、"|"（小節線）。
 * 有給 beatsPerBar 時逐小節檢查拍數，不符就丟錯，訊息含小節編號（從 1 起算）。
 */
export function parseMelody(src: string, beatsPerBar?: number): MelodyNote[] {
  const out: MelodyNote[] = [];
  let bar = 1;
  let barBeats = 0;
  let barHasNotes = false;

  const checkBar = () => {
    if (beatsPerBar === undefined) return;
    if (Math.abs(barBeats - beatsPerBar) > EPS) {
      throw new Error(`第 ${bar} 小節有 ${barBeats} 拍，應為 ${beatsPerBar} 拍`);
    }
  };

  for (const token of src.trim().split(/\s+/)) {
    if (token === "") continue;
    if (token === "|") {
      checkBar();
      bar++;
      barBeats = 0;
      barHasNotes = false;
      continue;
    }
    const [name, beatStr] = token.split(":");
    const beats = beatStr === undefined ? 1 : Number(beatStr);
    if (!Number.isFinite(beats) || beats <= 0) {
      throw new Error(`第 ${bar} 小節拍長不合法：「${token}」`);
    }
    const midi = name === "R" ? null : noteToMidi(name);
    out.push({ midi, beats });
    barBeats += beats;
    barHasNotes = true;
  }
  if (barHasNotes) checkBar();
  return out;
}

export function totalBeats(m: MelodyNote[]): number {
  return m.reduce((sum, n) => sum + n.beats, 0);
}
