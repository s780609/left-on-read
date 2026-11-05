"use client";

import { useEffect, useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { TRUE_ENDING_BEATS } from "@/lib/left-on-read/trueEnding";
import { TRUE_ENDING_SCENES } from "../pixel/heroineScenes";
import { COLOR, DialogBox, PixelButton, Scene, Typewriter } from "../ui";

/** 真結局：一段一段按著看，看完這一局就結束了 */
export function TrueEndingScreen({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const beat = TRUE_ENDING_BEATS[index];
  const last = index === TRUE_ENDING_BEATS.length - 1;

  useEffect(() => {
    if (last) audioManager.success();
  }, [last]);

  return (
    <div className="flex h-full flex-col">
      <Scene key={index} draw={TRUE_ENDING_SCENES[beat.scene]} label="真結局" />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {last ? (
          <div className="pt-2 text-center">
            {beat.text.split("\n").map((line, i) => (
              <p key={line} className={i === 0 ? "mb-3 text-3xl text-[#ff6f91]" : "mt-1 leading-relaxed"}>
                {line}
              </p>
            ))}
          </div>
        ) : (
          <DialogBox>
            <Typewriter key={beat.text} text={beat.text} cps={20} />
          </DialogBox>
        )}
      </div>
      <div className="shrink-0 border-t-[3px] border-black bg-[#191933] px-4 py-3">
        {last ? (
          <PixelButton color={COLOR.blue} onClick={onDone}>
            回選單
          </PixelButton>
        ) : (
          <PixelButton color={COLOR.gray} onClick={() => setIndex(index + 1)}>
            ……
          </PixelButton>
        )}
      </div>
    </div>
  );
}
