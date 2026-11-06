"use client";

import { calendarOf, isWorkday } from "@/lib/left-on-read/calendar";
import { DAYTIME_REPLY_LIMIT, MONTHLY_RENT, MONTHLY_SALARY } from "@/lib/left-on-read/constants";
import { PAYDAY_LINES, QUIET_PHONE_LINES, WEEKEND_LINES, WORK_LINES, dailyLine } from "@/lib/left-on-read/flavor";
import type { RunState } from "@/lib/left-on-read/game";
import { HEROINE_DATES } from "@/lib/left-on-read/stories/index";
import { dueDateChat, pendingDateStep, readyChats, visibleChats } from "@/lib/left-on-read/story";
import { drawOfficeScene, drawPaydaySlip, drawWeekendScene } from "../pixel/scenes";
import { COLOR, DialogBox, PixelButton, Scene, ScreenBody, StatusBar, Typewriter } from "../ui";

interface DayScreenProps {
  run: RunState;
  onMenu: () => void;
  onOpenChats: () => void;
  onEndDay: () => void;
  onGoDate: () => void;
}

/** 白天：平日上班，週末在房間；有訊息可以回時才多一顆按鈕 */
export function DayScreen({ run, onMenu, onOpenChats, onEndDay, onGoDate }: DayScreenProps) {
  const workday = isWorkday(calendarOf(run.dayIndex));
  const chats = visibleChats(run.chats, run.dayIndex);
  const open = chats.filter((c) => !c.closed);
  const ready = readyChats(open, run.dayIndex, run.phase).length;
  const waiting = open.length - ready;
  const dateChat = dueDateChat(run.chats, run.dayIndex);
  const dateStep = dateChat && pendingDateStep(dateChat);
  const date = dateStep?.date ? HEROINE_DATES[dateStep.date.index] : null;
  const line = dailyLine(workday ? WORK_LINES : WEEKEND_LINES, run.dayIndex);
  const quiet = dailyLine(QUIET_PHONE_LINES, run.dayIndex);

  return (
    <>
      <StatusBar run={run} onMenu={onMenu} />
      <Scene draw={workday ? drawOfficeScene : drawWeekendScene} label={workday ? "冠宇在辦公室上班" : "週末的租屋處"} />
      <ScreenBody
        actions={
          <>
            {date ? (
              <PixelButton
                color={COLOR.pink}
                disabled={run.money < date.cost}
                onClick={onGoDate}
                sub={run.money < date.cost ? "等發薪" : `${date.place}　NT$${date.cost.toLocaleString("en-US")}`}
              >
                出門約會
              </PixelButton>
            ) : null}
            {chats.length > 0 ? (
              <PixelButton
                color={ready > 0 ? COLOR.pink : COLOR.gray}
                onClick={onOpenChats}
                sub={
                  ready > 0
                    ? `今天還能認真回 ${Math.max(0, DAYTIME_REPLY_LIMIT - run.dayReplies)} 則` +
                      (waiting > 0 ? `｜另外 ${waiting} 個還沒回` : "")
                    : "沒有新訊息"
                }
              >
                {workday ? "偷偷拿手機回訊息" : "看手機回訊息"}
                {ready > 0 ? `（${ready}）` : ""}
              </PixelButton>
            ) : null}
            <PixelButton color={COLOR.blue} onClick={onEndDay}>
              {workday ? "撐到下班" : "撐到晚上"}
            </PixelButton>
          </>
        }
      >
        <DialogBox>
          <Typewriter key={line} text={line} />
          {chats.length > 0 && ready === 0 ? (
            <p className="mt-2 text-sm text-[#a9abc9]">{quiet}</p>
          ) : null}
        </DialogBox>
      </ScreenBody>
    </>
  );
}

/** 每月 5 號：入帳和扣房租 */
export function PaydayScreen({ run, onMenu, onAck }: { run: RunState; onMenu: () => void; onAck: () => void }) {
  const after = run.money + MONTHLY_SALARY - MONTHLY_RENT;
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
            <span className="mx-2 text-[#ff9a8f]">房租水電 -{MONTHLY_RENT.toLocaleString("en-US")}</span>
          </p>
          <p className="mb-2 text-sm">餘額 NT${net}</p>
          <Typewriter key={line} text={line} />
        </DialogBox>
      </ScreenBody>
    </>
  );
}
