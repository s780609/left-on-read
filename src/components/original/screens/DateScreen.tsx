"use client";

import { useCallback, useEffect, useState } from "react";
import { IRIS_STORY_ID, datesForStory } from "@/lib/left-on-read/stories/index";
import { pendingDateStep } from "@/lib/left-on-read/story";
import type { Chat } from "@/lib/left-on-read/storyTypes";
import { generateGirl } from "@/lib/left-on-read/girl";
import { DATE_MOMENT_SCENES, DATE_SCENES, IRIS_DATE_SCENES } from "../pixel/heroineScenes";
import { preloadPhotos } from "../pixel/scenes";
import { COLOR, DialogBox, PixelButton, Scene, ScreenBody, Typewriter, useAdvanceKeys } from "../ui";

/** 錢不夠時，開口跟她借錢的那段 */
function borrowLines(name: string, money: number, cost: number) {
  const short = (cost - money).toLocaleString("en-US");
  return [
    money > 0
      ? `結帳前我偷看了一下錢包，只剩 NT$${money.toLocaleString("en-US")}。`
      : "結帳前我偷看了一下錢包。裡面只有發票。",
    `我小聲說：「那個……差的 NT$${short} 可以先跟妳借嗎？發薪就還。」`,
    `${name}愣了一下，把錢包拿出來：「……好啊。」她笑得有點勉強。`,
  ];
}

/** 一次約會：一段對白加一個選擇。選擇只影響當下的台詞，走完才真的扣錢、往下走；錢不夠就先跟她借 */
export function DateScreen({ chat, money, onDone }: { chat: Chat; money: number; onDone: (choice: number) => void }) {
  const [choice, setChoice] = useState<number | null>(null);
  const index = pendingDateStep(chat)?.date?.index ?? 0;
  const date = datesForStory(chat.storyId)[index];
  const scenes = chat.storyId === IRIS_STORY_ID ? IRIS_DATE_SCENES : DATE_SCENES;
  useEffect(() => {
    if (chat.storyId === IRIS_STORY_ID) preloadPhotos(["dateXiangshan", "dateBeitou"]);
    else preloadPhotos(["dateMovieHands", "dateNightMarket", "dateTreePhoto"]);
  }, [chat.storyId]);
  const picked = choice === null ? null : date.options[choice];
  const name = generateGirl(chat.girlSeed).nickname;
  const borrow = money < date.cost ? borrowLines(name, money, date.cost) : null;
  // 她的回應打完才出現收尾；按第一下只把字打完，按第二下才回家
  const [typed, setTyped] = useState(false);
  const finishTyping = useCallback(() => setTyped(true), []);
  const goHome = () => {
    if (choice === null) return;
    if (typed) onDone(choice);
    else setTyped(true);
  };
  useAdvanceKeys(goHome, choice !== null);

  // 選擇之前的曖昧片段：一段一段按著看，看完才到結帳、做選擇
  const moments = date.moments ?? [];
  const [moment, setMoment] = useState(0);
  const inMoments = moment < moments.length;
  const nextMoment = useCallback(() => setMoment((m) => m + 1), []);
  useAdvanceKeys(nextMoment, inMoments);
  const current = inMoments ? moments[moment] : null;
  const sceneDraw = (current?.scene && DATE_MOMENT_SCENES[current.scene]) || scenes[index];

  if (current) {
    return (
      <div className="flex h-full flex-col">
        <Scene key={`m${moment}`} draw={sceneDraw} label={`和${name}在${date.place}`} />
        <ScreenBody
          actions={
            <PixelButton color={COLOR.pink} onClick={nextMoment}>
              繼續
            </PixelButton>
          }
        >
          <p className="mb-2 flex justify-between text-sm text-[#f2d675]">
            <span>
              {date.place}｜和{name}
            </span>
            <span className="text-xs text-[#a9abc9]">
              {moment + 1} / {moments.length + 1}
            </span>
          </p>
          <DialogBox>
            {moment === 0 && date.activity ? <p className="mb-2 text-sm text-[#a9abc9]">{date.activity}</p> : null}
            <Typewriter key={current.text} text={current.text} cps={20} />
          </DialogBox>
        </ScreenBody>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col" onClick={choice === null ? undefined : finishTyping}>
      <Scene draw={scenes[index]} label={`和${generateGirl(chat.girlSeed).nickname}在${date.place}`} />
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
            <PixelButton color={COLOR.blue} onClick={goHome}>
              回家
            </PixelButton>
          )
        }
      >
        <p className="mb-2 flex justify-between text-sm text-[#f2d675]">
          <span>
            {date.place}｜和{generateGirl(chat.girlSeed).nickname}
          </span>
          <span className="text-[#ff9a8f]">
            {borrow ? `跟她借 NT$${(date.cost - money).toLocaleString("en-US")}` : `花掉 NT$${date.cost.toLocaleString("en-US")}`}
          </span>
        </p>
        {picked ? (
          <DialogBox>
            {/* 選完之後，前面的對白留著 */}
            {borrow ? (
              <div className="mb-2 space-y-1 border-b-2 border-dashed border-[#55587a] pb-2 text-sm text-[#ff9a8f]">
                {borrow.map((l) => (
                  <p key={l}>{l}</p>
                ))}
              </div>
            ) : null}
            <p className="mb-2 text-[#c8cae0]">{date.opening}</p>
            <p className="mb-2 text-[#ffb3c4]">{picked.text}</p>
            <Typewriter key={picked.response} text={picked.response} cps={20} instant={typed} onDone={finishTyping} />
            {borrow && date.brokeNote ? (
              <p
                className="mt-2 text-sm text-[#ff9a8f]"
                style={typed ? { animation: "lor-appear 320ms ease-out both" } : { visibility: "hidden" }}
              >
                {date.brokeNote}
              </p>
            ) : null}
            <p
              className="mt-3 border-t-2 border-dashed border-[#55587a] pt-2"
              style={typed ? { animation: "lor-appear 320ms ease-out both" } : { visibility: "hidden" }}
            >
              {date.closing}
            </p>
          </DialogBox>
        ) : (
          <DialogBox>
            {date.activity ? <p className="mb-2 text-sm text-[#a9abc9]">{date.activity}</p> : null}
            {borrow ? (
              <div className="mb-2 space-y-1 border-b-2 border-dashed border-[#55587a] pb-2 text-sm text-[#ff9a8f]">
                {borrow.map((l) => (
                  <p key={l}>{l}</p>
                ))}
              </div>
            ) : null}
            <Typewriter key={date.opening} text={date.opening} cps={20} />
          </DialogBox>
        )}
      </ScreenBody>
    </div>
  );
}
