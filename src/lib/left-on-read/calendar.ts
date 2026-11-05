/**
 * dayIndex 與真實日曆的換算。全部用 UTC，不受裝置時區影響。
 */

import { START_DATE_UTC } from "./constants.ts";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_NAMES = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"] as const;

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

/** 每月 5 號，週末也照常入帳 */
export function isPayday(c: CalendarDay): boolean {
  return c.day === 5;
}

export function firstDayIndexOnOrAfter(from: number, weekday: number): number {
  return from + ((weekday - calendarOf(from).weekday + 7) % 7);
}

/** 顯示文字，例如「3月5日 週四」 */
export function formatDate(c: CalendarDay): string {
  return `${c.month}月${c.day}日 ${WEEKDAY_NAMES[c.weekday]}`;
}
