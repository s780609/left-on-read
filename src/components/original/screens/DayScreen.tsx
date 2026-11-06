"use client";

import { calendarOf, isWorkday } from "@/lib/left-on-read/calendar";
import { MONTHLY_RENT, MONTHLY_SALARY } from "@/lib/left-on-read/constants";
import { PAYDAY_LINES, QUIET_PHONE_LINES, WEEKEND_LINES, WORK_LINES, dailyLine } from "@/lib/left-on-read/flavor";
import { dayReplyLimit, pendingDayEvent, repliesLeft, type DayAction, type RunState } from "@/lib/left-on-read/game";
import { generateGirl } from "@/lib/left-on-read/girl";
import { holidayOf } from "@/lib/left-on-read/holidays";
import { datesForStory } from "@/lib/left-on-read/stories/index";
import { dueDateChat, pendingDateStep, readyChats, visibleChats } from "@/lib/left-on-read/story";
import { drawOfficeScene, drawPaydaySlip, drawWeekendScene } from "../pixel/scenes";
import { COLOR, DialogBox, PixelButton, Scene, ScreenBody, StatusBar, Typewriter } from "../ui";

interface DayScreenProps {
  run: RunState;
  /** 白天事件選完的那句 */
  eventNote: string | null;
  onMenu: () => void;
  onOpenChats: () => void;
  onEndDay: () => void;
  onGoDate: () => void;
  onShop: () => void;
  onDayEvent: (choice: number) => void;
}

const DAY_ACTION_LABEL: Record<DayAction, string> = { reply: "回訊息", date: "約會", shop: "打理自己" };

/** 白天：平日上班，週六在房間。白天只能做一件事：回訊息、約會、打理自己三選一；有事件時先處理事件 */
export function DayScreen({ run, eventNote, onMenu, onOpenChats, onEndDay, onGoDate, onShop, onDayEvent }: DayScreenProps) {
  const workday = isWorkday(calendarOf(run.dayIndex));
  const holiday = holidayOf(run.dayIndex);
  const event = pendingDayEvent(run);
  const chats = visibleChats(run.chats, run.dayIndex);
  const open = chats.filter((c) => !c.closed);
  const ready = readyChats(open, run.dayIndex, run.phase).length;
  const waiting = open.length - ready;
  const dateChat = dueDateChat(run.chats, run.dayIndex);
  const dateStep = dateChat && pendingDateStep(dateChat);
  const date = dateChat && dateStep?.date ? datesForStory(dateChat.storyId)[dateStep.date.index] : null;
  /** 約的是誰：之後可能同時有小晴和 Iris，按鈕要看得出來 */
  const dateWith = dateChat ? generateGirl(dateChat.girlSeed).nickname : "";
  const line = holiday?.line ?? dailyLine(workday ? WORK_LINES : WEEKEND_LINES, run.dayIndex);
  const quiet = dailyLine(QUIET_PHONE_LINES, run.dayIndex);
  const chosen = run.today.dayAction ?? null;
  /** 今天白天已經拿去做別的事：這顆按鈕停用 */
  const usedOtherThan = (action: DayAction) => chosen !== null && chosen !== action;
  const usedSub = chosen ? `今天白天已經拿去${DAY_ACTION_LABEL[chosen]}了` : "";

  return (
    <>
      <StatusBar run={run} onMenu={onMenu} />
      <Scene draw={workday ? drawOfficeScene : drawWeekendScene} label={workday ? "冠宇在辦公室上班" : "週末的租屋處"} />
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
          <>
            {date ? (
              <PixelButton
                color={COLOR.pink}
                disabled={run.money < date.cost || usedOtherThan("date")}
                onClick={onGoDate}
                sub={
                  usedOtherThan("date")
                    ? usedSub
                    : run.money < date.cost
                      ? `${date.place}｜等發薪`
                      : `${date.place}　NT$${date.cost.toLocaleString("en-US")}`
                }
              >
                跟{dateWith}出門約會
              </PixelButton>
            ) : null}
            {chats.length > 0 ? (
              <PixelButton
                color={ready > 0 && !usedOtherThan("reply") ? COLOR.pink : COLOR.gray}
                onClick={onOpenChats}
                sub={
                  usedOtherThan("reply")
                    ? `${usedSub}｜晚上再回`
                    : ready > 0
                      ? (chosen === "reply"
                          ? `今天還能認真回 ${repliesLeft(run)} 則`
                          : `白天做這件事｜最多回 ${dayReplyLimit(run)} 則`) +
                        (waiting > 0 ? `｜另外 ${waiting} 個還沒回` : "")
                      : "沒有新訊息"
                }
              >
                {workday ? "偷偷拿手機回訊息" : "看手機回訊息"}
                {ready > 0 ? `（${ready}）` : ""}
              </PixelButton>
            ) : null}
            {!workday ? (
              <PixelButton
                color={COLOR.green}
                disabled={usedOtherThan("shop")}
                onClick={onShop}
                sub={usedOtherThan("shop") ? usedSub : "剪頭髮、買衣服、拍形象照"}
              >
                出門打理自己
              </PixelButton>
            ) : null}
            <PixelButton color={COLOR.blue} onClick={onEndDay} sub={run.today.overtime ? "加班到十點，今晚不滑了" : undefined}>
              {workday ? "撐到下班" : "撐到晚上"}
            </PixelButton>
          </>
          )
        }
      >
        <DialogBox>
          {holiday ? <p className="mb-1 text-xs text-[#ff9fb4]">今天是{holiday.name}</p> : null}
          <Typewriter key={line} text={line} />
          {!event ? (
            <p className="mt-2 text-sm text-[#ffe08a]">
              {chosen
                ? `今天白天拿來${DAY_ACTION_LABEL[chosen]}了。`
                : workday
                  ? "白天能做一件事：回訊息（最多 3 則）。"
                  : "白天能做一件事：回訊息、約會或出門打理自己，三選一。"}
            </p>
          ) : null}
          {event ? <p className="mt-2 border-t-2 border-dashed border-[#55587a] pt-2">{event.text}</p> : null}
          {!event && eventNote ? <p className="mt-2 text-sm text-[#c8cae0]">{eventNote}</p> : null}
          {!event && run.today.tired ? (
            <p className="mt-2 text-sm text-[#a9abc9]">昨晚打電動打太晚，今天一直在打哈欠。</p>
          ) : null}
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
