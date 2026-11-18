"use client";

import { useEffect } from "react";
import type { RunState } from "@/lib/left-on-read/game";
import { drawNightGamesScene, drawNightSoloScene, preloadPhotos } from "../pixel/scenes";
import { COLOR, DialogBox, PixelButton, Scene, ScreenBody, StatusBar, Typewriter } from "../ui";

interface HobbyScreenProps {
  run: RunState;
  kind: "solo" | "games";
  note: string;
  onMenu: () => void;
  onDone: () => void;
}

/** 晚上在房間裡打手槍或打電動之後：插圖和一句話，看完回到房間 */
export function HobbyScreen({ run, kind, note, onMenu, onDone }: HobbyScreenProps) {
  useEffect(() => preloadPhotos(["nightSolo", "nightGames"]), []);
  return (
    <>
      <StatusBar run={run} onMenu={onMenu} />
      <Scene draw={kind === "solo" ? drawNightSoloScene : drawNightGamesScene} label={kind === "solo" ? "關上門之後" : "排位的夜晚"} />
      <ScreenBody
        actions={
          <PixelButton color={COLOR.blue} onClick={onDone}>
            好
          </PixelButton>
        }
      >
        <DialogBox>
          <Typewriter key={note} text={note} />
          {run.nightHobby.calm ? <p className="mt-2 text-sm text-[#9fd3ff]">賢者模式：回訊息多一個冷靜的選項。</p> : null}
        </DialogBox>
      </ScreenBody>
    </>
  );
}
