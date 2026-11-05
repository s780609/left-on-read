"use client";

import {
  playPop,
  playDing,
  playChime,
  playWhoosh,
  playSuccess,
  playBubble,
  playWrong,
  playSand,
  playTick,
  scheduleHat,
  scheduleKick,
  scheduleTone,
  scheduleWoodblock,
} from "./synth";
import { playChipJingle, playChipSfx, type ChipJingle, type ChipSfx } from "./chiptune";

export interface ClockAnchor {
  /** AudioContext 時間（秒） */
  contextTime: number;
  /** 對應的 performance.now()（毫秒） */
  performanceTime: number;
}

class AudioManager {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private audioCache: Map<string, AudioBuffer> = new Map();
  private volume = 0.7;

  init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = this.volume;
    this.gainNode.connect(this.ctx.destination);
  }

  private ensureCtx() {
    if (!this.ctx || !this.gainNode) this.init();
    if (this.ctx?.state === "suspended") this.ctx.resume();
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.gainNode) this.gainNode.gain.value = v;
  }

  async preload(path: string) {
    if (this.audioCache.has(path)) return;
    this.ensureCtx();
    try {
      const res = await fetch(path);
      const arrayBuffer = await res.arrayBuffer();
      const audioBuffer = await this.ctx!.decodeAudioData(arrayBuffer);
      this.audioCache.set(path, audioBuffer);
    } catch {
      // Audio file might not exist yet - that's ok
    }
  }

  async preloadAll() {
    const files = [
      "/sounds/animals/cat.mp3",
      "/sounds/animals/dog.mp3",
      "/sounds/animals/cow.mp3",
      "/sounds/animals/duck.mp3",
      "/sounds/animals/lion.mp3",
      "/sounds/animals/elephant.mp3",
      "/sounds/voices/wow.mp3",
      "/sounds/voices/great-job.mp3",
      "/sounds/voices/this-is-circle.mp3",
      "/sounds/voices/this-is-square.mp3",
      "/sounds/voices/this-is-triangle.mp3",
      "/sounds/voices/this-is-star.mp3",
      "/sounds/voices/this-is-heart.mp3",
      "/sounds/feedback/laugh.mp3",
      "/sounds/feedback/clap.mp3",
    ];
    await Promise.allSettled(files.map((f) => this.preload(f)));
  }

  /** rate：播放速度，同時改變音高（動物鍵盤用） */
  async playFile(path: string, rate = 1) {
    this.ensureCtx();
    if (!this.audioCache.has(path)) {
      await this.preload(path);
    }
    const buffer = this.audioCache.get(path);
    if (!buffer || !this.ctx || !this.gainNode) return;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    source.connect(this.gainNode);
    source.start();
  }

  /**
   * 用裝置內建的語音唸出中文（釣到魚時說名字）。
   * 裝置沒有中文語音就不唸，避免用英文語音念出怪聲音。
   */
  speak(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const voices = synth.getVoices();
    const zh =
      voices.find((v) => v.lang === "zh-TW") ??
      voices.find((v) => v.lang.startsWith("zh"));
    if (voices.length > 0 && !zh) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = zh?.lang ?? "zh-TW";
    if (zh) u.voice = zh;
    u.rate = 0.9;
    u.pitch = 1.2;
    u.volume = this.volume;
    synth.speak(u);
  }

  // Synth sounds
  pop() {
    this.ensureCtx();
    if (this.ctx && this.gainNode) playPop(this.ctx, this.gainNode);
  }

  ding() {
    this.ensureCtx();
    if (this.ctx && this.gainNode) playDing(this.ctx, this.gainNode);
  }

  chime() {
    this.ensureCtx();
    if (this.ctx && this.gainNode) playChime(this.ctx, this.gainNode);
  }

  whoosh() {
    this.ensureCtx();
    if (this.ctx && this.gainNode) playWhoosh(this.ctx, this.gainNode);
  }

  success() {
    this.ensureCtx();
    if (this.ctx && this.gainNode) playSuccess(this.ctx, this.gainNode);
  }

  bubble() {
    this.ensureCtx();
    if (this.ctx && this.gainNode) playBubble(this.ctx, this.gainNode);
  }

  wrong() {
    this.ensureCtx();
    if (this.ctx && this.gainNode) playWrong(this.ctx, this.gainNode);
  }

  sand() {
    this.ensureCtx();
    if (this.ctx && this.gainNode) playSand(this.ctx, this.gainNode);
  }

  // ---------- 節奏遊戲：AudioContext 是唯一時鐘 ----------

  /** 在使用者手勢裡呼叫：確保 AudioContext 存在並已啟動 */
  async resume(): Promise<AudioContext | null> {
    if (!this.ctx) this.init();
    const ctx = this.ctx;
    if (!ctx) return null;
    if (ctx.state !== "running") {
      try {
        await ctx.resume();
      } catch {
        // 瀏覽器拒絕時保持原狀
      }
    }
    return ctx;
  }

  suspend() {
    if (this.ctx?.state === "running") this.ctx.suspend().catch(() => {});
  }

  get context(): AudioContext | null {
    return this.ctx;
  }

  /** 建立接到主音量的子匯流排，結束時 disconnect 就能一次靜音已排程的音 */
  createMusicBus(): GainNode | null {
    if (!this.ctx || !this.gainNode) this.init();
    if (!this.ctx || !this.gainNode) return null;
    const bus = this.ctx.createGain();
    bus.connect(this.gainNode);
    return bus;
  }

  /** AudioContext 時間與 performance.now() 的對照（含輸出延遲） */
  clockAnchor(): ClockAnchor | null {
    const ctx = this.ctx;
    if (!ctx) return null;
    const ts = typeof ctx.getOutputTimestamp === "function" ? ctx.getOutputTimestamp() : null;
    if (ts && ts.performanceTime && ts.contextTime !== undefined) {
      return { contextTime: ts.contextTime, performanceTime: ts.performanceTime };
    }
    const latency = ctx.outputLatency ?? ctx.baseLatency ?? 0;
    return { contextTime: ctx.currentTime - latency, performanceTime: performance.now() };
  }

  scheduleNote(bus: AudioNode, freq: number, when: number, dur: number) {
    if (this.ctx) scheduleTone(this.ctx, bus, freq, when, dur);
  }

  scheduleBeat(bus: AudioNode, when: number, kind: "kick" | "hat") {
    if (!this.ctx) return;
    if (kind === "kick") scheduleKick(this.ctx, bus, when);
    else scheduleHat(this.ctx, bus, when);
  }

  scheduleCount(bus: AudioNode, when: number, high: boolean) {
    if (this.ctx) scheduleWoodblock(this.ctx, bus, when, high);
  }

  /** 打中時的短促 tick（不帶音高） */
  tick() {
    if (this.ctx?.state === "running" && this.gainNode) playTick(this.ctx, this.gainNode);
  }

  // ---------- 懷舊遊戲：紅白機風格音效 ----------

  chip(kind: ChipSfx) {
    if (this.ctx?.state === "running" && this.gainNode) playChipSfx(this.ctx, this.gainNode, kind);
  }

  chipJingle(kind: ChipJingle) {
    if (this.ctx?.state === "running" && this.gainNode) playChipJingle(this.ctx, this.gainNode, kind);
  }
}

export const audioManager = new AudioManager();
