"use client";

import { audioManager } from "@/lib/audio/AudioManager";
import { TRUE_ENDING_BEATS } from "@/lib/left-on-read/trueEnding";
import { TRUE_ENDING_SCENES } from "../pixel/heroineScenes";
import { BeatPlayer } from "./BeatPlayer";

const playEndingSound = () => audioManager.success();

/** 真結局：一段一段按著看，看完這一局就結束了 */
export function TrueEndingScreen({ onDone }: { onDone: () => void }) {
  return (
    <BeatPlayer
      beats={TRUE_ENDING_BEATS}
      scenes={TRUE_ENDING_SCENES}
      label="真結局"
      onLast={playEndingSound}
      onDone={onDone}
    />
  );
}
