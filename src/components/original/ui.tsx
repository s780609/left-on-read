"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { calendarOf, formatDate } from "@/lib/left-on-read/calendar";
import type { Phase, RunState } from "@/lib/left-on-read/game";
import { typewriterCount } from "@/lib/left-on-read/intro";
import PixelCanvas from "./PixelCanvas";
import { SCENE_H, SCENE_W } from "./pixel/scenes";

export const COLOR = {
  ink: "#f6f1de",
  panel: "#20203c",
  pink: "#ff6f91",
  green: "#3f9d76",
  blue: "#3f6fb5",
  yellow: "#e8b93c",
  gray: "#55587a",
  red: "#c9423a",
} as const;

// ---------- 按鈕 ----------

interface PixelButtonProps {
  children: ReactNode;
  onClick?: () => void;
  color?: string;
  textColor?: string;
  disabled?: boolean;
  /** 預設按下會有 pop 音效，自己有音效的按鈕關掉 */
  silent?: boolean;
  align?: "center" | "left";
  className?: string;
  sub?: ReactNode;
}

/** 方角、粗邊框、硬陰影，按下去會真的陷進去 */
export function PixelButton({
  children,
  onClick,
  color = COLOR.gray,
  textColor = "#ffffff",
  disabled = false,
  silent = false,
  align = "center",
  className = "",
  sub,
}: PixelButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!silent) audioManager.pop();
        onClick?.();
      }}
      className={`block w-full select-none border-[3px] border-black px-3 py-2 leading-snug [@media(max-height:500px)]:py-1 shadow-[4px_4px_0_#000] transition-none enabled:cursor-pointer enabled:active:translate-x-[3px] enabled:active:translate-y-[3px] enabled:active:shadow-[1px_1px_0_#000] disabled:opacity-45 ${
        align === "left" ? "text-left" : "text-center"
      } ${className}`}
      style={{ backgroundColor: color, color: textColor }}
    >
      <span className="block">{children}</span>
      {sub ? <span className="mt-0.5 block text-xs font-bold opacity-80">{sub}</span> : null}
    </button>
  );
}

// ---------- 狀態列 ----------

const PERIOD: Record<Phase, { label: string; color: string }> = {
  payday: { label: "白天", color: "#e8b93c" },
  daytime: { label: "白天", color: "#e8b93c" },
  evening: { label: "晚上", color: "#e8824e" },
  night: { label: "深夜", color: "#6d78c9" },
  swiping: { label: "深夜", color: "#6d78c9" },
  matched: { label: "深夜", color: "#6d78c9" },
  nightDone: { label: "深夜", color: "#6d78c9" },
};

export const TOP_BAR_CLASS = "flex shrink-0 items-center gap-2 border-b-[3px] border-black bg-[#2a2a4e] px-3 h-14";

export function StatusBar({ run, onMenu }: { run: RunState; onMenu: () => void }) {
  const period = PERIOD[run.phase];
  return (
    <div className={TOP_BAR_CLASS}>
      <div className="min-w-0 flex-1 text-sm leading-tight">
        <div className="truncate">{formatDate(calendarOf(run.dayIndex))}</div>
        <div className="mt-0.5 flex items-center gap-1 text-xs">
          <span className="inline-block h-2.5 w-2.5 border border-black" style={{ backgroundColor: period.color }} />
          {period.label}
          <span className="ml-1 text-[#f2d675]">NT${run.money.toLocaleString("en-US")}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          audioManager.pop();
          onMenu();
        }}
        className="shrink-0 cursor-pointer border-2 border-black bg-[#55587a] px-2 py-1 text-xs active:translate-y-[1px]"
      >
        選單
      </button>
    </div>
  );
}

// ---------- 文字 ----------

/** 打字機：還沒打出來的字先佔位，版面不會跳。換文字請換 key。 */
export function Typewriter({ text, cps = 26, className = "" }: { text: string; cps?: number; className?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const id = setInterval(() => {
      const n = typewriterCount(text, performance.now() - start, cps);
      setCount(n);
      if (n >= text.length) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [text, cps]);

  return (
    <p className={className} aria-label={text}>
      <span aria-hidden>{text.slice(0, count)}</span>
      <span aria-hidden className="opacity-0">
        {text.slice(count)}
      </span>
    </p>
  );
}

/** 老遊戲的對話框 */
export function DialogBox({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`border-[3px] border-[#f6f1de] bg-[#20203c] p-3 text-[15px] leading-relaxed shadow-[0_0_0_3px_#000,4px_6px_0_3px_#000] ${className}`}
    >
      {children}
    </div>
  );
}

// ---------- 版面 ----------

/** 場景圖：寬度吃滿，矮螢幕時等比縮小 */
export function Scene({
  draw,
  label,
}: {
  draw: (ctx: CanvasRenderingContext2D, t: number) => void;
  label: string;
}) {
  // 畫布是邏輯尺寸的兩倍：插圖才清楚，像素場景放大兩倍後一樣方正
  const scaled = useCallback(
    (ctx: CanvasRenderingContext2D, t: number) => {
      ctx.save();
      ctx.scale(2, 2);
      draw(ctx, t);
      ctx.restore();
    },
    [draw]
  );
  return (
    <div className="flex shrink-0 justify-center border-b-[3px] border-black bg-black">
      <PixelCanvas
        width={SCENE_W * 2}
        height={SCENE_H * 2}
        draw={scaled}
        animate
        label={label}
        className="block h-auto max-h-[40dvh] w-full object-contain [@media(max-height:500px)]:max-h-[28dvh]"
      />
    </div>
  );
}

/** 中間可捲動的文字區，加上固定在底部的按鈕 */
export function ScreenBody({ children, actions }: { children: ReactNode; actions: ReactNode }) {
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{children}</div>
      <div className="flex shrink-0 flex-col gap-2.5 border-t-[3px] border-black bg-[#191933] px-4 py-3 [@media(max-height:500px)]:gap-1.5 [@media(max-height:500px)]:py-2">
        {actions}
      </div>
    </>
  );
}
