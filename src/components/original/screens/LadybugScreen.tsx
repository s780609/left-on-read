"use client";

import { useEffect } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import type { Girl } from "@/lib/left-on-read/girl";
import { LADYBUG_BEATS, LADYBUG_START_INDEX, type LadybugScene } from "@/lib/left-on-read/ladybug";
import type { TranscriptLine } from "@/lib/left-on-read/story";
import { blink, pixelText, rect, saw, type Ctx } from "../pixel/draw";
import { SCENE_H, SCENE_W, drawCommuteScene, drawLadybugAlleyScene, drawNightScene, photoDraw, preloadPhotos } from "../pixel/scenes";
import { BeatPlayer } from "./BeatPlayer";
import { GirlAvatar } from "./ChatScreens";

/** 他的 Excel：每個月的數字越來越接近一個月能花的全部 */
function drawLedger(ctx: Ctx, t: number) {
  rect(ctx, "#e8ebe4", 0, 0, SCENE_W, SCENE_H);
  rect(ctx, "#2f7d5b", 0, 0, SCENE_W, 14);
  pixelText(ctx, "風俗記帳.xlsx", 90, 0, 12, "#ffffff", "center");
  const rows = [
    ["月份", "次數", "花費"],
    ["3 月", "1", "3,000"],
    ["4 月", "3", "9,000"],
    ["5 月", "5", "15,000"],
    ["6 月", "7", "21,000"],
    ["7 月", "8", "23,500"],
  ];
  const shown = Math.min(rows.length, 1 + Math.floor(t / 650));
  rows.slice(0, shown).forEach(([a, b, c], i) => {
    const y = 18 + i * 20;
    rect(ctx, i === 0 ? "#cfd8cc" : "#f6f7f2", 36, y, 138, 18);
    rect(ctx, "#9aa596", 36, y + 18, 138, 1);
    const red = i === rows.length - 1;
    pixelText(ctx, a, 40, y + 1, 13, "#20203c");
    pixelText(ctx, b, 86, y + 1, 13, "#20203c");
    pixelText(ctx, c, 124, y + 1, 13, red ? "#c9423a" : "#20203c");
  });
  if (shown >= rows.length && blink(t, 500)) rect(ctx, "#c9423a", 36, 136, 138, 2);
}

function drawTitle(ctx: Ctx, t: number) {
  rect(ctx, "#07070f", 0, 0, SCENE_W, SCENE_H);
  // 一隻紅色瓢蟲慢慢爬過去
  const x = 24 + saw(t, 9000) * 132;
  const y = 74 + Math.sin(t / 700) * 2;
  rect(ctx, "#15121c", x + 11, y + 2, 5, 7);
  rect(ctx, "#c9231f", x, y, 12, 10);
  rect(ctx, "#c9231f", x + 1, y - 1, 10, 12);
  rect(ctx, "#15121c", x, y + 4, 12, 1);
  for (const [dx, dy] of [[2, 1], [7, 2], [3, 7], [8, 7]] as const) rect(ctx, "#15121c", x + dx, y + dy, 2, 2);
  const leg = blink(t, 260) ? 0 : 1;
  for (const dx of [2, 6, 9]) {
    rect(ctx, "#15121c", x + dx + leg, y - 2, 1, 1);
    rect(ctx, "#15121c", x + dx - leg, y + 11, 1, 1);
  }
}

function drawBlack(ctx: Ctx) {
  rect(ctx, "#000000", 0, 0, SCENE_W, SCENE_H);
}

const DRAW: Record<Exclude<LadybugScene, "chat">, (ctx: Ctx, t: number) => void> = {
  alley: drawLadybugAlleyScene,
  door: photoDraw("ladybugDoor"),
  black: drawBlack,
  commute: drawCommuteScene,
  ledger: drawLedger,
  bed: drawNightScene,
  title: drawTitle,
};

const playEndingSound = () => audioManager.wrong();

export interface LadybugEntry {
  girl: Girl;
  /** 聊天室裡 1h2s 那題之前的對話 */
  history: readonly TranscriptLine[];
  /** 聊天室選項區當下的高度 */
  panelHeight?: number;
}

/** 瓢蟲結局：一段一段按著看，看完這一局就結束了。從聊天室進來時版面相同，看起來還在同一個聊天室 */
export function LadybugScreen({
  entry,
  doneLabel,
  onDone,
}: {
  entry: LadybugEntry | null;
  doneLabel?: string;
  onDone: () => void;
}) {
  useEffect(() => preloadPhotos(["ladybugAlley", "ladybugDoor"]), []);
  return (
    <BeatPlayer
      beats={LADYBUG_BEATS}
      scenes={DRAW}
      label="瓢蟲結局"
      startIndex={LADYBUG_START_INDEX}
      fadeIn={!entry}
      chatHeader={
        entry ? (
          <>
            <GirlAvatar girl={entry.girl} size={36} />
            <div className="min-w-0 flex-1 truncate leading-tight">
              {entry.girl.nickname}
              <span className="ml-1 text-xs text-[#a9abc9]">{entry.girl.age}</span>
            </div>
          </>
        ) : undefined
      }
      chatHistory={entry?.history}
      panelFromHeight={entry?.panelHeight}
      // 從圖鑑重看沒有結束任何一局，只有真的走到這裡才講
      lastNote={entry ? "這一局到這裡結束。" : undefined}
      doneLabel={doneLabel}
      onLast={playEndingSound}
      onDone={onDone}
    />
  );
}
