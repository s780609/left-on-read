"use client";

import { useEffect } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { IRIS_ENDING_BEATS } from "@/lib/left-on-read/irisEnding";
import { IRIS_ENDING_SCENES } from "../pixel/heroineScenes";
import { preloadPhotos } from "../pixel/scenes";
import { BeatPlayer } from "./BeatPlayer";

const playEndingSound = () => audioManager.success();

/** Iris 的另一個結局：一段一段按著看，看完這一局就結束了；沒有片尾 */
export function IrisEndingScreen({ onDone }: { onDone: () => void }) {
  useEffect(
    () => preloadPhotos(["irisMorning", "irisMountains", "irisFight", "irisMakeup", "irisProposal"]),
    [],
  );

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
