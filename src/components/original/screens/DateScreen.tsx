"use client";

import { useState } from "react";
import { HEROINE_DATES } from "@/lib/left-on-read/stories/index";
import { pendingDateStep } from "@/lib/left-on-read/story";
import type { Chat } from "@/lib/left-on-read/storyTypes";
import { DATE_SCENES } from "../pixel/heroineScenes";
import { COLOR, DialogBox, PixelButton, Scene, ScreenBody, Typewriter } from "../ui";

/** 一次約會：一段對白加一個選擇。選擇只影響當下的台詞，走完才真的扣錢、往下走 */
export function DateScreen({ chat, onDone }: { chat: Chat; onDone: (choice: number) => void }) {
  const [choice, setChoice] = useState<number | null>(null);
  const index = pendingDateStep(chat)?.date?.index ?? 0;
  const date = HEROINE_DATES[index];
  const picked = choice === null ? null : date.options[choice];

  return (
    <div className="flex h-full flex-col">
      <Scene draw={DATE_SCENES[index]} label={date.place} />
      <ScreenBody
        actions={
          choice === null ? (
            date.options.map((option, i) => (
              <PixelButton
                key={option.text}
                color="#f4efe0"
                textColor="#20203c"
                align="left"
                className="text-sm"
                onClick={() => setChoice(i)}
              >
                {option.text}
              </PixelButton>
            ))
          ) : (
            <PixelButton color={COLOR.blue} onClick={() => onDone(choice)}>
              回家
            </PixelButton>
          )
        }
      >
        <p className="mb-2 flex justify-between text-sm text-[#f2d675]">
          <span>{date.place}</span>
          <span className="text-[#ff9a8f]">花掉 NT${date.cost.toLocaleString("en-US")}</span>
        </p>
        {picked ? (
          <DialogBox>
            <Typewriter key={picked.response} text={picked.response} cps={20} />
            <p className="mt-3 border-t-2 border-dashed border-[#55587a] pt-2" style={{ animation: "lor-appear 320ms ease-out 1500ms both" }}>
              {date.closing}
            </p>
          </DialogBox>
        ) : (
          <DialogBox>
            {date.activity ? <p className="mb-2 text-sm text-[#a9abc9]">{date.activity}</p> : null}
            <Typewriter key={date.opening} text={date.opening} cps={20} />
          </DialogBox>
        )}
      </ScreenBody>
    </div>
  );
}
