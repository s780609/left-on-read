"use client";

import { useEffect, useRef, type CSSProperties } from "react";

interface PixelCanvasProps {
  width: number;
  height: number;
  /** (ctx, 累計毫秒)。animate 時請傳穩定的函式，靜態畫面換函式就會重畫 */
  draw: (ctx: CanvasRenderingContext2D, tMs: number) => void;
  animate?: boolean;
  className?: string;
  style?: CSSProperties;
  label?: string;
}

/** 舊遊戲的節奏：不用每個 rAF 都重畫 */
const FRAME_MS = 50;
/** 分頁切回來時不要一次跳太多 */
const MAX_STEP_MS = 100;

/** 低解析 canvas，用 CSS 放大成像素風。繪製只在 effect 裡，伺服器不會執行。 */
export default function PixelCanvas({ width, height, draw, animate = false, className = "", style, label }: PixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  const staticDraw = animate ? null : draw;

  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    if (staticDraw) {
      staticDraw(ctx, 0);
      return;
    }
    let clock = 0;
    let sinceDraw = 0;
    let last = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const step = Math.min(now - last, MAX_STEP_MS);
      last = now;
      clock += step;
      sinceDraw += step;
      if (sinceDraw >= FRAME_MS) {
        sinceDraw = 0;
        drawRef.current(ctx, clock);
      }
      raf = requestAnimationFrame(frame);
    };
    drawRef.current(ctx, 0);
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [staticDraw, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      role="img"
      aria-label={label}
      className={className}
      style={{ imageRendering: "pixelated", ...style }}
    />
  );
}
