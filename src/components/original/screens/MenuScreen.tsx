"use client";

import { useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { calendarOf, formatDate } from "@/lib/left-on-read/calendar";
import { ACHIEVEMENTS } from "@/lib/left-on-read/achievements";
import { dexProgress, endingProgress, isDexComplete } from "@/lib/left-on-read/dex";
import PixelCanvas from "../PixelCanvas";
import { TITLE_H, TITLE_W, drawTitleHero, drawTitleHeroStill } from "../pixel/titleHero";
import type { SaveState } from "../saveStore";
import { COLOR, PixelButton, useReducedMotion } from "../ui";

interface MenuScreenProps {
  save: SaveState;
  onContinue: () => void;
  /** ngPlus：走過結局之後的新遊戲＋ */
  onNewGame: (ngPlus: boolean) => void;
  onDex: () => void;
  onAchievements: () => void;
  onIntro: () => void;
  onGraduation: () => void;
}

export default function MenuScreen({
  save,
  onContinue,
  onNewGame,
  onDex,
  onAchievements,
  onIntro,
  onGraduation,
}: MenuScreenProps) {
  /** 要清掉目前進度時先確認；記住按的是哪一種新遊戲 */
  const [confirming, setConfirming] = useState<null | { ngPlus: boolean }>(null);
  const still = useReducedMotion();
  const { collected, total } = dexProgress(save.meta.dex);
  const canNgPlus = endingProgress(save.meta.dex).collected > 0;
  const achieved = ACHIEVEMENTS.filter((a) => Object.hasOwn(save.meta.achievements, a.id)).length;
  const startNew = (ngPlus: boolean) => {
    if (save.run) {
      audioManager.pop();
      setConfirming({ ngPlus });
    } else {
      onNewGame(ngPlus);
    }
  };

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
            <PixelButton color={COLOR.red} silent onClick={() => onNewGame(confirming.ngPlus)}>
              {confirming.ngPlus ? "帶著記憶重新開始" : "重新開始"}
            </PixelButton>
            <PixelButton onClick={() => setConfirming(null)}>算了</PixelButton>
          </>
        ) : (
          <>
            {save.ready && save.run ? (
              <PixelButton color={COLOR.green} onClick={onContinue} sub={formatDate(calendarOf(save.run.dayIndex))}>
                繼續
              </PixelButton>
            ) : null}
            {canNgPlus ? (
              <PixelButton
                color={save.run ? COLOR.gray : COLOR.yellow}
                textColor={save.run ? "#ffffff" : "#20203c"}
                silent
                onClick={() => startNew(true)}
                sub="記得上一輪學到的事：多一句開場白、白天多回一則"
              >
                新遊戲＋
              </PixelButton>
            ) : null}
            <PixelButton color={save.run || canNgPlus ? COLOR.gray : COLOR.pink} silent onClick={() => startNew(false)}>
              新遊戲
            </PixelButton>
            <PixelButton color={COLOR.blue} onClick={onDex} sub={`${collected} / ${total}`}>
              失敗圖鑑
            </PixelButton>
            <PixelButton color={COLOR.blue} onClick={onAchievements} sub={`${achieved} / ${ACHIEVEMENTS.length}`}>
              成就
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
