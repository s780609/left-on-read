"use client";

import { useEffect, useRef, useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { NIGHT_DONE_LINES, NIGHT_LINES, NIGHT_UNREAD_LINES, QUIET_PHONE_LINES, dailyLine } from "@/lib/left-on-read/flavor";
import type { RunState } from "@/lib/left-on-read/game";
import { readyChats, visibleChats } from "@/lib/left-on-read/story";
import { drawNightScene, drawPhoneScene, drawSleepScene } from "../pixel/scenes";
import { COLOR, DialogBox, PixelButton, Scene, ScreenBody, StatusBar, Typewriter } from "../ui";

const SLEEP_MS = 1400;

interface NightScreenProps {
  run: RunState;
  onMenu: () => void;
  onOpenApp: () => void;
  onOpenChats: () => void;
  onJerkOff: () => void;
  onPlayGames: () => void;
  onSleep: () => void;
  hobbyNote: string | null;
}

/** 深夜的租屋處。睡前都能回訊息；滑完或放棄之後，就不能再開 Swipy 滑卡了 */
export function NightScreen({ run, onMenu, onOpenApp, onOpenChats, onJerkOff, onPlayGames, onSleep, hobbyNote }: NightScreenProps) {
  const [sleeping, setSleeping] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const done = run.phase === "nightDone";
  const chats = visibleChats(run.chats, run.dayIndex);
  const ready = readyChats(chats, run.dayIndex, run.phase).length;
  const waiting = chats.length - ready;
  const lines = ready > 0 ? NIGHT_UNREAD_LINES : done ? NIGHT_DONE_LINES : NIGHT_LINES;
  const line = dailyLine(lines, run.dayIndex);
  const quiet = dailyLine(QUIET_PHONE_LINES, run.dayIndex);

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

  return (
    <>
      <StatusBar run={run} onMenu={onMenu} />
      <Scene
        draw={sleeping ? drawSleepScene : done || ready > 0 ? drawPhoneScene : drawNightScene}
        label={sleeping ? "冠宇睡著了" : "深夜的租屋處"}
      />
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
            {!done ? (
              <PixelButton color={ready > 0 ? COLOR.blue : COLOR.pink} disabled={sleeping} onClick={onOpenApp}>
                打開 Swipy
              </PixelButton>
            ) : null}
            {!done && !run.nightHobby.solo ? (
              <PixelButton color={COLOR.blue} disabled={sleeping} onClick={onJerkOff} sub="消磨一下">
                打手槍
              </PixelButton>
            ) : null}
            {!done && !run.nightHobby.games ? (
              <PixelButton color={COLOR.blue} disabled={sleeping} onClick={onPlayGames} sub="排位之類的">
                打電動
              </PixelButton>
            ) : null}
            <PixelButton color={COLOR.gray} disabled={sleeping} silent onClick={goSleep}>
              {sleeping ? "晚安" : "去睡覺"}
            </PixelButton>
          </>
        }
      >
        <DialogBox>
          <Typewriter key={line} text={line} />
          {hobbyNote ? <p className="mt-2 text-sm text-[#c8cae0]">{hobbyNote}</p> : null}
          {chats.length > 0 && ready === 0 && !sleeping && !hobbyNote ? (
            <p className="mt-2 text-sm text-[#a9abc9]">{quiet}</p>
          ) : null}
        </DialogBox>
      </ScreenBody>
    </>
  );
}
