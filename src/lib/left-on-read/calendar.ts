/**
 * dayIndex 與真實日曆的換算。全部用 UTC，不受裝置時區影響。
 */

import { START_DATE_UTC } from "./constants.ts";

const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEKDAY_NAMES = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"] as const;

export interface CalendarDay {
  year: number;
  /** 1～12 */
  month: number;
  day: number;
  /** 0 = 週日 */
  weekday: number;
}

export function calendarOf(dayIndex: number): CalendarDay {
  const d = new Date(START_DATE_UTC + dayIndex * DAY_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    weekday: d.getUTCDay(),
  };
}

export function isWorkday(c: CalendarDay): boolean {
  return c.weekday >= 1 && c.weekday <= 5;
}

/** 週二到週六都能回訊息（週日、週一整天跳過）；約會只在週六 */
export function isPhoneChatDay(c: CalendarDay): boolean {
  return isPlayDay(c);
}

/** 週日、週一直接跳過，遊戲裡只有週二到週六 */
export function isPlayDay(c: CalendarDay): boolean {
  return c.weekday !== 0 && c.weekday !== 1;
}

/** 第一個玩得到的日子（當天是就回傳當天） */
export function playDayOnOrAfter(dayIndex: number): number {
  let d = dayIndex;
  while (!isPlayDay(calendarOf(d))) d++;
  return d;
}

/** 睡一覺之後的下一天：週六睡醒就是週二 */
export function nextPlayDay(dayIndex: number): number {
  return playDayOnOrAfter(dayIndex + 1);
}

/** 每月 5 號入帳；5 號剛好是週日或週一（被跳過）就改到之後的週二（6 號或 7 號） */
export function isPayday(c: CalendarDay): boolean {
  return c.day === 5 || (c.weekday === 2 && (c.day === 6 || c.day === 7));
}

export function firstDayIndexOnOrAfter(from: number, weekday: number): number {
  return from + ((weekday - calendarOf(from).weekday + 7) % 7);
}

/** 顯示文字，例如「9月15日 週二」，不顯示年份 */
export function formatDate(c: CalendarDay): string {
  return `${c.month}月${c.day}日 ${WEEKDAY_NAMES[c.weekday]}`;
}
