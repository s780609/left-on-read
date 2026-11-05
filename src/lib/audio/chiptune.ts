/**
 * 紅白機風格音效：方波 / 三角波 / 噪音合成，沒有音檔；旋律全部原創。
 */

export type ChipSfx =
  | "shoot"
  | "brick"
  | "steel"
  | "armorHit"
  | "boomS"
  | "boomL"
  | "powerAppear"
  | "powerGet"
  | "life"
  | "pause"
  | "waka1"
  | "waka2"
  | "eatGhost"
  | "medal"
  | "bombBlast";

export type ChipJingle = "stageStart" | "gameOver" | "stageClear" | "pacStart" | "pacDeath" | "warning";

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();

function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  let buf = noiseCache.get(ctx);
  if (!buf) {
    const len = Math.floor(ctx.sampleRate * 1);
    buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    noiseCache.set(ctx, buf);
  }
  return buf;
}

/** 單一音：方波 / 三角波＋短包絡；freqEnd 給了就做滑音 */
function sq(
  ctx: BaseAudioContext,
  dest: AudioNode,
  freq: number,
  when: number,
  dur: number,
  vol = 0.08,
  type: OscillatorType = "square",
  freqEnd?: number
): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  if (freqEnd !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), when + dur);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(vol, when + 0.005);
  g.gain.setValueAtTime(vol, when + Math.max(0.006, dur * 0.6));
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(g);
  g.connect(dest);
  osc.start(when);
  osc.stop(when + dur + 0.02);
}

/** 噪音＋lowpass 掃頻 */
function noise(
  ctx: BaseAudioContext,
  dest: AudioNode,
  when: number,
  dur: number,
  vol: number,
  f0: number,
  f1: number
): void {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(f0, when);
  filter.frequency.exponentialRampToValueAtTime(Math.max(30, f1), when + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(dest);
  src.start(when, Math.random() * 0.5);
  src.stop(when + dur + 0.02);
}

/** 音名 → 頻率（A4 = 440） */
const NOTE: Record<string, number> = {};
{
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  for (let oct = 1; oct <= 7; oct++) {
    names.forEach((n, i) => {
      const midi = (oct + 1) * 12 + i;
      NOTE[`${n}${oct}`] = 440 * Math.pow(2, (midi - 69) / 12);
    });
  }
}
const f = (n: string) => NOTE[n] ?? 440;

export function playChipSfx(ctx: BaseAudioContext, dest: AudioNode, kind: ChipSfx): void {
  const t = ctx.currentTime + 0.005;
  switch (kind) {
    case "shoot":
      sq(ctx, dest, 880, t, 0.06, 0.07, "square", 220);
      noise(ctx, dest, t, 0.05, 0.05, 3000, 800);
      break;
    case "brick":
      noise(ctx, dest, t, 0.08, 0.25, 500, 200);
      break;
    case "steel":
      sq(ctx, dest, 1760, t, 0.05, 0.05);
      sq(ctx, dest, 2640, t, 0.05, 0.035);
      break;
    case "armorHit":
      sq(ctx, dest, 660, t, 0.04, 0.07);
      sq(ctx, dest, 660, t + 0.06, 0.04, 0.07);
      break;
    case "boomS":
      noise(ctx, dest, t, 0.3, 0.35, 1200, 150);
      break;
    case "boomL":
      noise(ctx, dest, t, 0.7, 0.45, 1500, 80);
      sq(ctx, dest, 120, t, 0.5, 0.25, "sine", 40);
      break;
    case "powerAppear":
      ["C6", "E6", "G6", "C7"].forEach((n, i) => sq(ctx, dest, f(n), t + i * 0.04, 0.04, 0.06));
      break;
    case "powerGet":
      ["C5", "E5", "G5", "C6", "E6", "G6"].forEach((n, i) => sq(ctx, dest, f(n), t + i * 0.045, 0.06, 0.18, "triangle"));
      break;
    case "life":
      ["C6", "G6", "C7", "G6", "C7"].forEach((n, i) => sq(ctx, dest, f(n), t + i * 0.08, 0.075, 0.06));
      break;
    case "pause":
      sq(ctx, dest, f("E6"), t, 0.05, 0.06);
      sq(ctx, dest, f("B6"), t + 0.08, 0.06, 0.06);
      break;
    // 小精靈吃豆子：上下滑音輪流
    case "waka1":
      sq(ctx, dest, 260, t, 0.07, 0.2, "triangle", 520);
      break;
    case "waka2":
      sq(ctx, dest, 520, t, 0.07, 0.2, "triangle", 260);
      break;
    case "eatGhost":
      sq(ctx, dest, 180, t, 0.3, 0.07, "square", 1600);
      break;
    // 復古雷電
    case "medal":
      sq(ctx, dest, f("B6"), t, 0.05, 0.05);
      sq(ctx, dest, f("E7"), t + 0.05, 0.1, 0.05);
      break;
    case "bombBlast":
      noise(ctx, dest, t, 1.2, 0.5, 2500, 60);
      sq(ctx, dest, 200, t, 0.9, 0.3, "sine", 30);
      break;
  }
}

/** [音名, 拍數]；"-" 為休止 */
type Seq = readonly (readonly [string, number])[];

function playSeq(ctx: BaseAudioContext, dest: AudioNode, start: number, beat: number, seq: Seq, vol: number, type: OscillatorType): number {
  let t = start;
  for (const [n, beats] of seq) {
    const dur = beats * beat;
    if (n !== "-") sq(ctx, dest, f(n), t, dur * 0.92, vol, type);
    t += dur;
  }
  return t;
}

export function playChipJingle(ctx: BaseAudioContext, dest: AudioNode, kind: ChipJingle): void {
  const t = ctx.currentTime + 0.02;
  switch (kind) {
    case "stageStart": {
      // C – Am – F – G – C 琶音，約 1.6 秒
      const b = 0.075;
      const lead: Seq = [
        ["C5", 1], ["E5", 1], ["G5", 1], ["C6", 1],
        ["A4", 1], ["C5", 1], ["E5", 1], ["A5", 1],
        ["F4", 1], ["A4", 1], ["C5", 1], ["F5", 1],
        ["G4", 1], ["B4", 1], ["D5", 1], ["G5", 1],
        ["C6", 4],
      ];
      playSeq(ctx, dest, t, b, lead, 0.06, "square");
      const bass: Seq = [["C3", 4], ["A2", 4], ["F2", 4], ["G2", 4], ["C3", 4]];
      playSeq(ctx, dest, t, b, bass, 0.2, "triangle");
      break;
    }
    case "gameOver": {
      const b = 0.2;
      playSeq(ctx, dest, t, b, [["G4", 1], ["F4", 1], ["E4", 1], ["D4", 1], ["C4", 3]], 0.07, "square");
      playSeq(ctx, dest, t, b, [["G2", 2], ["E2", 2], ["C2", 3]], 0.22, "triangle");
      break;
    }
    case "stageClear": {
      const b = 0.09;
      playSeq(ctx, dest, t, b, [["G5", 1], ["C6", 1], ["E6", 1], ["G6", 2], ["E6", 1], ["G6", 4]], 0.06, "square");
      playSeq(ctx, dest, t, b, [["C3", 3], ["G2", 3], ["C3", 4]], 0.2, "triangle");
      break;
    }
    case "pacStart": {
      // 約 2.2 秒，小精靈開場的「準備！」
      const b = 0.08;
      const lead: Seq = [
        ["E5", 1], ["G5", 1], ["C6", 2], ["B5", 1], ["G5", 1], ["E5", 2],
        ["F5", 1], ["A5", 1], ["D6", 2], ["C6", 1], ["A5", 1], ["F5", 2],
        ["E5", 1], ["G5", 1], ["C6", 1], ["E6", 1], ["D6", 1], ["B5", 1], ["G5", 1], ["B5", 1],
        ["C6", 4],
      ];
      playSeq(ctx, dest, t, b, lead, 0.06, "square");
      const bass: Seq = [["C3", 4], ["G2", 4], ["F2", 4], ["D3", 4], ["C3", 2], ["E3", 2], ["G2", 4], ["C3", 4]];
      playSeq(ctx, dest, t, b, bass, 0.2, "triangle");
      break;
    }
    case "pacDeath": {
      // 一路往下掉的滑音，最後兩聲「啵啵」
      for (let i = 0; i < 9; i++) {
        const hz = 900 * Math.pow(0.86, i);
        sq(ctx, dest, hz, t + 0.75 + i * 0.1, 0.09, 0.06, "square", hz * 0.7);
      }
      sq(ctx, dest, f("C5"), t + 1.75, 0.05, 0.07, "square", f("C6"));
      sq(ctx, dest, f("C5"), t + 1.9, 0.05, 0.07, "square", f("C6"));
      break;
    }
    case "warning": {
      // 大魔王來了：高低交替的警報聲，三次
      for (let i = 0; i < 6; i++) sq(ctx, dest, i % 2 === 0 ? 880 : 660, t + i * 0.25, 0.22, 0.06, "square");
      break;
    }
  }
}
