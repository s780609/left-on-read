"use client";

import { useMemo } from "react";
import { generateGirl, type Girl } from "@/lib/left-on-read/girl";
import { openerOptions } from "@/lib/left-on-read/story";
import type { OpenerKind } from "@/lib/left-on-read/storyTypes";
import PixelCanvas from "../PixelCanvas";
import { blink, pixelText, rect, saw, sprite, type Ctx } from "../pixel/draw";
import { PHOTO_H, PHOTO_W, drawGirl } from "../pixel/girlSprite";
import { drawGuanyuBust } from "../pixel/guanyuSprite";
import { SCENE_H, SCENE_W } from "../pixel/scenes";
import { PixelButton } from "../ui";

const HEART = ["..##.##..", ".#######.", "#########", "#########", ".#######.", "..#####..", "...###...", "....#...."];

/** 放射狀的集中線，像老遊戲的必殺技背景 */
function sunburst(ctx: Ctx, t: number) {
  rect(ctx, "#2a0f2e", 0, 0, SCENE_W, SCENE_H);
  const cx = SCENE_W / 2;
  const cy = 64;
  const rotation = t / 1600;
  for (let i = 0; i < 16; i++) {
    const a = rotation + (i / 16) * Math.PI * 2;
    const color = i % 2 === 0 ? "#ff6f91" : "#ffb35a";
    for (let r = 14; r < 130; r += 3) {
      const width = Math.max(1, Math.round(r / 24));
      rect(ctx, color, cx + Math.cos(a) * r, cy + Math.sin(a) * r, width, width);
    }
  }
}

/** 配對畫面：先閃白，兩個人從左右滑進來，大字砸下來，愛心一路往上飄 */
function makeDraw(girl: Girl) {
  let photo: HTMLCanvasElement | null = null;
  let portrait: HTMLImageElement | null = null;
  return (ctx: Ctx, t: number) => {
    if (girl.photos && !portrait) {
      portrait = new Image();
      portrait.src = girl.photos[0];
    }
    if (!photo) {
      photo = document.createElement("canvas");
      photo.width = PHOTO_W;
      photo.height = PHOTO_H;
      const c = photo.getContext("2d");
      if (c) drawGirl(c, girl);
    }
    const shake = t < 700 ? Math.round(Math.sin(t / 22) * (700 - t) * 0.012) : 0;
    ctx.save();
    ctx.translate(shake, -shake);
    sunburst(ctx, t);

    // 兩邊滑進來
    const slide = Math.min(1, t / 450);
    const eased = 1 - (1 - slide) ** 3;
    const lx = -66 + eased * 74;
    const rx = 180 - eased * 74;
    rect(ctx, "#000000", lx - 2, 72, 68, 78);
    rect(ctx, "#ffe08a", lx, 74, 64, 76);
    drawGuanyuBust(ctx, lx, 80, { t });
    rect(ctx, "#000000", rx - 2, 72, 68, 78);
    ctx.imageSmoothingEnabled = false;
    if (!portrait) {
      ctx.drawImage(photo, 0, 0, PHOTO_W, PHOTO_H, rx + 2, 74, 60, 75);
    } else if (portrait.complete && portrait.naturalWidth > 0) {
      // 只取照片上半部，比例和一般卡片的頭像相同
      const w = portrait.naturalWidth;
      ctx.drawImage(portrait, 0, 0, w, (w * 75) / 60, rx + 2, 74, 60, 75);
    }

    // 中間的愛心跳動
    const beat = saw(t, 700) < 0.2 ? 1 : 0;
    sprite(ctx, HEART, { "#": "#000000" }, 86 - beat, 100 - beat);
    sprite(ctx, HEART, { "#": beat ? "#ffffff" : "#ff3f6c" }, 85 - beat, 98 - beat);

    // 往上飄的小愛心
    for (let i = 0; i < 8; i++) {
      const p = saw(t + i * 390, 2400);
      const hx = 14 + ((i * 53) % 150) + Math.sin(p * 6 + i) * 4;
      const hy = 150 - p * 150;
      rect(ctx, "#ff9fb4", hx, hy, 3, 2);
      rect(ctx, "#ff9fb4", hx + 4, hy, 3, 2);
      rect(ctx, "#ff9fb4", hx + 1, hy + 2, 5, 2);
      rect(ctx, "#ff9fb4", hx + 3, hy + 4, 1, 1);
    }

    // 大字從上面砸下來
    const drop = Math.min(1, Math.max(0, (t - 300) / 220));
    const ty = -40 + drop * 74;
    const offsets: readonly (readonly [number, number])[] = [[-2, 0], [2, 0], [0, -2], [0, 2], [2, 2]];
    for (const [ox, oy] of offsets) pixelText(ctx, "配對成功", 90 + ox, ty + oy, 34, "#000000", "center");
    pixelText(ctx, "配對成功", 90, ty, 34, blink(t, 220) ? "#fff1a8" : "#ffffff", "center");
    ctx.restore();

    // 一開始閃白
    if (t < 140) rect(ctx, "#ffffff", 0, 0, SCENE_W, SCENE_H);
  };
}

interface MatchScreenProps {
  girlSeed: number;
  onChoose: (opener: OpenerKind) => void;
}

export function MatchScreen({ girlSeed, onChoose }: MatchScreenProps) {
  const girl = useMemo(() => generateGirl(girlSeed), [girlSeed]);
  const draw = useMemo(() => makeDraw(girl), [girl]);
  const options = openerOptions(girl);
  return (
    <div className="flex h-full flex-col bg-[#2a0f2e]">
      <div className="shrink-0 border-b-[3px] border-black bg-black">
        <PixelCanvas
          width={SCENE_W}
          height={SCENE_H}
          draw={draw}
          animate
          label="配對成功"
          className="block h-auto max-h-[38dvh] w-full object-contain [@media(max-height:500px)]:max-h-[28dvh]"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <p className="mb-2 text-center text-sm leading-relaxed">
          {girl.nickname}，{girl.age} 歲，{girl.distanceKm} 公里外。
          <br />
          你有一句話的機會。
        </p>
        <div className="flex flex-col gap-2.5">
          {options.map((o) => (
            <PixelButton
              key={o.kind}
              color="#f4efe0"
              textColor="#20203c"
              align="left"
              silent
              className="text-sm"
              onClick={() => onChoose(o.kind)}
            >
              {o.text}
            </PixelButton>
          ))}
        </div>
      </div>
    </div>
  );
}
