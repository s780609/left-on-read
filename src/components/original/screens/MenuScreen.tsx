"use client";

import { useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { calendarOf, formatDate } from "@/lib/left-on-read/calendar";
import { dexProgress, isDexComplete } from "@/lib/left-on-read/dex";
import PixelCanvas from "../PixelCanvas";
import { TITLE_H, TITLE_W, drawTitleHero, drawTitleHeroStill } from "../pixel/titleHero";
import type { SaveState } from "../saveStore";
import { COLOR, PixelButton, useReducedMotion } from "../ui";

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
  const still = useReducedMotion();
  const { collected, total } = dexProgress(save.meta.dex);

  return (
    <>
      <div className="flex shrink-0 justify-center border-b-[3px] border-black bg-black">
        <PixelCanvas
          width={TITLE_W}
          height={TITLE_H}
          draw={still ? drawTitleHeroStill : drawTitleHero}
          animate={!still}
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
