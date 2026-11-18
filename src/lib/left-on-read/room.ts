/**
 * 冠宇的租屋處：俯視的小房間，像老派 RPG 一樣一格一格走，面向東西按 A 調查。
 * 這裡只有資料和純函式（地圖、走路、每樣東西按下去會有什麼選項），畫面在 screens/RoomScreen.tsx。
 */

import { calendarOf, formatDate, isWorkday } from "./calendar.ts";
import type { DayEvent } from "./dayEvents.ts";
import { NIGHT_DONE_LINES, NIGHT_LINES, NIGHT_UNREAD_LINES, WEEKEND_LINES, WORK_LINES, dailyLine } from "./flavor.ts";
import { affordableDate, canDoDayAction, nightActionsLeft, pendingDayEvent, todayEvent } from "./game.ts";
import type { DayAction, RunState } from "./game.ts";
import { generateGirl } from "./girl.ts";
import { holidayOf } from "./holidays.ts";
import { datesForStory } from "./stories/index.ts";
import { pendingDateStep, readyChats, scheduledDateDay, visibleChats } from "./story.ts";

export type Dir = "up" | "down" | "left" | "right";

/** 冠宇站在哪一格、面向哪邊 */
export interface RoomPos {
  x: number;
  y: number;
  dir: Dir;
}

export type RoomObjectId = "bed" | "phone" | "window" | "pc" | "fridge" | "counter" | "trash" | "laundry" | "door";

/** 房間 8 × 11 格（直的，配手機直式）；第 0 列是後牆，最後一列是前牆和門 */
export const ROOM_COLS = 8;
export const ROOM_ROWS = 11;

/** 每樣東西佔的格子 [x, y] */
export const ROOM_OBJECTS: Readonly<Record<RoomObjectId, readonly (readonly [number, number])[]>> = {
  bed: [
    [0, 1],
    [1, 1],
    [0, 2],
    [1, 2],
    [0, 3],
    [1, 3],
  ],
  phone: [[2, 1]],
  window: [
    [3, 0],
    [4, 0],
  ],
  pc: [
    [5, 1],
    [6, 1],
  ],
  fridge: [
    [7, 1],
    [7, 2],
  ],
  counter: [
    [7, 5],
    [7, 6],
  ],
  laundry: [[0, 8]],
  trash: [[7, 8]],
  door: [[3, 10]],
};

/** 走到旁邊就會自己跳出選項的東西；其他的要點它才會看 */
export const AUTO_OBJECTS: readonly RoomObjectId[] = ["door", "phone", "bed", "pc"];

/** 早上在床邊醒來；晚上從門口進來 */
export const ROOM_START: Readonly<Record<"day" | "night", RoomPos>> = {
  day: { x: 2, y: 2, dir: "down" },
  night: { x: 3, y: 9, dir: "up" },
};

const DIRS: readonly Dir[] = ["up", "down", "left", "right"];

const DELTA: Readonly<Record<Dir, readonly [number, number]>> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

/** 這一格上的東西；沒有就是 null */
export function objectAt(x: number, y: number): RoomObjectId | null {
  for (const [id, cells] of Object.entries(ROOM_OBJECTS) as [RoomObjectId, readonly (readonly [number, number])[]][]) {
    if (cells.some(([cx, cy]) => cx === x && cy === y)) return id;
  }
  return null;
}

/** 走得上去的格子：房間裡面、不是牆、上面沒有東西 */
export function isWalkable(x: number, y: number): boolean {
  if (x < 0 || x >= ROOM_COLS || y < 1 || y >= ROOM_ROWS - 1) return false;
  return objectAt(x, y) === null;
}

/**
 * 往 dir 走一步：先轉向；前面能走就走過去。
 * 撞到東西會回傳那樣東西（撞到門就是要出門），撞到牆回傳 null。
 */
export function stepRoom(pos: RoomPos, dir: Dir): { pos: RoomPos; moved: boolean; bumped: RoomObjectId | null } {
  const [dx, dy] = DELTA[dir];
  const nx = pos.x + dx;
  const ny = pos.y + dy;
  if (isWalkable(nx, ny)) return { pos: { x: nx, y: ny, dir }, moved: true, bumped: null };
  return { pos: { ...pos, dir }, moved: false, bumped: objectAt(nx, ny) };
}

/** 面前那一格的東西 */
export function facingObject(pos: RoomPos): RoomObjectId | null {
  const [dx, dy] = DELTA[pos.dir];
  return objectAt(pos.x + dx, pos.y + dy);
}

/** 站在 pos 旁邊、會自己跳出選項的東西，和要面向哪邊才看得到它 */
export function adjacentAutoObject(pos: RoomPos): { object: RoomObjectId; dir: Dir } | null {
  // 先看面前，再照 AUTO_OBJECTS 的順序看四周
  const ahead = facingObject(pos);
  if (ahead && AUTO_OBJECTS.includes(ahead)) return { object: ahead, dir: pos.dir };
  for (const object of AUTO_OBJECTS) {
    for (const dir of DIRS) {
      const [dx, dy] = DELTA[dir];
      if (objectAt(pos.x + dx, pos.y + dy) === object) return { object, dir };
    }
  }
  return null;
}

/** 從 from 走到 goals 裡最近的一格；回傳一步一步的格子（不含起點），走不到是 null */
export function findPath(from: RoomPos, goals: readonly (readonly [number, number])[]): RoomPos[] | null {
  const goal = new Set(goals.map(([x, y]) => `${x},${y}`));
  if (goal.has(`${from.x},${from.y}`)) return [];
  const prev = new Map<string, { key: string; pos: RoomPos }>();
  const start = `${from.x},${from.y}`;
  const seen = new Set([start]);
  const queue: RoomPos[] = [from];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const dir of DIRS) {
      const r = stepRoom(cur, dir);
      if (!r.moved) continue;
      const key = `${r.pos.x},${r.pos.y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      prev.set(key, { key: `${cur.x},${cur.y}`, pos: r.pos });
      if (goal.has(key)) {
        const path: RoomPos[] = [];
        let k = key;
        while (k !== start) {
          const p = prev.get(k)!;
          path.unshift(p.pos);
          k = p.key;
        }
        return path;
      }
      queue.push(r.pos);
    }
  }
  return null;
}

/**
 * 點了房間的 (x, y) 那一格：要走哪條路、走到之後看哪樣東西。
 * 點地板就走過去；點東西就走到它旁邊、面向它；點牆或走不到的地方回傳 null。
 */
export function planTap(
  from: RoomPos,
  x: number,
  y: number
): { path: RoomPos[]; object: RoomObjectId | null; face: Dir | null } | null {
  const object = objectAt(x, y);
  if (object) {
    // 東西旁邊走得到的格子，各自記住要面向哪邊
    const spots: { x: number; y: number; dir: Dir }[] = [];
    for (const [cx, cy] of ROOM_OBJECTS[object]) {
      for (const dir of DIRS) {
        const [dx, dy] = DELTA[dir];
        const sx = cx - dx;
        const sy = cy - dy;
        if (isWalkable(sx, sy)) spots.push({ x: sx, y: sy, dir });
      }
    }
    const path = findPath(
      from,
      spots.map((p) => [p.x, p.y] as const)
    );
    if (!path) return null;
    const end = path.at(-1) ?? from;
    const spot = spots.find((p) => p.x === end.x && p.y === end.y)!;
    return { path, object, face: spot.dir };
  }
  if (!isWalkable(x, y)) return null;
  const path = findPath(from, [[x, y]]);
  return path ? { path, object: null, face: null } : null;
}

// ---------- 按 A 之後 ----------

/** 選了之後交給遊戲做的事；close 只是關掉對話框 */
export type RoomActionId =
  | "goWork"
  | "goDate"
  | "shop"
  | "stayHome"
  | "chats"
  | "openApp"
  | "profile"
  | "jerkOff"
  | "playGames"
  | "sleep"
  | "close";

export interface RoomOption {
  id: RoomActionId;
  label: string;
  sub?: string;
  disabled?: boolean;
  tone: "pink" | "blue" | "green" | "gray";
}

/** 對話框：先一句一句看 lines，看完有選項就選 */
export interface RoomDialog {
  lines: readonly string[];
  options: readonly RoomOption[];
}

const isNight = (run: RunState) => run.phase === "night" || run.phase === "nightDone";

const DAY_ACTION_LABEL: Record<DayAction, string> = { reply: "回訊息", date: "約會", shop: "打理自己" };

/** 今天的白天事件要在家裡發生（颱風假、週末），還是到公司才發生 */
export function dayEventAtHome(run: RunState, event: DayEvent): boolean {
  return Boolean(event.atHome) || !isWorkday(calendarOf(run.dayIndex));
}

/** 還沒處理、而且要在房間裡處理的白天事件 */
export function homeDayEvent(run: RunState): DayEvent | null {
  const event = pendingDayEvent(run);
  return event && dayEventAtHome(run, event) ? event : null;
}

/** 今天放颱風假這種不用上班的日子 */
function dayOff(run: RunState): boolean {
  return Boolean(todayEvent(run)?.atHome);
}

function doorMenu(run: RunState): RoomDialog {
  if (isNight(run)) return { lines: ["這麼晚了，不出門了。"], options: [] };
  const workday = isWorkday(calendarOf(run.dayIndex));
  if (workday && dayOff(run)) {
    return {
      lines: ["今天放颱風假。門外的風聲像有人在敲門。"],
      options: [
        { id: "stayHome", label: "在家待一天", tone: "blue" },
        { id: "close", label: "再想一下", tone: "gray" },
      ],
    };
  }
  if (workday) {
    return {
      lines: ["要出門上班了。"],
      options: [
        { id: "goWork", label: "上班去", tone: "blue" },
        { id: "close", label: "再待一下", tone: "gray" },
      ],
    };
  }
  const chosen = run.today.dayAction ?? null;
  const usedSub = chosen ? `今天白天已經拿去${DAY_ACTION_LABEL[chosen]}了` : undefined;
  const due = affordableDate(run);
  const dateInfo = due ? datesForStory(due.chat.storyId)[due.date.index] : null;
  const dateWith = due ? generateGirl(due.chat.girlSeed).nickname : "";
  const options: RoomOption[] = [];
  if (due && dateInfo) {
    const short = dateInfo.cost - run.money;
    options.push({
      id: "goDate",
      label: `跟${dateWith}出門約會`,
      sub: short > 0 ? `${dateInfo.place}｜錢不夠，差的 NT$${short.toLocaleString("en-US")} 要跟她借` : `${dateInfo.place}　NT$${dateInfo.cost.toLocaleString("en-US")}`,
      tone: "pink",
    });
  }
  options.push({
    id: "shop",
    label: "出門打理自己",
    sub: canDoDayAction(run, "shop") ? "剪頭髮、買衣服、拍形象照" : usedSub,
    disabled: !canDoDayAction(run, "shop"),
    tone: "green",
  });
  options.push({
    id: "stayHome",
    label: chosen ? "今天就這樣" : "今天待在家",
    sub: due ? `今天跟${dateWith}有約！不去就是放她鳥` : undefined,
    tone: "blue",
  });
  options.push({ id: "close", label: "再想一下", tone: "gray" });
  return { lines: [chosen ? "還要出門嗎？" : "週六。今天要做什麼？"], options };
}

function phoneMenu(run: RunState): RoomDialog {
  const chats = visibleChats(run.chats, run.dayIndex);
  const open = chats.filter((c) => !c.closed);
  const ready = readyChats(open, run.dayIndex, run.phase).length;
  if (!isNight(run)) {
    return {
      lines: [ready > 0 ? `手機有 ${ready} 則新訊息。晚上回到家再慢慢回。` : "手機很安靜。白天先不看了。"],
      options: [],
    };
  }
  const left = nightActionsLeft(run);
  const options: RoomOption[] = [];
  if (chats.length > 0) {
    const waiting = open.length - ready;
    options.push({
      id: "chats",
      label: `看訊息${ready > 0 ? `（${ready}）` : ""}`,
      sub: ready > 0 ? (waiting > 0 ? `另外 ${waiting} 個還沒回` : undefined) : "沒有新訊息",
      tone: ready > 0 ? "pink" : "gray",
    });
  }
  if (run.phase === "night" && left > 0) {
    options.push({ id: "openApp", label: "打開 Swipy", sub: "滑一輪 10 張｜算一件事", tone: "pink" });
  }
  options.push({ id: "profile", label: "Swipy 個人檔案", sub: "照片、自介", tone: "gray" });
  options.push({ id: "close", label: "放下手機", tone: "gray" });
  const line = ready > 0 ? `有 ${ready} 則新訊息。` : run.phase === "nightDone" ? "今天的份滑完了，還可以回訊息。" : "手機拿起來了。";
  return { lines: [line], options };
}

function bedMenu(run: RunState): RoomDialog {
  if (!isNight(run)) {
    const workday = isWorkday(calendarOf(run.dayIndex));
    return { lines: [workday && !dayOff(run) ? "被窩還是溫的。可是要上班。" : "放假的床特別軟。再躺下去，今天就沒了。"], options: [] };
  }
  const left = nightActionsLeft(run);
  const options: RoomOption[] = [];
  if (left > 0 && !run.nightHobby.solo) {
    options.push({ id: "jerkOff", label: "打手槍", sub: "今晚回訊息多一個冷靜選項｜算一件事", tone: "blue" });
  }
  options.push({ id: "sleep", label: "睡覺", tone: "gray" });
  options.push({ id: "close", label: "還不睏", tone: "gray" });
  return { lines: [left === 0 ? "今晚能做的事都做完了。" : "床。這是房間裡最大的東西。"], options };
}

function pcMenu(run: RunState): RoomDialog {
  if (!isNight(run)) return { lines: ["早上沒空打電動。螢幕上還有昨晚的戰績。"], options: [] };
  const left = nightActionsLeft(run);
  if (run.nightHobby.games) return { lines: ["今晚已經打過了。再打一場就要天亮了。"], options: [] };
  if (left === 0) return { lines: ["今晚能做的事都做完了。電腦也該休息了。"], options: [] };
  return {
    lines: ["電腦。開機的聲音比冰箱還大。"],
    options: [
      { id: "playGames", label: "打電動", sub: "今晚沒回的不算已讀壓力｜算一件事", tone: "blue" },
      { id: "close", label: "算了", tone: "gray" },
    ],
  };
}

const FLAVOR: Readonly<Record<"window" | "fridge" | "counter" | "trash" | "laundry", { day: string; night: string }>> = {
  window: { day: "外面天氣不錯。這種天氣，最適合待在冷氣房裡。", night: "樓下便利商店的燈還亮著。全世界只有它跟我還醒著。" },
  fridge: { day: "冰箱裡只有一瓶醬油跟半顆蛋。蛋是哪一天的，我不敢想。", night: "冰箱的聲音半夜特別大聲。打開，還是只有醬油。" },
  counter: { day: "流理台上有微波爐和一個沒洗的碗。碗是昨天的我留給今天的我的。", night: "微波爐的時鐘一直停在 12:00。這個房間裡，只有它不知道現在幾點。" },
  trash: { day: "垃圾車今晚八點來。我每次都錯過。", night: "垃圾桶滿了。明天的我會處理的，他人很好。" },
  laundry: { day: "髒衣服堆成一座小山。山頂那件明天還可以穿。", night: "髒衣服山又長高了。它是這個房間裡唯一在成長的。" },
};

/** 面向 object 按 A：要說的話和可以選的事 */
export function roomMenu(run: RunState, object: RoomObjectId): RoomDialog {
  switch (object) {
    case "door":
      return doorMenu(run);
    case "phone":
      return phoneMenu(run);
    case "bed":
      return bedMenu(run);
    case "pc":
      return pcMenu(run);
    default:
      return { lines: [FLAVOR[object][isNight(run) ? "night" : "day"]], options: [] };
  }
}

/** 一進房間先說的話：今天的一句、節日、約會提醒、放鳥警告 */
export function roomIntro(run: RunState): string[] {
  const holiday = holidayOf(run.dayIndex);
  const lines: string[] = [];
  if (holiday) lines.push(`今天是${holiday.name}。`);
  if (isNight(run)) {
    const chats = visibleChats(run.chats, run.dayIndex).filter((c) => !c.closed);
    const ready = readyChats(chats, run.dayIndex, run.phase).length;
    const pool = ready > 0 ? NIGHT_UNREAD_LINES : run.phase === "nightDone" ? NIGHT_DONE_LINES : NIGHT_LINES;
    lines.push(run.today.overtime ? "加班到十點才回到家。今晚沒有力氣滑卡了。" : (holiday?.line ?? dailyLine(pool, run.dayIndex)));
    for (const c of run.chats) {
      if (!c.closed && scheduledDateDay(c) === run.dayIndex) {
        lines.push(`今天和${generateGirl(c.girlSeed).nickname}約好了，我沒有去。手機很安靜，安靜得很可怕。`);
      }
    }
    return lines;
  }
  const workday = isWorkday(calendarOf(run.dayIndex));
  lines.push(holiday?.line ?? dailyLine(workday ? WORK_MORNING_LINES : WEEKEND_LINES, run.dayIndex));
  if (run.today.tired) lines.push("昨晚打電動打太晚，眼睛有點睜不開。");
  for (const c of run.chats) {
    const day = c.closed ? null : scheduledDateDay(c);
    const step = pendingDateStep(c);
    if (day === null || !step?.date) continue;
    const place = datesForStory(c.storyId)[step.date.index].place;
    const who = generateGirl(c.girlSeed).nickname;
    lines.push(day === run.dayIndex ? `今天跟${who}約在${place}。出門前再照一次鏡子。` : `已約好：${formatDate(calendarOf(day))}和${who}在${place}。`);
  }
  return lines;
}

/** 平日早上在房間裡的一句（上班的事到公司才發生） */
export const WORK_MORNING_LINES: readonly string[] = [
  "鬧鐘響了第三次。這次是認真的。",
  "刷牙的時候想了一下今天要開幾個會。想到第三個就不想了。",
  "早餐店阿姨已經知道我要什麼了。這是我在台北最穩定的關係。",
  "襯衫聞了一下，還可以。",
  "捷運卡裡剩 63 元。今天也可以撐過去。",
  "窗外有鳥在叫。牠看起來比我有精神。",
];

/** 公司裡的一句；給上班時遇到事件的畫面用 */
export { WORK_LINES };
