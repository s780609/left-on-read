"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import {
  ED_CROSSFADE_MS,
  ED_SEQUENCES,
  edTapAccepted,
  nextEdIndex,
  type EdEnding,
  type EdFrame,
} from "@/lib/left-on-read/ed";
import { useAdvanceKeys, useReducedMotion } from "../ui";

const EASE = "cubic-bezier(0.45, 0, 0.55, 1)";
/** 圖下字幕區的高度，圖的大小要扣掉這一段 */
const CAPTION_AREA = "6.5rem";

/** 一張圖：圖、慢慢亮暗的光都在同一層，鏡頭推近時才不會對不準 */
function EdArt({ frame, shown, reached, still }: { frame: EdFrame; shown: boolean; reached: boolean; still: boolean }) {
  // 淡出時動畫不停，畫面才不會跳回原位
  const drift = frame.focus && reached && !still;
  return (
    <div
      aria-hidden={!shown}
      className="absolute inset-0"
      style={{ opacity: shown ? 1 : 0, transition: still ? "none" : `opacity ${ED_CROSSFADE_MS}ms ${EASE}` }}
    >
      <div
        className="absolute inset-0"
        style={{
          transformOrigin: frame.focus ? `${frame.focus.x}% ${frame.focus.y}%` : undefined,
          animation: drift ? `lor-ed-drift ${frame.holdMs + ED_CROSSFADE_MS}ms steps(24) both` : undefined,
        }}
      >
        <Image src={frame.src} alt={frame.alt} fill unoptimized loading="eager" sizes="430px" className="object-cover" />
        {still
          ? null
          : frame.glows?.map((g) => (
              <div
                key={`${g.x},${g.y}`}
                className="absolute rounded-full mix-blend-screen"
                style={{
                  left: `${g.x}%`,
                  top: `${g.y}%`,
                  width: `${g.size}%`,
                  aspectRatio: "1",
                  transform: "translate(-50%, -50%)",
                  background: `radial-gradient(circle, ${g.color}66, transparent 68%)`,
                  animation: "lor-ed-glow 2400ms steps(8) infinite alternate",
                }}
              />
            ))}
      </div>
      {/* 圖裡對話框的字是亂碼，蓋上真的訊息 */}
      {frame.message ? (
        <div
          className="absolute flex flex-col justify-between bg-[#28213f] px-[2%] py-[1.5%] leading-snug"
          style={{ left: "64.8%", top: "12.3%", width: "32.8%", height: "19.2%", fontSize: "4.2cqw" }}
        >
          <p>{frame.message.text}</p>
          <p className="text-right text-[#9a93c4]" style={{ fontSize: "3.2cqw" }}>
            {frame.message.time}
          </p>
        </div>
      ) : null}
      {frame.captionInArt && frame.caption ? (
        <p
          className="absolute flex items-center justify-center px-[3%] text-center leading-snug text-[#f6f1de]"
          style={{ left: "5.5%", top: "81.5%", width: "89%", height: "11%", fontSize: "4.2cqw" }}
        >
          {frame.caption}
        </p>
      ) : null}
    </div>
  );
}

/**
 * 片尾：真的走到結局才會播，圖鑑重看不播。
 * 每張圖停一段時間自己換，按畫面、空白鍵或 Enter 可以提早換；片名之後回選單。
 * 這裡不碰存檔，這一局在結局那一步就清掉了。
 */
export function EdScreen({ ending, onDone }: { ending: EdEnding; onDone: () => void }) {
  const frames = ED_SEQUENCES[ending];
  const still = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [lifted, setLifted] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const frame = frames[index];
  const last = nextEdIndex(index, frames) === null;
  const frameStart = useRef(0);

  // 下一幀才掀開，才看得到從全黑淡入
  useEffect(() => {
    const id = requestAnimationFrame(() => setLifted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const step = useCallback(() => {
    setIndex((i) => nextEdIndex(i, frames) ?? i);
    if (nextEdIndex(index, frames) === null) setLeaving(true);
  }, [frames, index]);

  useEffect(() => {
    frameStart.current = performance.now();
    if (leaving) return;
    const id = setTimeout(step, frame.holdMs);
    return () => clearTimeout(id);
  }, [frame.holdMs, leaving, step]);

  useEffect(() => {
    if (last) audioManager.chime();
  }, [last]);

  // 全黑了才回選單；減少動態效果時不等
  useEffect(() => {
    if (!leaving) return;
    const id = setTimeout(onDone, still ? 0 : ED_CROSSFADE_MS);
    return () => clearTimeout(id);
  }, [leaving, onDone, still]);

  const tap = useCallback(() => {
    if (leaving || !edTapAccepted(performance.now() - frameStart.current)) return;
    step();
  }, [leaving, step]);
  useAdvanceKeys(tap);

  const blackout = !lifted || leaving;

  return (
    <div className="relative h-full bg-[#07070f]" style={{ containerType: "size" }} onClick={tap}>
      <div className="flex h-full flex-col items-center justify-center">
        {/* 3:4 的圖：寬度吃滿，矮螢幕時等比縮小，字幕區一定放得下 */}
        <div
          className="relative aspect-[3/4] shrink-0 overflow-hidden"
          style={{ width: `min(100cqw, calc((100cqh - ${CAPTION_AREA}) * 0.75))`, containerType: "inline-size" }}
        >
          {frames.map((f, i) => (
            <EdArt key={f.id} frame={f} shown={i === index} reached={i <= index} still={still} />
          ))}
        </div>
        <div className="flex w-full shrink-0 flex-col justify-between px-5 py-3" style={{ height: CAPTION_AREA }}>
          <div className="relative min-h-0 flex-1 text-center text-[15px] leading-relaxed">
            {frames.map((f, i) =>
              f.caption && !f.captionInArt ? (
                <p
                  key={f.id}
                  aria-hidden={i !== index}
                  className="absolute inset-x-0 top-0"
                  style={{ opacity: i === index ? 1 : 0, transition: still ? "none" : `opacity ${ED_CROSSFADE_MS}ms ${EASE}` }}
                >
                  {f.caption}
                </p>
              ) : null
            )}
          </div>
          <p className="text-center text-xs text-[#6f7196]">{last ? "按一下回選單" : "按一下看下一張"}</p>
        </div>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 bg-black"
        style={{
          opacity: blackout ? 1 : 0,
          // 第一幀直接全黑，之後才有轉場
          transition: lifted && !still ? `opacity ${ED_CROSSFADE_MS}ms ${EASE}` : "none",
        }}
      />
    </div>
  );
}
