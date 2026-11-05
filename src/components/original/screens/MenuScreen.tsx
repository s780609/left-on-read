"use client";

import { useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { calendarOf, formatDate } from "@/lib/left-on-read/calendar";
import { dexProgress, isDexComplete } from "@/lib/left-on-read/dex";
import PixelCanvas from "../PixelCanvas";
import { blink, dither, glow, pixelText, rect, saw, type Ctx } from "../pixel/draw";
import { drawGuanyuBust } from "../pixel/guanyuSprite";
import { SCENE_H, SCENE_W } from "../pixel/scenes";
import type { SaveState } from "../saveStore";
import { COLOR, PixelButton } from "../ui";

/** 標題畫面：深夜，一張被手機照亮的臉，一則沒有人回的訊息 */
function drawTitle(ctx: Ctx, t: number) {
  rect(ctx, "#07081a", 0, 0, SCENE_W, SCENE_H);
  // 小窗和外面的光
  rect(ctx, "#1a1c36", 134, 8, 34, 28);
  rect(ctx, "#0b0e24", 136, 10, 30, 24);
  for (const [x, y, n] of [[140, 22, 1], [146, 16, 2], [156, 24, 3], [160, 13, 4]] as const) {
    if (blink(t + n * 900, 2300)) rect(ctx, "#ffe08a", x, y, 2, 2);
  }
  rect(ctx, "#1a1c36", 150, 10, 1, 24);
  const sweep = saw(t, 7000);
  if (sweep < 0.35) dither(ctx, "#ffeec822", 180 - (sweep / 0.35) * 240, 0, 60, 18);

  pixelText(ctx, "已讀不回", 92, 33, 34, "#000000", "center");
  pixelText(ctx, "已讀不回", 90, 31, 34, "#f6f1de", "center");
  rect(ctx, COLOR.pink, 16, 69, 148, 2);
  rect(ctx, "#7a2c44", 16, 71, 148, 1);

  drawGuanyuBust(ctx, 58, 78, { t, phoneGlow: true });
  glow(ctx, "#a8e8ff33", 90, 148, 30, t);

  // 左邊：送出去的訊息；右邊：已讀
  rect(ctx, "#f4efe0", 12, 88, 36, 18);
  rect(ctx, "#8d8a7c", 12, 106, 36, 2);
  pixelText(ctx, "妳好", 15, 89, 13, "#1a1a24");
  if (saw(t, 3600) > 0.35) pixelText(ctx, "已讀", 14, 110, 11, "#a8acc8");
  // 右邊：不斷被滑掉的小卡片
  const p = saw(t, 1800);
  const cx = 132 + p * 40;
  rect(ctx, "#f4efe0", cx, 96 - p * 8, 22, 28);
  rect(ctx, "#ff9fb0", cx + 2, 98 - p * 8, 18, 16);
  rect(ctx, "#4a2f24", cx + 7, 100 - p * 8, 8, 6);
  rect(ctx, "#f4cfae", cx + 8, 102 - p * 8, 6, 5);
}

interface MenuScreenProps {
  save: SaveState;
  onContinue: () => void;
  onNewGame: () => void;
  onDex: () => void;
  onIntro: () => void;
  onGraduation: () => void;
}

export default function MenuScreen({ save, onContinue, onNewGame, onDex, onIntro, onGraduation }: MenuScreenProps) {
  const [confirming, setConfirming] = useState(false);
  const { collected, total } = dexProgress(save.meta.dex);

  return (
    <>
      <div className="flex shrink-0 justify-center border-b-[3px] border-black bg-black">
        <PixelCanvas
          width={SCENE_W}
          height={SCENE_H}
          draw={drawTitle}
          animate
          label="已讀不回 標題畫面"
          className="block h-auto max-h-[40dvh] w-full object-contain [@media(max-height:500px)]:max-h-[28dvh]"
        />
      </div>
      <h1 className="sr-only">已讀不回</h1>
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 overflow-y-auto px-6 py-4">
        {confirming ? (
          <>
            <p className="text-center text-[15px] leading-relaxed">
              目前的進度會消失。
              <br />
              失敗圖鑑會留著，因為失敗是不會消失的。
            </p>
            <PixelButton color={COLOR.red} silent onClick={onNewGame}>
              重新開始
            </PixelButton>
            <PixelButton onClick={() => setConfirming(false)}>算了</PixelButton>
          </>
        ) : (
          <>
            {save.ready && save.run ? (
              <PixelButton color={COLOR.green} onClick={onContinue} sub={formatDate(calendarOf(save.run.dayIndex))}>
                繼續
              </PixelButton>
            ) : null}
            <PixelButton
              color={save.run ? COLOR.gray : COLOR.pink}
              silent
              onClick={() => {
                if (save.run) {
                  audioManager.pop();
                  setConfirming(true);
                } else {
                  onNewGame();
                }
              }}
            >
              新遊戲
            </PixelButton>
            <PixelButton color={COLOR.blue} onClick={onDex} sub={`${collected} / ${total}`}>
              失敗圖鑑
            </PixelButton>
            <PixelButton silent onClick={onIntro}>
              重看開場
            </PixelButton>
            {isDexComplete(save.meta.dex) ? (
              <PixelButton color={COLOR.yellow} textColor="#20203c" onClick={onGraduation}>
                重看畢業典禮
              </PixelButton>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
