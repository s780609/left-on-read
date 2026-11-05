"use client";

import { useEffect, useMemo, useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import type { Dex } from "@/lib/left-on-read/dex";
import { STORIES } from "@/lib/left-on-read/stories/index";
import PixelCanvas from "../PixelCanvas";
import { blink, pixelText, rect, saw, type Ctx } from "../pixel/draw";
import { drawGuanyuBust } from "../pixel/guanyuSprite";
import { SCENE_H, SCENE_W } from "../pixel/scenes";
import { COLOR, PixelButton } from "../ui";

function drawDiploma(ctx: Ctx, t: number) {
  rect(ctx, "#1a1236", 0, 0, SCENE_W, SCENE_H);
  // 空無一人的禮堂：布幕和舞台
  for (let i = 0; i < 180; i += 12) {
    rect(ctx, "#6a1f3a", i, 0, 11, 110);
    rect(ctx, "#551730", i + 8, 0, 3, 110);
  }
  rect(ctx, "#3a2a20", 0, 110, 180, 40);
  rect(ctx, "#5a4230", 0, 110, 180, 3);
  // 紅布條
  rect(ctx, "#b8322c", 44, 8, 124, 20);
  pixelText(ctx, "畢業典禮", 106, 9, 16, "#ffe9a8", "center");
  // 聚光燈跟著他
  ctx.fillStyle = "#fff6c822";
  for (let y = 24; y < 112; y += 2) {
    const half = 8 + (y - 24) * 0.42;
    ctx.fillRect(90 - half, y, half * 2, 1);
  }
  drawGuanyuBust(ctx, 58, 44, { t, gradCap: true });
  // 手上那張證書
  rect(ctx, "#000000", 16, 84, 44, 34);
  rect(ctx, "#f6efd8", 18, 82, 44, 34);
  rect(ctx, "#c8a24a", 20, 84, 40, 30);
  rect(ctx, "#f6efd8", 21, 85, 38, 28);
  pixelText(ctx, "證書", 40, 85, 13, "#7a2c44", "center");
  for (let i = 0; i < 3; i++) rect(ctx, "#8d8a7c", 24, 102 + i * 3, 24 - i * 5, 1);
  rect(ctx, "#c9423a", 50, 105, 7, 7);
  // 只有一個人在拍手：窗邊的紙屑慢慢掉
  for (let i = 0; i < 14; i++) {
    const p = saw(t + i * 470, 4200);
    const colors = ["#ffe08a", "#ff9fb4", "#9fd8ff"];
    if (blink(t + i * 90, 260) || i % 2) {
      rect(ctx, colors[i % 3], ((i * 41) % 170) + 5 + Math.sin(p * 8) * 3, p * 112, 2, 2);
    }
  }
}

interface GraduationScreenProps {
  dex: Dex;
  dayIndex: number | null;
  onContinue: () => void;
  onMenu: () => void;
}

/** 集滿圖鑑的自嘲收尾。男性困境學系，全部修畢，全部不及格。 */
export function GraduationScreen({ dex, dayIndex, onContinue, onMenu }: GraduationScreenProps) {
  const total = useMemo(
    () => STORIES.reduce((sum, s) => sum + (Object.hasOwn(dex, s.id) ? dex[s.id].count : 0), 0),
    [dex]
  );
  const lines = useMemo(
    () => [
      "陳冠宇　二十五歲",
      "於私立 Swipy 大學　男性困境學系　修業期滿。",
      "已讀、斷聯、業績、秒殺四大學程，共 27 門，全部修畢。",
      `總計失敗 ${total} 次${dayIndex !== null ? `，歷時 ${dayIndex + 1} 天` : ""}。成績全部不及格，學分全部拿到。`,
      "特頒此證，以資證明他還在滑。",
      "校長沒有來。來了大概也會已讀。",
      "明天還是要上班。",
    ],
    [total, dayIndex]
  );
  const [shown, setShown] = useState(1);

  useEffect(() => {
    audioManager.success();
    const id = setInterval(() => {
      setShown((n) => {
        if (n >= lines.length) clearInterval(id);
        return Math.min(lines.length, n + 1);
      });
    }, 1100);
    return () => clearInterval(id);
  }, [lines.length]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 justify-center border-b-[3px] border-black bg-black">
        <PixelCanvas
          width={SCENE_W}
          height={SCENE_H}
          draw={drawDiploma}
          animate
          label="冠宇的畢業典禮"
          className="block h-auto max-h-[40dvh] w-full object-contain [@media(max-height:500px)]:max-h-[28dvh]"
        />
      </div>
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-5 py-3 text-[15px] leading-relaxed">
        {lines.slice(0, shown).map((line, i) => (
          <p key={line} className={i >= 5 ? "text-[#ff9fb4]" : ""}>
            {line}
          </p>
        ))}
      </div>
      <div className="flex shrink-0 flex-col gap-2.5 border-t-[3px] border-black bg-[#191933] px-4 py-3">
        <PixelButton color={COLOR.green} onClick={onContinue}>
          繼續過日子
        </PixelButton>
        <PixelButton onClick={onMenu}>回選單</PixelButton>
      </div>
    </div>
  );
}
