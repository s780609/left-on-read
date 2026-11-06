"use client";

import { audioManager } from "@/lib/audio/AudioManager";
import type { Girl } from "@/lib/left-on-read/girl";
import { LADYBUG_BEATS, LADYBUG_START_INDEX, type LadybugScene } from "@/lib/left-on-read/ladybug";
import type { TranscriptLine } from "@/lib/left-on-read/story";
import { blink, pixelText, rect, saw, type Ctx } from "../pixel/draw";
import { SCENE_H, SCENE_W, drawCommuteScene, drawNightScene } from "../pixel/scenes";
import { BeatPlayer } from "./BeatPlayer";
import { GirlAvatar } from "./ChatScreens";

/** 巷子裡一扇鐵門，招牌的霓虹燈時亮時暗 */
function drawAlley(ctx: Ctx, t: number) {
  rect(ctx, "#0b0c1a", 0, 0, SCENE_W, SCENE_H);
  rect(ctx, "#17182b", 0, 0, 62, 118);
  rect(ctx, "#1d1e33", 118, 0, 62, 118);
  rect(ctx, "#0a0a12", 62, 0, 56, 118);
  rect(ctx, "#20212f", 0, 118, SCENE_W, 32);
  for (let i = 0; i < 6; i++) rect(ctx, "#2a2b3c", i * 34 - 8, 128 + (i % 2) * 8, 26, 1);
  // 冷氣滴水、機車
  rect(ctx, "#3a3b50", 12, 26, 26, 14);
  rect(ctx, "#2b2c3e", 12, 36, 26, 4);
  if (saw(t, 1600) < 0.4) rect(ctx, "#8fb0d8", 24, 42 + saw(t, 1600) * 180, 1, 3);
  rect(ctx, "#2a2c40", 16, 104, 34, 12);
  rect(ctx, "#101018", 14, 114, 10, 8);
  rect(ctx, "#101018", 42, 114, 10, 8);
  // 招牌
  const lit = blink(t, 900) || saw(t, 3100) > 0.3;
  rect(ctx, "#1b1421", 128, 18, 40, 16);
  pixelText(ctx, "按摩", 148, 19, 13, lit ? "#ff6f91" : "#5a2c3c", "center");
  rect(ctx, lit ? "#ff6f9133" : "#00000000", 120, 12, 56, 30);
  // 主角的背影
  rect(ctx, "#15121c", 83, 70, 14, 10);
  rect(ctx, "#2a2a30", 80, 80, 20, 22);
  rect(ctx, "#101014", 84, 82, 12, 16);
  rect(ctx, "#1a1c2c", 82, 102, 7, 20);
  rect(ctx, "#1a1c2c", 91, 102, 7, 20);
}

/** 鐵門：慢慢開一條縫，裡面是暖色的光 */
function drawDoor(ctx: Ctx, t: number) {
  rect(ctx, "#101120", 0, 0, SCENE_W, SCENE_H);
  rect(ctx, "#2a2230", 44, 10, 92, 140);
  const open = Math.min(1, t / 2200);
  const gap = Math.round(open * 34);
  rect(ctx, "#f2c98a", 90 - gap / 2, 14, gap, 136);
  rect(ctx, "#ffe2ae", 90 - gap / 4, 14, gap / 2, 136);
  // 門扇
  for (let y = 14; y < 150; y += 8) {
    rect(ctx, "#4a4453", 48, y, 42 - gap / 2, 6);
    rect(ctx, "#4a4453", 90 + gap / 2, y, 42 - gap / 2, 6);
  }
  // 門縫裡的人影，看不清楚
  if (open > 0.6) {
    rect(ctx, "#6b4a36", 86, 52, 8, 8);
    rect(ctx, "#8a6a52", 84, 60, 12, 40);
  }
  rect(ctx, "#ff6f91", 140, 62, 4, 4);
}

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
  alley: drawAlley,
  door: drawDoor,
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
export function LadybugScreen({ entry, onDone }: { entry: LadybugEntry | null; onDone: () => void }) {
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
      onLast={playEndingSound}
      onDone={onDone}
    />
  );
}
