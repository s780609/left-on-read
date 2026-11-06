import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calendarOf,
  firstDayIndexOnOrAfter,
  formatDate,
  isPayday,
  isPhoneChatDay,
  isPlayDay,
  isWorkday,
  nextPlayDay,
} from "./calendar.ts";
import type { CalendarDay } from "./calendar.ts";
import { START_DATE_UTC } from "./constants.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

// CalendarDay.month 是真實月份（1～12），weekday 是 0=週日

test("起始日是 9 月 15 日（內部用 2026 年，週二）", () => {
  assert.equal(START_DATE_UTC, Date.UTC(2026, 8, 15));
});

test("dayIndex 0 是 9/15 週二，要上班", () => {
  const c = calendarOf(0);
  assert.deepEqual(c, { year: 2026, month: 9, day: 15, weekday: 2 });
  assert.equal(isWorkday(c), true);
  assert.equal(isPayday(c), false);
});

test("畫面上的日期不顯示年份", () => {
  assert.equal(formatDate(calendarOf(0)), "9月15日 週二");
});

test("dayIndex 4 是週六；週日（dayIndex 5）要跳過，週六睡醒是週一", () => {
  assert.deepEqual(calendarOf(4), { year: 2026, month: 9, day: 19, weekday: 6 });
  assert.equal(isPlayDay(calendarOf(4)), true);
  assert.equal(isPlayDay(calendarOf(5)), false);
  assert.equal(nextPlayDay(4), 6);
  assert.equal(calendarOf(6).weekday, 1);
  for (let i = 0; i < 400; i++) assert.ok(isPlayDay(calendarOf(nextPlayDay(i))), `dayIndex ${i}`);
});

test("dayIndex 20 是 10/5，是領薪日", () => {
  const c = calendarOf(20);
  assert.deepEqual(c, { year: 2026, month: 10, day: 5, weekday: 1 });
  assert.equal(isPayday(c), true);
});

test("5 號落在週六照常入帳；落在週日（被跳過）就改到 6 號週一", () => {
  assert.deepEqual(calendarOf(81), { year: 2026, month: 12, day: 5, weekday: 6 });
  assert.equal(isPayday(calendarOf(81)), true);
  assert.equal(calendarOf(355).weekday, 0);
  assert.equal(calendarOf(355).day, 5);
  assert.equal(nextPlayDay(354), 356);
  assert.equal(isPayday(calendarOf(356)), true);
});

test("一路照遊戲的日子走 365 天，每個月剛好領一次薪水", () => {
  const months = new Map<string, number>();
  for (let i = 0; i < 365; i = nextPlayDay(i)) {
    const c = calendarOf(i);
    if (isPayday(c)) months.set(`${c.year}-${c.month}`, (months.get(`${c.year}-${c.month}`) ?? 0) + 1);
  }
  assert.equal(months.size, 12);
  assert.ok([...months.values()].every((n) => n === 1));
});

test("週一到週五是工作日，週六週日不是", () => {
  for (let i = 0; i < 365; i++) {
    const c = calendarOf(i);
    assert.equal(isWorkday(c), c.weekday >= 1 && c.weekday <= 5, `dayIndex ${i}`);
  }
});

test("連續 800 天都和真實日曆一致（跨月、跨年、閏年規則）", () => {
  for (let i = 0; i < 800; i++) {
    const d = new Date(START_DATE_UTC + i * DAY_MS);
    assert.deepEqual(calendarOf(i), {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      weekday: d.getUTCDay(),
    });
  }
});

test("不同時區的結果相同", () => {
  const original = process.env.TZ;
  const snapshot = () => Array.from({ length: 400 }, (_, i) => calendarOf(i));
  const offsets = new Set<number>();
  const results: CalendarDay[][] = [];
  try {
    for (const tz of ["UTC", "Asia/Taipei", "America/Los_Angeles", "Pacific/Auckland"]) {
      process.env.TZ = tz;
      offsets.add(new Date(START_DATE_UTC).getTimezoneOffset());
      results.push(snapshot());
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
  // 確認時區真的有切換，不然這個測試沒有意義
  assert.ok(offsets.size >= 3, "時區沒有切換成功");
  for (const r of results) assert.deepEqual(r, results[0]);
});

test("firstDayIndexOnOrAfter：當天符合就回傳當天，否則找下一個", () => {
  assert.equal(firstDayIndexOnOrAfter(0, 2), 0); // 週二找週二
  assert.equal(firstDayIndexOnOrAfter(1, 2), 7); // 週三找週二
  assert.equal(firstDayIndexOnOrAfter(0, 6), 4); // 週二找週六
  assert.equal(firstDayIndexOnOrAfter(4, 6), 4); // 週六找週六
  assert.equal(firstDayIndexOnOrAfter(5, 6), 11); // 週日找週六
});

test("firstDayIndexOnOrAfter：一週內一定找到正確的星期", () => {
  for (let from = 0; from < 60; from++) {
    for (let weekday = 0; weekday <= 6; weekday++) {
      const r = firstDayIndexOnOrAfter(from, weekday);
      assert.ok(r >= from && r < from + 7, `from ${from} weekday ${weekday} 得到 ${r}`);
      assert.equal(calendarOf(r).weekday, weekday);
    }
  }
});

test("週一到週六都能回訊息，週日跳過", () => {
  // dayIndex 0 = 9/15 週二；週一到週六都能回，週日（dayIndex 5）跳過
  for (let i = 0; i < 7; i++) {
    assert.equal(isPhoneChatDay(calendarOf(i)), i !== 5, `dayIndex ${i}`);
  }
});
