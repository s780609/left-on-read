"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { DECK_SIZE, SUPER_LIKE_PRICE } from "@/lib/left-on-read/constants";
import { STREAK_HINTS } from "@/lib/left-on-read/flavor";
import type { Dex } from "@/lib/left-on-read/dex";
import { deckCardSeed, type RunState, type SwipeDir } from "@/lib/left-on-read/game";
import { holidayOf } from "@/lib/left-on-read/holidays";
import { educationLine, generateGirl, type Girl } from "@/lib/left-on-read/girl";
import { interestLabel } from "@/lib/left-on-read/story";
import { resolveSwipe } from "@/lib/left-on-read/swipe";
import PixelCanvas from "../PixelCanvas";
import { type Ctx } from "../pixel/draw";
import { PHOTO_H, PHOTO_W, drawGirl } from "../pixel/girlSprite";
import { TOP_BAR_CLASS } from "../ui";

const FLY_MS = 240;
const HINT_FROM_STREAK = 5;
/** 手指移動不到這個距離就算點一下，不算拖曳 */
const TAP_PX = 6;

/** 一張卡：照片加資料。拖曳只改外層的 CSS transform，不會重畫 canvas */
function GirlCard({ girl, photoIndex = 0 }: { girl: Girl; photoIndex?: number }) {
  const draw = useCallback((ctx: Ctx) => drawGirl(ctx, girl), [girl]);
  const photos = girl.photos ?? [];
  return (
    <div className="flex max-h-full w-full flex-col border-[3px] border-black bg-[#f4efe0] text-[#20203c] shadow-[5px_5px_0_#000]">
      {photos.length > 0 ? (
        // 離線也要能看，不走圖片最佳化
        <Image
          src={photos[photoIndex % photos.length]}
          alt={`${girl.nickname}的照片`}
          width={PHOTO_W * 4}
          height={PHOTO_H * 4}
          unoptimized
          draggable={false}
          className="pointer-events-none block min-h-0 w-full shrink bg-[#20203c] object-cover object-top"
          style={{ aspectRatio: `${PHOTO_W} / ${PHOTO_H}` }}
        />
      ) : (
        <PixelCanvas
          width={PHOTO_W}
          height={PHOTO_H}
          draw={draw}
          label={`${girl.nickname}的照片`}
          className="block min-h-0 w-full shrink bg-[#20203c] object-contain"
        />
      )}
      <div className="shrink-0 border-t-[3px] border-black px-2.5 py-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-lg leading-tight">
            {girl.nickname}
            <span className="ml-1.5">{girl.age}</span>
          </span>
          <span className="shrink-0 text-xs text-[#5a5a78]">
            {girl.city}．{girl.distanceKm} 公里
          </span>
        </div>
        <p className="truncate text-xs text-[#5a5a78]">{educationLine(girl)}</p>
        <p className="mt-0.5 text-sm font-normal leading-snug">{girl.bio}</p>
        <span className="mt-1 inline-block border-2 border-black bg-[#ffe08a] px-1.5 text-xs">{interestLabel(girl)}</span>
        {photos.length > 1 ? (
          <span className="ml-2 text-xs text-[#5a5a78]">
            點一下換照片 {(photoIndex % photos.length) + 1} / {photos.length}
          </span>
        ) : null}
      </div>
    </div>
  );
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  lastX: number;
  lastT: number;
  vx: number;
}

interface SwipeScreenProps {
  run: RunState;
  dex: Dex;
  onSwipe: (dir: SwipeDir) => void;
  onQuit: () => void;
}

export function SwipeScreen({ run, dex, onSwipe, onQuit }: SwipeScreenProps) {
  const girl = useMemo(() => generateGirl(deckCardSeed(run, dex, run.deckIndex)), [run, dex]);
  const nextSeed = deckCardSeed(run, dex, run.deckIndex + 1);
  // 照片頁跟著卡片走：換一張新卡就從第一張照片開始
  const [photo, setPhoto] = useState({ deckIndex: run.deckIndex, index: 0 });
  const photoIndex = photo.deckIndex === run.deckIndex ? photo.index : 0;
  const hasNext = run.deckIndex + 1 < DECK_SIZE;
  const nextGirl = useMemo(() => generateGirl(nextSeed), [nextSeed]);

  const cardRef = useRef<HTMLDivElement>(null);
  const likeRef = useRef<HTMLDivElement>(null);
  const nopeRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const flyingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  // 換一張新卡（key 換了之後舊的 DOM 已經卸載）就可以再滑
  useEffect(() => {
    flyingRef.current = false;
  }, [run.deckIndex]);

  const place = (x: number, y: number, ms: number) => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transition = ms > 0 ? `transform ${ms}ms cubic-bezier(0.3, 0.9, 0.4, 1)` : "none";
    el.style.transform = `translate(${x}px, ${y}px) rotate(${x / 16}deg)`;
    if (likeRef.current) likeRef.current.style.opacity = String(Math.min(1, Math.max(0, x / 70)));
    if (nopeRef.current) nopeRef.current.style.opacity = String(Math.min(1, Math.max(0, -x / 70)));
  };

  /** 手勢和按鈕走同一條飛出路徑，飛行中鎖定輸入，動畫結束才 dispatch */
  const flyOut = (dir: SwipeDir) => {
    if (flyingRef.current) return;
    flyingRef.current = true;
    dragRef.current = null;
    audioManager.whoosh();
    const width = cardRef.current?.offsetWidth ?? 320;
    const height = cardRef.current?.offsetHeight ?? 480;
    const el = cardRef.current;
    if (el) el.style.transition = `transform ${FLY_MS}ms ease-in`;
    if (el) {
      // 超級喜歡往上飛
      el.style.transform =
        dir === "super"
          ? `translate(0px, ${-height * 1.4}px)`
          : `translate(${(dir === "right" ? 1 : -1) * width * 1.6}px, -24px) rotate(${dir === "right" ? 22 : -22}deg)`;
    }
    if (likeRef.current) likeRef.current.style.opacity = dir === "left" ? "0" : "1";
    if (nopeRef.current) nopeRef.current.style.opacity = dir === "left" ? "1" : "0";
    timerRef.current = setTimeout(() => onSwipe(dir), FLY_MS);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (flyingRef.current || dragRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      x: 0,
      y: 0,
      lastX: e.clientX,
      lastT: e.timeStamp,
      vx: 0,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    drag.x = e.clientX - drag.startX;
    drag.y = (e.clientY - drag.startY) * 0.3;
    const dt = e.timeStamp - drag.lastT;
    if (dt > 0) {
      drag.vx = 0.7 * ((e.clientX - drag.lastX) / dt) + 0.3 * drag.vx;
      drag.lastX = e.clientX;
      drag.lastT = e.timeStamp;
    }
    place(drag.x, drag.y, 0);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    const dir = resolveSwipe(drag.x, drag.vx, cardRef.current?.offsetWidth ?? 320);
    if (dir) flyOut(dir);
    else place(0, 0, 180);
    if (!dir && Math.abs(drag.x) < TAP_PX && Math.abs(drag.y) < TAP_PX) {
      setPhoto({ deckIndex: run.deckIndex, index: photoIndex + 1 });
    }
  };

  const holidayHint = holidayOf(run.dayIndex)?.swipeHint ?? null;
  const hint =
    run.rightStreak >= HINT_FROM_STREAK ? STREAK_HINTS[run.rightStreak % STREAK_HINTS.length] : holidayHint;
  const canSuper = run.money >= SUPER_LIKE_PRICE;

  return (
    <div className="flex h-full flex-col bg-[#2a1f3d]">
      <div className={TOP_BAR_CLASS}>
        <div className="min-w-0 flex-1 text-xl tracking-wide text-[#ff9fb4]">Swipy</div>
        <div className="shrink-0 text-xs text-[#d8d9ea]">
          第 {run.deckIndex + 1} / {DECK_SIZE} 張
        </div>
        <button
          type="button"
          onClick={() => {
            if (flyingRef.current) return;
            audioManager.pop();
            onQuit();
          }}
          className="shrink-0 cursor-pointer border-2 border-black bg-[#55587a] px-2 py-1 text-xs active:translate-y-[1px]"
        >
          不滑了
        </button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden px-5 pb-2 pt-3">
        {hasNext ? (
          <div className="absolute inset-x-5 bottom-2 top-3 flex translate-y-1 scale-[0.96] items-center" aria-hidden>
            <GirlCard key={run.deckIndex + 1} girl={nextGirl} />
          </div>
        ) : null}
        <div
          key={run.deckIndex}
          ref={cardRef}
          className="absolute inset-x-5 bottom-2 top-3 flex cursor-grab touch-none select-none items-center active:cursor-grabbing"
          style={{ touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <GirlCard key={girl.seed} girl={girl} photoIndex={photoIndex} />
          <div
            ref={likeRef}
            className="pointer-events-none absolute left-3 top-4 -rotate-12 border-4 border-[#3fbf7f] bg-black/30 px-2 text-2xl text-[#7cf0b0] opacity-0"
          >
            喜歡
          </div>
          <div
            ref={nopeRef}
            className="pointer-events-none absolute right-3 top-4 rotate-12 border-4 border-[#ff5a5a] bg-black/30 px-2 text-2xl text-[#ff9a9a] opacity-0"
          >
            略過
          </div>
        </div>
      </div>

      {hint ? <p className="shrink-0 px-4 text-center text-xs text-[#c8cae0]">{hint}</p> : null}

      <div className="flex shrink-0 items-center justify-center gap-7 px-4 py-2.5">
        <button
          type="button"
          aria-label="略過"
          onClick={() => flyOut("left")}
          className="h-14 w-14 cursor-pointer border-[3px] border-black bg-[#f4efe0] text-2xl text-[#c9423a] shadow-[4px_4px_0_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[1px_1px_0_#000]"
        >
          ✕
        </button>
        <button
          type="button"
          aria-label={`超級喜歡，NT$${SUPER_LIKE_PRICE}`}
          disabled={!canSuper}
          onClick={() => flyOut("super")}
          className="flex h-12 w-12 cursor-pointer flex-col items-center justify-center border-[3px] border-black bg-[#ffe08a] text-xl leading-none text-[#20203c] shadow-[4px_4px_0_#000] enabled:active:translate-x-[3px] enabled:active:translate-y-[3px] enabled:active:shadow-[1px_1px_0_#000] disabled:cursor-default disabled:opacity-45"
        >
          ★<span className="mt-0.5 text-[9px] leading-none">{SUPER_LIKE_PRICE}</span>
        </button>
        <button
          type="button"
          aria-label="喜歡"
          onClick={() => flyOut("right")}
          className="h-14 w-14 cursor-pointer border-[3px] border-black bg-[#ff6f91] text-2xl text-white shadow-[4px_4px_0_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[1px_1px_0_#000]"
        >
          ♥
        </button>
      </div>
    </div>
  );
}
