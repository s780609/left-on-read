"use client";

import { MONTHLY_BILLS, MONTHLY_BILLS_TOTAL, MONTHLY_SALARY } from "@/lib/left-on-read/constants";
import { PAYDAY_LINES, WORK_LINES, dailyLine } from "@/lib/left-on-read/flavor";
import { pendingDayEvent, type RunState } from "@/lib/left-on-read/game";
import { drawOfficeScene, drawPaydaySlip } from "../pixel/scenes";
import { COLOR, DialogBox, PixelButton, Scene, ScreenBody, StatusBar, Typewriter } from "../ui";

interface WorkScreenProps {
  run: RunState;
  /** 事件選完的那句 */
  eventNote: string | null;
  onMenu: () => void;
  onDayEvent: (choice: number) => void;
  onEndDay: () => void;
}

/** 上班途中遇到事件才會看到這個畫面：在公司處理完，撐到下班 */
export function WorkScreen({ run, eventNote, onMenu, onDayEvent, onEndDay }: WorkScreenProps) {
  const event = pendingDayEvent(run);
  const line = dailyLine(WORK_LINES, run.dayIndex);
  return (
    <>
      <StatusBar run={run} onMenu={onMenu} />
      <Scene draw={drawOfficeScene} label="冠宇在辦公室上班" />
      <ScreenBody
        actions={
          event ? (
            event.choices.map((choice, i) => {
              const broke = run.money + (choice.money ?? 0) < 0;
              return (
                <PixelButton
                  key={choice.label}
                  color={i === 0 ? COLOR.pink : COLOR.gray}
                  disabled={broke}
                  sub={broke ? "錢不夠" : undefined}
                  onClick={() => onDayEvent(i)}
                >
                  {choice.label}
                </PixelButton>
              );
            })
          ) : (
            <PixelButton color={COLOR.blue} onClick={onEndDay} sub={run.today.overtime ? "加班到十點，今晚不滑了" : undefined}>
              撐到下班
            </PixelButton>
          )
        }
      >
        <DialogBox>
          <Typewriter key={line} text={line} />
          {event ? <p className="mt-2 border-t-2 border-dashed border-[#55587a] pt-2">{event.text}</p> : null}
          {!event && eventNote ? <p className="mt-2 text-sm text-[#c8cae0]">{eventNote}</p> : null}
        </DialogBox>
      </ScreenBody>
    </>
  );
}

/** 每月 5 號：入帳和扣房租 */
export function PaydayScreen({ run, onMenu, onAck }: { run: RunState; onMenu: () => void; onAck: () => void }) {
  const after = Math.max(0, run.money + MONTHLY_SALARY - MONTHLY_BILLS_TOTAL);
  const line = dailyLine(PAYDAY_LINES, run.dayIndex);
  const net = after.toLocaleString("en-US");
  return (
    <>
      <StatusBar run={run} onMenu={onMenu} />
      <Scene draw={(ctx, t) => drawPaydaySlip(ctx, t, net)} label="薪資入帳通知" />
      <ScreenBody
        actions={
          <PixelButton color={COLOR.green} silent onClick={onAck}>
            收到了
          </PixelButton>
        }
      >
        <DialogBox>
          <p className="text-sm">
            <span className="text-[#8fe0b0]">薪水 +{MONTHLY_SALARY.toLocaleString("en-US")}</span>
          </p>
          <p className="text-sm text-[#ff9a8f]">
            {MONTHLY_BILLS.map((b) => `${b.label} -${b.amount.toLocaleString("en-US")}`).join("　")}
          </p>
          <p className="mb-2 text-sm">餘額 NT${net}</p>
          <Typewriter key={line} text={line} />
        </DialogBox>
      </ScreenBody>
    </>
  );
}
