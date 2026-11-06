"use client";

/**
 * 打開 Swipy 前的拿起手機轉場（參考 Dave the Diver：手機從下方升起，亮起 App）。
 * 純像素 canvas，不另產圖。
 */

import { useEffect, useRef } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import PixelCanvas from "../PixelCanvas";
import { pixelText, rect, type Ctx } from "../pixel/draw";

const W = 196;
const H = 292;
/** 整段轉場長度；結束後進滑卡 */
export const PHONE_PICKUP_MS = 780;

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function drawPhonePickup(ctx: Ctx, t: number) {
  const p = Math.min(1, Math.max(0, t / PHONE_PICKUP_MS));
  const rise = easeOutCubic(Math.min(1, p / 0.55));
  const splash = easeOutCubic(Math.max(0, (p - 0.35) / 0.45));

  // 深夜房間暗底
  rect(ctx, "#0a0a18", 0, 0, W, H);
  rect(ctx, "#12122a", 0, H * 0.62, W, H * 0.38);

  // 手機本體：從畫面下方升起
  const phoneW = 110;
  const phoneH = 190;
  const phoneX = Math.round((W - phoneW) / 2);
  const phoneY = Math.round(H - phoneH * 0.15 - rise * (H - phoneH - 18));

  // 陰影
  rect(ctx, "#00000066", phoneX + 6, phoneY + phoneH - 4, phoneW - 4, 8);
  // 外殼
  rect(ctx, "#0d0d14", phoneX - 3, phoneY - 3, phoneW + 6, phoneH + 6);
  rect(ctx, "#1a1a28", phoneX, phoneY, phoneW, phoneH);
  // 瀏海
  rect(ctx, "#0d0d14", phoneX + phoneW / 2 - 18, phoneY + 6, 36, 6);
  // 螢幕底
  const sx = phoneX + 6;
  const sy = phoneY + 16;
  const sw = phoneW - 12;
  const sh = phoneH - 28;
  rect(ctx, "#101018", sx, sy, sw, sh);

  // 主畫面圖示列（升起中）
  if (splash < 1) {
    const icons = [
      { x: 10, y: 24, c: "#3f6fb5" },
      { x: 42, y: 24, c: "#3f9d76" },
      { x: 74, y: 24, c: "#e8b93c" },
      { x: 10, y: 56, c: "#ff6f91", heart: true as const },
      { x: 42, y: 56, c: "#55587a" },
      { x: 74, y: 56, c: "#c9423a" },
    ];
    ctx.save();
    ctx.globalAlpha = 1 - splash * 0.85;
    for (const icon of icons) {
      rect(ctx, "#000000", sx + icon.x - 1, sy + icon.y - 1, 26, 26);
      rect(ctx, icon.c, sx + icon.x, sy + icon.y, 24, 24);
      if ("heart" in icon && icon.heart) {
        pixelText(ctx, "♥", sx + icon.x + 12, sy + icon.y + 3, 16, "#ffffff", "center");
      }
    }
    // 指尖點 Swipy
    if (p > 0.25 && p < 0.55) {
      const tap = (p - 0.25) / 0.3;
      const tx = sx + 22;
      const ty = sy + 68 + Math.round((1 - tap) * 10);
      rect(ctx, "#f4c7a8", tx, ty, 10, 14);
      rect(ctx, "#e8a888", tx + 1, ty + 12, 8, 4);
    }
    ctx.restore();
  }

  // Swipy 啟動畫面漲滿螢幕
  if (splash > 0) {
    ctx.save();
    ctx.globalAlpha = splash;
    rect(ctx, "#ff6f91", sx, sy, sw, sh);
    pixelText(ctx, "♥", sx + sw / 2, sy + sh * 0.32, 36, "#ffffff", "center");
    pixelText(ctx, "Swipy", sx + sw / 2, sy + sh * 0.55, 18, "#ffffff", "center");
    ctx.restore();
  }

  // 手（底部）
  const handY = phoneY + phoneH - 8;
  rect(ctx, "#f4c7a8", phoneX - 8, handY, phoneW + 16, 22);
  rect(ctx, "#e8a888", phoneX - 4, handY + 16, phoneW + 8, 10);
  // 拇指
  rect(ctx, "#f4c7a8", phoneX + phoneW - 4, phoneY + phoneH * 0.45, 14, 28);
  rect(ctx, "#e8a888", phoneX + phoneW - 2, phoneY + phoneH * 0.45 + 24, 10, 8);
}

interface PhonePickupScreenProps {
  onDone: () => void;
}

/** 拿起手機 → Swipy 亮起；結束後呼叫 onDone 進入滑卡 */
export function PhonePickupScreen({ onDone }: PhonePickupScreenProps) {
  const done = useRef(false);

  useEffect(() => {
    audioManager.pop();
    const id = setTimeout(() => {
      if (done.current) return;
      done.current = true;
      onDone();
    }, PHONE_PICKUP_MS);
    return () => clearTimeout(id);
  }, [onDone]);

  return (
    <div className="flex h-full flex-col items-center justify-center bg-[#0a0a18]">
      <PixelCanvas
        width={W}
        height={H}
        animate
        frameMs={0}
        draw={drawPhonePickup}
        label="拿起手機打開 Swipy"
        className="h-full w-full max-w-full object-contain"
      />
    </div>
  );
}
