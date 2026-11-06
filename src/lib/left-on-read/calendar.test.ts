import { test } from "node:test";
import assert from "node:assert/strict";
import { calendarOf, firstDayIndexOnOrAfter, isPayday, isPhoneChatDay, isWorkday } from "./calendar.ts";
import type { CalendarDay } from "./calendar.ts";
import { START_DATE_UTC } from "./constants.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

// CalendarDay.month 是真實月份（1～12），weekday 是 0=週日

test("起始日是 2026-03-02", () => {
  assert.equal(START_DATE_UTC, Date.UTC(2026, 2, 2));
});

test("dayIndex 0 是 2026-03-02 週一，而且要上班", () => {
  const c = calendarOf(0);
  assert.deepEqual(c, { year: 2026, month: 3, day: 2, weekday: 1 });
  assert.equal(isWorkday(c), true);
  assert.equal(isPayday(c), false);
});

test("dayIndex 3 是 3/5 週四，是領薪日", () => {
  const c = calendarOf(3);
  assert.deepEqual(c, { year: 2026, month: 3, day: 5, weekday: 4 });
  assert.equal(isPayday(c), true);
});

test("dayIndex 5、6 是週末，不用上班", () => {
  assert.deepEqual(calendarOf(5), { year: 2026, month: 3, day: 7, weekday: 6 });
  assert.deepEqual(calendarOf(6), { year: 2026, month: 3, day: 8, weekday: 0 });
  assert.equal(isWorkday(calendarOf(5)), false);
  assert.equal(isWorkday(calendarOf(6)), false);
});

test("落在週末的 5 號仍然是領薪日", () => {
  const cases: [number, number, number, number, number][] = [
    [34, 2026, 4, 5, 0],
    [125, 2026, 7, 5, 0],
    [187, 2026, 9, 5, 6],
    [278, 2026, 12, 5, 6],
  ];
  for (const [dayIndex, year, month, day, weekday] of cases) {
    const c = calendarOf(dayIndex);
    assert.deepEqual(c, { year, month, day, weekday });
    assert.equal(isPayday(c), true);
    assert.equal(isWorkday(c), false);
  }
});

test("dayIndex 309 是 2027-01-05", () => {
  const c = calendarOf(309);
  assert.deepEqual(c, { year: 2027, month: 1, day: 5, weekday: 2 });
  assert.equal(isPayday(c), true);
  assert.equal(isWorkday(c), true);
});

test("365 天內領薪日恰好 12 次，每個都是 5 號", () => {
  const paydays: CalendarDay[] = [];
  for (let i = 0; i < 365; i++) {
    const c = calendarOf(i);
    if (isPayday(c)) paydays.push(c);
  }
  assert.equal(paydays.length, 12);
  assert.ok(paydays.every((c) => c.day === 5));
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
  assert.equal(firstDayIndexOnOrAfter(0, 1), 0); // 週一找週一
  assert.equal(firstDayIndexOnOrAfter(1, 1), 7); // 週二找週一
  assert.equal(firstDayIndexOnOrAfter(0, 6), 5); // 週一找週六
  assert.equal(firstDayIndexOnOrAfter(5, 6), 5); // 週六找週六
  assert.equal(firstDayIndexOnOrAfter(6, 6), 12); // 週日找週六
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

test("平日只有週二週五能回訊息，週末也可以", () => {
  // dayIndex 0 = 2026-03-02 週一
  const expect = { 0: false, 1: true, 2: false, 3: false, 4: true, 5: true, 6: true };
  for (const [i, ok] of Object.entries(expect)) {
    assert.equal(isPhoneChatDay(calendarOf(Number(i))), ok, `dayIndex ${i}`);
  }
});
