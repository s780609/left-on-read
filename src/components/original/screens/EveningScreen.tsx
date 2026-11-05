"use client";

import { NOODLE_PRICE } from "@/lib/left-on-read/constants";
import { offeredMeal, type RunState } from "@/lib/left-on-read/game";
import type { MealDish } from "@/lib/left-on-read/meals";
import { drawCommuteScene, drawNoodleScene, eateryScene } from "../pixel/scenes";
import { COLOR, DialogBox, PixelButton, Scene, ScreenBody, StatusBar, Typewriter } from "../ui";

interface EveningScreenProps {
  run: RunState;
  onMenu: () => void;
  onEatOut: () => void;
  onGoHome: () => void;
}

/** 下班後：巷口的小吃店，或是直接回去泡麵 */
export function EveningScreen({ run, onMenu, onEatOut, onGoHome }: EveningScreenProps) {
  const meal = offeredMeal(run);
  const enough = meal !== undefined && run.money >= meal.price;
  return (
    <>
      <StatusBar run={run} onMenu={onMenu} />
      <Scene draw={drawCommuteScene} label="下班的人潮" />
      <ScreenBody
        actions={
          <>
            <PixelButton
              color={COLOR.yellow}
              textColor="#20203c"
              disabled={!enough}
              onClick={onEatOut}
              sub={enough ? `NT$${meal?.price}` : "錢不夠"}
            >
              去吃飯：{meal?.name}
            </PixelButton>
            <PixelButton color={COLOR.blue} onClick={onGoHome} sub={`泡麵 NT$${NOODLE_PRICE}`}>
              直接回租屋處
            </PixelButton>
          </>
        }
      >
        <DialogBox>
          <p>今天也下班了。巷口的燈亮著。</p>
          <p className="mt-1 text-sm text-[#a9abc9]">身上還有 NT${run.money.toLocaleString("en-US")}。</p>
        </DialogBox>
      </ScreenBody>
    </>
  );
}

export interface MealNote {
  name: string;
  price: number;
  narration: string;
  dish: MealDish;
  home: boolean;
}

/** 吃飯那一句旁白，看完才回到深夜 */
export function MealScreen({
  run,
  note,
  onMenu,
  onDone,
}: {
  run: RunState;
  note: MealNote;
  onMenu: () => void;
  onDone: () => void;
}) {
  return (
    <>
      <StatusBar run={run} onMenu={onMenu} />
      <Scene draw={note.home ? drawNoodleScene : eateryScene(note.dish)} label={note.home ? "一個人吃泡麵" : "一個人在小吃店吃飯"} />
      <ScreenBody
        actions={
          <PixelButton color={COLOR.blue} onClick={onDone}>
            {note.home ? "吃完了" : "回租屋處"}
          </PixelButton>
        }
      >
        <DialogBox>
          <p className="mb-1 text-sm text-[#f2d675]">
            {note.name}　NT${note.price}
          </p>
          <Typewriter key={note.narration} text={note.narration} />
        </DialogBox>
      </ScreenBody>
    </>
  );
}
