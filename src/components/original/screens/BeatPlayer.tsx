"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  CHAT_SCENE,
  beatChapterStart,
  beatFadeMs,
  finishBeatFade,
  markBeatTyped,
  startBeats,
  tapBeat,
  visibleBeats,
  type Beat,
} from "@/lib/left-on-read/beats";
import type { TranscriptLine } from "@/lib/left-on-read/story";
import type { Ctx } from "../pixel/draw";
import { COLOR, DialogBox, PixelButton, Scene, TOP_BAR_CLASS, Typewriter, useAdvanceKeys, useReducedMotion } from "../ui";
import { ChatBubble, Transcript } from "./ChatScreens";

/** 減少動態效果時，場景定格在動畫跑完的樣子 */
const STILL_T = 60000;

const FADE_EASE = "cubic-bezier(0.45, 0, 0.55, 1)";

interface BeatPlayerProps<S extends string> {
  beats: readonly Beat<S>[];
  scenes: Partial<Record<S, (ctx: Ctx, t: number) => void>>;
  label: string;
  /** 從第幾段開始，前面的段落一開始就顯示 */
  startIndex?: number;
  /** 從黑幕掀開；從聊天室無縫接過來時關掉 */
  fadeIn?: boolean;
  /** 聊天場景的標題列 */
  chatHeader?: ReactNode;
  /** 第一段聊天前面已經講過的話 */
  chatHistory?: readonly TranscriptLine[];
  /** 底部按鈕區從這個高度慢慢收，接在選項區後面才不會跳 */
  panelFromHeight?: number;
  /** 片名底下的小字 */
  lastNote?: string;
  /** 片名那一頁的按鈕，後面還有片尾時改字 */
  doneLabel?: string;
  onLast?: () => void;
  onDone: () => void;
}

/**
 * 結局一段一段按著看：按畫面、按鈕、空白鍵或 Enter 都算一下。
 * 字還在打就先打完；同一幕講過的話都留著，換幕才落黑幕。沒有任何計時器會把字清掉。
 */
export function BeatPlayer<S extends string>({
  beats,
  scenes,
  label,
  startIndex = 0,
  fadeIn = true,
  chatHeader,
  chatHistory,
  panelFromHeight,
  lastNote,
  doneLabel = "回選單",
  onLast,
  onDone,
}: BeatPlayerProps<S>) {
  const [progress, setProgress] = useState(() => startBeats(beats, startIndex));
  const [lifted, setLifted] = useState(!fadeIn);
  const still = useReducedMotion();
  const { index, typed, fading } = progress;
  const beat = beats[index];
  const last = index === beats.length - 1;
  const chapterStart = beatChapterStart(beats, index);
  const chapter = visibleBeats(beats, index);
  const isChat = beat.scene === CHAT_SCENE;

  // 下一幀才掀開，瀏覽器才看得到全黑到透明的轉場
  useEffect(() => {
    if (lifted) return;
    const id = requestAnimationFrame(() => setLifted(true));
    return () => cancelAnimationFrame(id);
  }, [lifted]);

  const fadeMs = beatFadeMs(fading ? beats[index + 1] : beat);
  useEffect(() => {
    if (!fading) return;
    const id = setTimeout(() => setProgress((p) => finishBeatFade(p, beats)), fadeMs);
    return () => clearTimeout(id);
  }, [fading, fadeMs, beats]);

  useEffect(() => {
    if (last) onLast?.();
  }, [last, onLast]);

  const tap = useCallback(() => setProgress((p) => tapBeat(p, beats)), [beats]);
  const finishTyping = useCallback(() => setProgress(markBeatTyped), []);
  useAdvanceKeys(tap, !last);

  // 新的一句要看得到
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [index]);

  const sceneDraw = scenes[beat.scene];
  const draw = useCallback(
    (ctx: Ctx, t: number) => sceneDraw?.(ctx, still ? STILL_T : t),
    [sceneDraw, still]
  );

  const chatLines: TranscriptLine[] = [
    ...(chapterStart === 0 ? (chatHistory ?? []) : []),
    ...chapter.map((b): TranscriptLine => (b.who ? { who: b.who, text: b.text } : { who: "narration", text: b.text })),
  ];

  return (
    <div className="relative flex h-full flex-col" onClick={last ? undefined : tap}>
      {isChat ? (
        <>
          <div className={TOP_BAR_CLASS}>{chatHeader ?? <div className="min-w-0 flex-1 truncate">她</div>}</div>
          <Transcript key={chapterStart} lines={chatLines} />
        </>
      ) : (
        <>
          <Scene key={chapterStart} draw={draw} label={label} />
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 text-[15px] leading-relaxed">
            {last ? (
              <div className="pt-2 text-center">
                {beat.text.split("\n").map((line, i) => (
                  <p key={line} className={i === 0 ? "mb-3 text-3xl text-[#ff6f91]" : "mt-1 leading-relaxed"}>
                    {line}
                  </p>
                ))}
                {lastNote ? <p className="mt-5 text-sm text-[#a9abc9]">{lastNote}</p> : null}
              </div>
            ) : (
              chapter.map((b, i) => {
                const current = chapterStart + i === index;
                const body = current ? (
                  <Typewriter key={b.text} text={b.text} cps={20} instant={typed} onDone={finishTyping} />
                ) : (
                  <p>{b.text}</p>
                );
                return b.who ? (
                  <ChatBubble key={b.text} mine={b.who === "me"}>
                    {body}
                  </ChatBubble>
                ) : (
                  <DialogBox key={b.text}>{body}</DialogBox>
                );
              })
            )}
            <div ref={endRef} />
          </div>
        </>
      )}
      <div
        className={`shrink-0 border-t-[3px] border-black px-4 py-3 ${isChat ? "bg-[#20203c]" : "bg-[#191933]"}`}
        style={
          panelFromHeight
            ? ({
                "--lor-panel-from": `${panelFromHeight}px`,
                animation: "lor-panel-settle 520ms ease-out both",
              } as CSSProperties)
            : undefined
        }
      >
        {last ? (
          <PixelButton color={COLOR.blue} onClick={onDone}>
            {doneLabel}
          </PixelButton>
        ) : (
          // 按鈕本身不做事，事件冒泡到外層的 tap，才不會一次算兩下
          <PixelButton color={COLOR.gray}>……</PixelButton>
        )}
      </div>
      {/* 黑幕：落下和掀開都用緩動，不是兩格硬切 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 bg-black"
        style={{
          opacity: fading || !lifted ? 1 : 0,
          transition: lifted ? `opacity ${fadeMs}ms ${FADE_EASE}` : "none",
        }}
      />
    </div>
  );
}
