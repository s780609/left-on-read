"use client";

import { useEffect, useRef, useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { NIGHT_DONE_LINES, NIGHT_LINES, NIGHT_UNREAD_LINES, QUIET_PHONE_LINES, dailyLine } from "@/lib/left-on-read/flavor";
import { nightActionsLeft, type RunState } from "@/lib/left-on-read/game";
import { holidayOf } from "@/lib/left-on-read/holidays";
import { readyChats, visibleChats } from "@/lib/left-on-read/story";
import {
  drawNightGamesScene,
  drawNightScene,
  drawNightSoloScene,
  drawPhoneScene,
  drawSleepScene,
  preloadPhotos,
} from "../pixel/scenes";
import { COLOR, DialogBox, PixelButton, Scene, ScreenBody, StatusBar, Typewriter } from "../ui";

const SLEEP_MS = 1400;

interface NightScreenProps {
  run: RunState;
  onMenu: () => void;
  onOpenApp: () => void;
  onOpenChats: () => void;
  onJerkOff: () => void;
  onPlayGames: () => void;
  onProfile: () => void;
  onSleep: () => void;
  hobbyNote: string | null;
  hobbyKind: null | "solo" | "games";
}

/** 深夜的租屋處。睡前都能回訊息；滑完或放棄之後，就不能再開 Swipy 滑卡了 */
export function NightScreen({
  run,
  onMenu,
  onOpenApp,
  onOpenChats,
  onJerkOff,
  onPlayGames,
  onProfile,
  onSleep,
  hobbyNote,
  hobbyKind,
}: NightScreenProps) {
  const [sleeping, setSleeping] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const done = run.phase === "nightDone";
  const chats = visibleChats(run.chats, run.dayIndex);
  const open = chats.filter((c) => !c.closed);
  const ready = readyChats(open, run.dayIndex, run.phase).length;
  const waiting = open.length - ready;
  const lines = ready > 0 ? NIGHT_UNREAD_LINES : done ? NIGHT_DONE_LINES : NIGHT_LINES;
  const holiday = holidayOf(run.dayIndex);
  const line = run.today.overtime
    ? "加班到十點才回到家。今晚沒有力氣滑卡了。"
    : dailyLine(lines, run.dayIndex);
  const quiet = dailyLine(QUIET_PHONE_LINES, run.dayIndex);
  /** 晚上能做兩件事：滑 Swipy、打手槍、打電動任選；回訊息不算 */
  const left = nightActionsLeft(run);

  useEffect(() => preloadPhotos(["night", "nightSolo", "nightGames"]), []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const goSleep = () => {
    audioManager.pop();
    setSleeping(true);
    timer.current = setTimeout(onSleep, SLEEP_MS);
  };

  const sceneDraw = (() => {
    if (sleeping) return drawSleepScene;
    if (hobbyNote && hobbyKind === "solo") return drawNightSoloScene;
    if (hobbyNote && hobbyKind === "games") return drawNightGamesScene;
    if (done || ready > 0) return drawPhoneScene;
    return drawNightScene;
  })();

  const sceneLabel = sleeping
    ? "冠宇睡著了"
    : hobbyNote && hobbyKind === "solo"
      ? "關上門之後"
      : hobbyNote && hobbyKind === "games"
        ? "排位的夜晚"
        : "深夜的租屋處";

  return (
    <>
      <StatusBar run={run} onMenu={onMenu} />
      <Scene draw={sceneDraw} label={sceneLabel} />
      <ScreenBody
        actions={
          <>
            {chats.length > 0 ? (
              <PixelButton
                color={ready > 0 ? COLOR.pink : COLOR.gray}
                disabled={sleeping}
                onClick={onOpenChats}
                sub={ready > 0 ? (waiting > 0 ? `另外 ${waiting} 個還沒回` : undefined) : "沒有新訊息"}
              >
                躺在床上回訊息
                {ready > 0 ? `（${ready}）` : ""}
              </PixelButton>
            ) : null}
            {!done && left > 0 ? (
              <PixelButton color={COLOR.pink} disabled={sleeping} onClick={onOpenApp} sub="滑一輪 10 張｜算一件事">
                打開 Swipy
              </PixelButton>
            ) : null}
            {!run.nightHobby.solo && left > 0 ? (
              <PixelButton color={COLOR.blue} disabled={sleeping} onClick={onJerkOff} sub="今晚回訊息多一個冷靜選項｜算一件事">
                打手槍
              </PixelButton>
            ) : null}
            {!run.nightHobby.games && left > 0 ? (
              <PixelButton
                color={COLOR.blue}
                disabled={sleeping}
                onClick={onPlayGames}
                sub="今晚沒回的不算已讀壓力，明天少回一則｜算一件事"
              >
                打電動
              </PixelButton>
            ) : null}
            <PixelButton color={COLOR.gray} disabled={sleeping} onClick={onProfile} sub="照片、自介、Swipy Gold">
              Swipy 個人檔案
            </PixelButton>
            <PixelButton color={COLOR.gray} disabled={sleeping} silent onClick={goSleep}>
              {sleeping ? "晚安" : "去睡覺"}
            </PixelButton>
          </>
        }
      >
        <DialogBox>
          {holiday ? <p className="mb-1 text-xs text-[#ff9fb4]">今天是{holiday.name}</p> : null}
          <Typewriter key={line} text={line} />
          {hobbyNote ? <p className="mt-2 text-sm text-[#c8cae0]">{hobbyNote}</p> : null}
          {!sleeping ? (
            <p className="mt-2 text-sm text-[#ffe08a]">
              {left > 0
                ? `今晚還能做 ${left} 件事：滑 Swipy、打手槍、打電動任選。回訊息不算。`
                : "今晚能做的事都做完了。還可以回訊息，然後睡覺。"}
            </p>
          ) : null}
          {run.nightHobby.calm && !sleeping ? (
            <p className="mt-2 text-sm text-[#9fd3ff]">賢者模式：今晚回訊息時，會多一個冷靜的選項。</p>
          ) : null}
          {chats.length > 0 && ready === 0 && !sleeping && !hobbyNote ? (
            <p className="mt-2 text-sm text-[#a9abc9]">{quiet}</p>
          ) : null}
        </DialogBox>
      </ScreenBody>
    </>
  );
}
