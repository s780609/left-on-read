/**
 * 房間（俯視、一格一格走）和小晴卡片只能喜歡。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { calendarOf } from "./calendar.ts";
import { HEROINE_SEED, HEROINE_UNLOCK_FAILURES } from "./constants.ts";
import type { Dex } from "./dex.ts";
import { DAY_EVENTS, dayEventOf } from "./dayEvents.ts";
import { advance, createRun, deckCardSeed, heroineCardIndex } from "./game.ts";
import type { RunState } from "./game.ts";
import {
  ROOM_COLS,
  ROOM_OBJECTS,
  ROOM_ROWS,
  ROOM_START,
  facingObject,
  homeDayEvent,
  isWalkable,
  objectAt,
  roomIntro,
  roomMenu,
  stepRoom,
  type RoomPos,
} from "./room.ts";
import { STORIES } from "./stories/index.ts";

const ids = (run: RunState, object: Parameters<typeof roomMenu>[1]) => roomMenu(run, object).options.map((o) => o.id);

/** 第一個週六、第一個平日（週二～週五） */
const findDay = (pred: (d: number) => boolean) => {
  for (let d = 0; d < 400; d++) if (pred(d)) return d;
  throw new Error("找不到這種日子");
};
const SATURDAY = findDay((d) => calendarOf(d).weekday === 6);
const WEEKDAY = findDay((d) => calendarOf(d).weekday >= 2 && calendarOf(d).weekday <= 5 && dayEventOf(1, d) === null);

test("房間：起點走得到，物件的格子都走不上去，牆和外面也不行", () => {
  for (const start of Object.values(ROOM_START)) assert.ok(isWalkable(start.x, start.y));
  for (const cells of Object.values(ROOM_OBJECTS)) for (const [x, y] of cells) assert.ok(!isWalkable(x, y), `${x},${y}`);
  assert.ok(!isWalkable(-1, 3));
  assert.ok(!isWalkable(ROOM_COLS, 3));
  assert.ok(!isWalkable(4, 0), "後牆");
  assert.ok(!isWalkable(0, ROOM_ROWS - 1), "前牆");
});

test("房間：每一格走得到的地板都連在一起，走得到每一樣東西前面", () => {
  // 從白天起點把走得到的格子都找出來
  const seen = new Set<string>();
  const queue: RoomPos[] = [ROOM_START.day];
  while (queue.length > 0) {
    const p = queue.shift()!;
    const key = `${p.x},${p.y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    for (const dir of ["up", "down", "left", "right"] as const) {
      const r = stepRoom(p, dir);
      if (r.moved) queue.push(r.pos);
    }
  }
  assert.ok(seen.has(`${ROOM_START.night.x},${ROOM_START.night.y}`), "晚上的起點走得到");
  // 每樣東西至少有一格旁邊是走得到的地板
  for (const [id, cells] of Object.entries(ROOM_OBJECTS)) {
    const reachable = cells.some(([x, y]) =>
      [
        [x, y + 1, "up"],
        [x, y - 1, "down"],
        [x + 1, y, "left"],
        [x - 1, y, "right"],
      ].some(([nx, ny, dir]) => seen.has(`${nx},${ny}`) && facingObject({ x: nx as number, y: ny as number, dir: dir as RoomPos["dir"] }) === id)
    );
    assert.ok(reachable, `${id} 走不到前面`);
  }
});

test("房間：走一步、轉向、撞到東西", () => {
  const start: RoomPos = { x: 4, y: 3, dir: "down" };
  const r = stepRoom(start, "right");
  assert.deepEqual(r, { pos: { x: 5, y: 3, dir: "right" }, moved: true, bumped: null });
  // 床在左上：從 (2,2) 往左撞到床，只轉向
  const bed = stepRoom({ x: 2, y: 2, dir: "down" }, "left");
  assert.deepEqual(bed, { pos: { x: 2, y: 2, dir: "left" }, moved: false, bumped: "bed" });
  // 門口往下就是門
  const door = stepRoom(ROOM_START.night, "down");
  assert.equal(door.moved, false);
  assert.equal(door.bumped, "door");
  // 牆：只轉向，什麼都沒撞到
  assert.deepEqual(stepRoom({ x: 8, y: 4, dir: "up" }, "right"), { pos: { x: 8, y: 4, dir: "right" }, moved: false, bumped: null });
  assert.equal(facingObject({ x: 2, y: 2, dir: "up" }), "phone");
  assert.equal(objectAt(4, 7), "door");
});

test("平日早上：門只有上班去；手機、電腦都不能用", () => {
  const run: RunState = { ...createRun(1), phase: "daytime", dayIndex: WEEKDAY };
  assert.deepEqual(ids(run, "door"), ["goWork", "close"]);
  assert.deepEqual(ids(run, "phone"), []);
  assert.deepEqual(ids(run, "pc"), []);
  assert.deepEqual(ids(run, "bed"), []);
  assert.ok(roomIntro(run).length > 0);
});

test("週六早上：門口選約會、打理自己或待在家；有約時才有約會", () => {
  const run: RunState = { ...createRun(1), phase: "daytime", dayIndex: SATURDAY };
  assert.deepEqual(ids(run, "door"), ["shop", "stayHome", "close"]);
  const shopped = { ...run, today: { ...run.today, dayAction: "shop" as const } };
  const shop = roomMenu(shopped, "door").options.find((o) => o.id === "shop");
  assert.ok(shop && !shop.disabled, "打理自己之後還能再買別的");
});

test("颱風假：一早在房間處理，門口是在家待一天，不是上班", () => {
  const typhoon = DAY_EVENTS.find((e) => e.id === "typhoon");
  assert.ok(typhoon?.atHome);
  const day = findDay((d) => dayEventOf(1, d)?.id === "typhoon");
  const run: RunState = { ...createRun(1), phase: "daytime", dayIndex: day };
  assert.equal(homeDayEvent(run)?.id, "typhoon");
  const done = { ...run, today: { ...run.today, eventDone: true } };
  assert.equal(homeDayEvent(done), null);
  assert.deepEqual(ids(done, "door"), ["stayHome", "close"]);
});

test("平日在公司發生的事件不在房間跳出", () => {
  const day = findDay((d) => calendarOf(d).weekday >= 2 && calendarOf(d).weekday <= 5 && dayEventOf(1, d)?.id === "karaoke");
  const run: RunState = { ...createRun(1), phase: "daytime", dayIndex: day };
  assert.equal(homeDayEvent(run), null);
});

test("晚上：手機能看訊息、開 Swipy、改檔案；床能打手槍、睡覺；電腦能打電動；門不出去", () => {
  const run: RunState = { ...createRun(1), phase: "night", dayIndex: WEEKDAY };
  assert.deepEqual(ids(run, "phone"), ["openApp", "profile", "close"]);
  assert.deepEqual(ids(run, "bed"), ["jerkOff", "sleep", "close"]);
  assert.deepEqual(ids(run, "pc"), ["playGames", "close"]);
  assert.deepEqual(ids(run, "door"), []);
  // 兩件事用完：只剩睡覺
  const used = { ...run, nightActions: 2 };
  assert.deepEqual(ids(used, "bed"), ["sleep", "close"]);
  assert.deepEqual(ids(used, "pc"), []);
  assert.deepEqual(ids({ ...used, phase: "nightDone" }, "phone"), ["profile", "close"]);
});

test("小晴的卡片只能喜歡或超級喜歡，往左滑不動", () => {
  const dex: Dex = Object.fromEntries(STORIES.slice(0, HEROINE_UNLOCK_FAILURES).map((s) => [s.id, { count: 1, firstDayIndex: 0 }]));
  const base: RunState = { ...createRun(7), phase: "swiping", dayIndex: WEEKDAY, money: 10_000 };
  const index = heroineCardIndex(base, dex);
  assert.notEqual(index, null, "條件達成後每晚都有她");
  const run: RunState = { ...base, deckIndex: index! };
  assert.equal(deckCardSeed(run, dex, run.deckIndex), HEROINE_SEED);
  assert.equal(advance(run, dex, { type: "swipe", dir: "left" }).run, run);
  const liked = advance(run, dex, { type: "swipe", dir: "right" });
  assert.ok(liked.events.some((e) => e.type === "matched"));
  const superLiked = advance(run, dex, { type: "swipe", dir: "super" });
  assert.ok(superLiked.events.some((e) => e.type === "matched"));
});

test("條件達成後，小晴每晚 100% 出現", () => {
  const dex: Dex = Object.fromEntries(STORIES.slice(0, HEROINE_UNLOCK_FAILURES).map((s) => [s.id, { count: 1, firstDayIndex: 0 }]));
  for (let day = 1; day < 60; day++) {
    assert.notEqual(heroineCardIndex({ ...createRun(3), dayIndex: day }, dex), null, `第 ${day} 天`);
  }
  const fewer: Dex = Object.fromEntries(STORIES.slice(0, HEROINE_UNLOCK_FAILURES - 1).map((s) => [s.id, { count: 1, firstDayIndex: 0 }]));
  assert.equal(heroineCardIndex({ ...createRun(3), dayIndex: 5 }, fewer), null);
});
