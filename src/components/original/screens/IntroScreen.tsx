"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { INTRO_MELODY, INTRO_SHOTS, introShotAt } from "@/lib/left-on-read/intro";
import { midiToFreq } from "@/lib/rhythm/music";
import PixelCanvas from "../PixelCanvas";
import { dither, rect, type Ctx } from "../pixel/draw";
import { INTRO_H, INTRO_SCENES, INTRO_W, loadIntroImages, type IntroImages } from "../pixel/introScenes";
import { PixelButton } from "../ui";

const MUSIC_GAIN = 0.55;
/** 每個分鏡前後用抖色淡入淡出 */
const FADE_MS = 280;

export default function IntroScreen({ onDone }: { onDone: () => void }) {
  const [images, setImages] = useState<IntroImages | null>(null);
  const finished = useRef(false);

  // 圖載好才開始計時，第一幕才不會空著播掉
  useEffect(() => {
    let cancelled = false;
    void loadIntroImages().then((loaded) => {
      if (!cancelled) setImages(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const draw = useCallback(
    (ctx: Ctx, t: number) => {
      if (!images) return;
      const { index, localMs, done } = introShotAt(t);
      const shot = INTRO_SHOTS[index];
      INTRO_SCENES[shot.id](ctx, localMs, images);
      const fadeIn = index > 0 && INTRO_SHOTS[index - 1].continues ? FADE_MS : localMs;
      const fadeOut = shot.continues ? FADE_MS : shot.durationMs - localMs;
      const fade = Math.min(fadeIn, fadeOut);
      if (fade < FADE_MS) {
        if (fade < FADE_MS / 2) rect(ctx, "#000000", 0, 0, INTRO_W, INTRO_H);
        else dither(ctx, "#000000", 0, 0, INTRO_W, INTRO_H);
      }
      if (done && !finished.current) {
        finished.current = true;
        onDone();
      }
    },
    [images, onDone]
  );

  // 憂傷的旋律：跳過、結束或離開頁面時，disconnect 一次靜音所有排程的音
  const ready = images !== null;
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    let bus: GainNode | null = null;
    void audioManager.resume().then((ctx) => {
      if (cancelled || !ctx) return;
      bus = audioManager.createMusicBus();
      if (!bus) return;
      bus.gain.value = MUSIC_GAIN;
      const start = ctx.currentTime + 0.1;
      for (const n of INTRO_MELODY) {
        audioManager.scheduleNote(bus, midiToFreq(n.midi), start + n.time, n.duration);
      }
    });
    return () => {
      cancelled = true;
      bus?.disconnect();
    };
  }, [ready]);

  return (
    <div className="flex h-full flex-col bg-black">
      <div className="flex min-h-0 flex-1 items-center justify-center">
        {ready && (
          <PixelCanvas
            width={INTRO_W}
            height={INTRO_H}
            draw={draw}
            animate
            label="開場影片：下班、擠捷運、回到租屋處滑交友軟體"
            className="block h-full min-h-0 w-full object-contain"
          />
        )}
      </div>
      <div className="shrink-0 px-5 py-3">
        <PixelButton onClick={onDone} className="py-1.5 text-sm">
          跳過
        </PixelButton>
      </div>
    </div>
  );
}
