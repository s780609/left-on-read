"use client";

import { audioManager } from "@/lib/audio/AudioManager";
import { IRIS_ENDING_BEATS } from "@/lib/left-on-read/irisEnding";
import { IRIS_ENDING_SCENES } from "../pixel/heroineScenes";
import { BeatPlayer } from "./BeatPlayer";

const playEndingSound = () => audioManager.success();

/** Iris 的另一個結局：一段一段按著看，看完這一局就結束了；沒有片尾 */
export function IrisEndingScreen({ onDone }: { onDone: () => void }) {
  return (
    <BeatPlayer
      beats={IRIS_ENDING_BEATS}
      scenes={IRIS_ENDING_SCENES}
      label="另一個結局"
      onLast={playEndingSound}
      onDone={onDone}
    />
  );
}
