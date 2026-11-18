/**
 * 冠宇租屋處的俯視像素圖：一格 16 px，8 × 11 格（直的）。全部用 fillRect 畫，不用圖片檔。
 * 擺設的位置對齊 lib/left-on-read/room.ts 的 ROOM_OBJECTS。
 */

import type { Dir } from "@/lib/left-on-read/room";
import { glow, rect, sprite, type Ctx } from "./draw";

export const TILE = 16;
export const ROOM_W = 8 * TILE;
export const ROOM_H = 11 * TILE;

const C = {
  wall: "#e7dcc2",
  wallShade: "#cbbd9c",
  baseboard: "#8b7a5a",
  floor: "#c99b64",
  floorLine: "#b0844f",
  floorDark: "#a8794a",
  rug: "#7b8fc4",
  rugEdge: "#5a6ea3",
  wood: "#7a5232",
  woodTop: "#9b6a40",
  woodDark: "#5a3b22",
  sheet: "#f4f1e6",
  blanket: "#4f78b8",
  blanketShade: "#3d5f96",
  metal: "#dfe4ea",
  metalShade: "#b8c0ca",
  black: "#1b1b22",
  screenOff: "#3a3f55",
  screenOn: "#6fb6ff",
  pink: "#ff6f91",
};

function floor(ctx: Ctx) {
  rect(ctx, C.floor, 0, TILE, ROOM_W, ROOM_H - 2 * TILE);
  // 木地板：每 8 px 一條，接縫錯開
  for (let y = TILE; y < ROOM_H - TILE; y += 8) {
    rect(ctx, C.floorLine, 0, y, ROOM_W, 1);
    const offset = (y / 8) % 2 === 0 ? 0 : 24;
    for (let x = offset; x < ROOM_W; x += 48) rect(ctx, C.floorLine, x, y, 1, 8);
  }
  // 地毯（2～5 欄、4～6 列）
  rect(ctx, C.rugEdge, 2 * TILE + 4, 4 * TILE, 4 * TILE - 8, 3 * TILE);
  rect(ctx, C.rug, 2 * TILE + 6, 4 * TILE + 2, 4 * TILE - 12, 3 * TILE - 4);
  for (let x = 2 * TILE + 10; x < 6 * TILE - 8; x += 6) rect(ctx, C.rugEdge, x, 5 * TILE + 8, 3, 1);
}

function walls(ctx: Ctx, night: boolean, t: number) {
  // 後牆
  rect(ctx, C.wall, 0, 0, ROOM_W, TILE);
  rect(ctx, C.wallShade, 0, 0, ROOM_W, 2);
  rect(ctx, C.baseboard, 0, TILE - 2, ROOM_W, 2);
  // 窗戶（3～4 格）
  const wx = 3 * TILE + 4;
  const ww = 2 * TILE - 8;
  rect(ctx, "#f6f1de", wx - 2, 1, ww + 4, 12);
  rect(ctx, night ? "#1d2550" : "#9fd8ff", wx, 3, ww, 8);
  if (night) {
    rect(ctx, "#fff3b0", wx + ww - 6, 4, 3, 3);
    rect(ctx, "#ffffff", wx + 4, 5, 1, 1);
    if (Math.floor(t / 600) % 2 === 0) rect(ctx, "#ffffff", wx + 10, 8, 1, 1);
  } else {
    rect(ctx, "#ffffff", wx + 3, 5, 7, 2);
    rect(ctx, "#ffffff", wx + 5, 4, 3, 1);
  }
  rect(ctx, "#f6f1de", wx + ww / 2 - 1, 3, 2, 8);
  // 窗簾
  rect(ctx, "#d9837a", wx - 5, 1, 3, 13);
  rect(ctx, "#d9837a", wx + ww + 2, 1, 3, 13);
  // 海報
  rect(ctx, C.black, TILE + 3, 2, 10, 11);
  rect(ctx, "#ff9fb4", TILE + 4, 3, 8, 9);
  rect(ctx, "#2a2a4e", TILE + 6, 5, 4, 5);
  // 月曆
  rect(ctx, "#f6f1de", 6 * TILE + 4, 3, 8, 9);
  rect(ctx, C.pink, 6 * TILE + 4, 3, 8, 2);
  for (let i = 0; i < 3; i++) rect(ctx, C.baseboard, 6 * TILE + 5 + i * 2, 7, 1, 1);
  // 前牆（最後一列），門在第 3 格
  rect(ctx, C.wallShade, 0, ROOM_H - TILE, ROOM_W, TILE);
  rect(ctx, C.baseboard, 0, ROOM_H - TILE, ROOM_W, 2);
  const dx = 3 * TILE;
  rect(ctx, C.woodDark, dx + 1, ROOM_H - TILE, TILE - 2, TILE);
  rect(ctx, C.wood, dx + 2, ROOM_H - TILE + 1, TILE - 4, TILE - 1);
  rect(ctx, "#f2d675", dx + TILE - 5, ROOM_H - TILE + 7, 2, 2);
  // 門口的踏墊
  rect(ctx, "#8a6d55", dx + 2, ROOM_H - TILE - 4, TILE - 4, 4);
}

function bed(ctx: Ctx) {
  const x = 0;
  const y = TILE;
  rect(ctx, C.woodDark, x, y, 2 * TILE, 3 * TILE);
  rect(ctx, C.sheet, x + 2, y + 2, 2 * TILE - 4, 3 * TILE - 4);
  // 枕頭
  rect(ctx, "#ffffff", x + 5, y + 4, 2 * TILE - 10, 7);
  rect(ctx, C.metalShade, x + 5, y + 10, 2 * TILE - 10, 1);
  // 棉被
  rect(ctx, C.blanket, x + 2, y + 16, 2 * TILE - 4, 3 * TILE - 18);
  rect(ctx, C.blanketShade, x + 2, y + 16, 2 * TILE - 4, 2);
  for (let i = 0; i < 4; i++) rect(ctx, C.blanketShade, x + 6 + i * 6, y + 26, 2, 2);
}

function nightstand(ctx: Ctx, night: boolean, unread: boolean, t: number) {
  const x = 2 * TILE;
  const y = TILE;
  rect(ctx, C.woodDark, x + 1, y + 3, TILE - 2, TILE - 3);
  rect(ctx, C.woodTop, x + 1, y + 2, TILE - 2, 4);
  rect(ctx, C.woodTop, x + 3, y + 9, TILE - 6, 1);
  // 手機
  rect(ctx, C.black, x + 5, y + 1, 6, 4);
  rect(ctx, night ? C.screenOn : C.screenOff, x + 6, y + 2, 4, 2);
  if (unread && Math.floor(t / 400) % 2 === 0) rect(ctx, C.pink, x + 10, y, 2, 2);
}

function desk(ctx: Ctx, night: boolean, t: number) {
  const x = 5 * TILE;
  const y = TILE;
  rect(ctx, C.woodDark, x, y + 4, 2 * TILE, TILE - 4);
  rect(ctx, C.woodTop, x, y + 3, 2 * TILE, 4);
  // 螢幕
  rect(ctx, C.black, x + 7, y - 4, 18, 11);
  rect(ctx, night ? C.screenOn : C.screenOff, x + 8, y - 3, 16, 8);
  if (night) {
    const blink = Math.floor(t / 500) % 2;
    rect(ctx, "#ffffff", x + 10, y - 1, 6, 1);
    rect(ctx, "#ffffff", x + 10, y + 1, 9 - blink * 3, 1);
  }
  rect(ctx, C.black, x + 15, y + 7, 2, 2);
  // 鍵盤
  rect(ctx, C.metalShade, x + 8, y + 10, 16, 3);
  // 泡麵碗
  rect(ctx, "#f6f1de", x + 27, y + 7, 4, 4);
  rect(ctx, "#d9837a", x + 27, y + 7, 4, 1);
}

function fridge(ctx: Ctx) {
  const x = 7 * TILE;
  const y = TILE;
  rect(ctx, C.metalShade, x + 1, y - 2, TILE - 2, 2 * TILE + 2);
  rect(ctx, C.metal, x + 2, y - 1, TILE - 4, 2 * TILE);
  rect(ctx, C.metalShade, x + 2, y + 9, TILE - 4, 1);
  rect(ctx, "#8a8f99", x + 11, y + 2, 1, 5);
  rect(ctx, "#8a8f99", x + 11, y + 13, 1, 8);
  // 冰箱上的磁鐵
  rect(ctx, C.pink, x + 4, y + 14, 2, 2);
}

function laundry(ctx: Ctx) {
  const x = 0;
  const y = 8 * TILE;
  rect(ctx, "#5b6b8a", x + 1, y + 7, 14, 8);
  rect(ctx, "#c9a227", x + 3, y + 4, 8, 6);
  rect(ctx, "#6d6f78", x + 7, y + 2, 7, 6);
  rect(ctx, "#f6f1de", x + 4, y + 1, 4, 3);
}

/** 流理台：微波爐和水槽（右牆 5～6 列） */
function counter(ctx: Ctx, t: number) {
  const x = 7 * TILE;
  const y = 5 * TILE;
  rect(ctx, C.metalShade, x + 1, y, TILE - 1, 2 * TILE);
  rect(ctx, C.metal, x + 2, y + 1, TILE - 3, 2 * TILE - 2);
  // 水槽
  rect(ctx, "#8a8f99", x + 4, y + 18, 9, 9);
  rect(ctx, "#b8d4e6", x + 5, y + 19, 7, 7);
  // 微波爐，時鐘一直閃 12:00
  rect(ctx, C.black, x + 3, y + 2, 11, 10);
  rect(ctx, "#3a3f55", x + 4, y + 3, 6, 8);
  if (Math.floor(t / 700) % 2 === 0) rect(ctx, "#8fe0b0", x + 11, y + 4, 2, 1);
}

function trash(ctx: Ctx) {
  const x = 7 * TILE;
  const y = 8 * TILE;
  rect(ctx, "#6d6f78", x + 3, y + 4, 10, 11);
  rect(ctx, "#8a8f99", x + 2, y + 3, 12, 2);
  rect(ctx, "#f6f1de", x + 5, y + 1, 4, 3);
  rect(ctx, "#ff9a8f", x + 8, y + 2, 3, 2);
}

/** 整個房間（不含冠宇） */
export function drawRoom(ctx: Ctx, opts: { night: boolean; unread: boolean; t: number }) {
  const { night, unread, t } = opts;
  floor(ctx);
  walls(ctx, night, t);
  bed(ctx);
  nightstand(ctx, night, unread, t);
  desk(ctx, night, t);
  fridge(ctx);
  counter(ctx, t);
  laundry(ctx);
  trash(ctx);
}

/** 晚上的暗色，再把手機、螢幕、窗外的光補回來 */
export function drawNightShade(ctx: Ctx, t: number) {
  ctx.save();
  ctx.globalAlpha = 0.42;
  rect(ctx, "#0f0f2d", 0, 0, ROOM_W, ROOM_H);
  ctx.restore();
  glow(ctx, "#6fb6ff", 5 * TILE + 16, TILE + 1, 9, t);
  glow(ctx, "#9fd3ff", 2 * TILE + 8, TILE + 2, 2, t);
}

// ---------- 冠宇 ----------

const PAL: Record<string, string> = {
  h: "#1b1b22",
  s: "#f1c7a0",
  g: "#2a2a35",
  w: "#cfe6ff",
  t: "#6d6f78",
  u: "#55575f",
  p: "#2c3248",
  b: "#15151a",
};

const HEAD_DOWN = [
  "...hhhhhh...",
  "..hhhhhhhh..",
  ".hhhhhhhhhh.",
  ".hhsshhsshh.",
  ".hssssssssh.",
  ".sggggggggs.",
  ".sgwgssgwgs.",
  ".ssssssssss.",
  "..ssssssss..",
];
const HEAD_UP = [
  "...hhhhhh...",
  "..hhhhhhhh..",
  ".hhhhhhhhhh.",
  ".hhhhhhhhhh.",
  ".hhhhhhhhhh.",
  ".hhhhhhhhhh.",
  ".shhhhhhhhs.",
  "..hhhhhhhh..",
  "....ssss....",
];
const HEAD_LEFT = [
  "...hhhhhh...",
  "..hhhhhhhh..",
  ".hhhhhhhhhh.",
  ".hhhhhhhhhh.",
  ".sshhhhhhhh.",
  ".gggshhhhhh.",
  ".wgsssshhhh.",
  ".ssssssshhh.",
  "..ssssssss..",
];
const BODY_FRONT = ["..tttttttt..", ".tttttttttt.", "stttttttttts", "s.uttttttu.s", "..pppppppp.."];
const BODY_SIDE = ["..tttttttt..", "..ttttttttt.", "..tttsstttt.", "..uttttttu..", "..pppppppp.."];
const LEGS: readonly (readonly string[])[] = [
  ["..ppp..ppp..", "..bbb..bbb.."],
  ["..ppp...pp..", "..bbb...bb.."],
  ["..pp...ppp..", "..bb...bbb.."],
];

const mirror = (rows: readonly string[]) => rows.map((r) => r.split("").reverse().join(""));

/**
 * 冠宇，(px, py) 是他站的那一格左上角；頭會超出上面一格，像老派 RPG。
 * frame 0 是站著，1、2 是走路的左右腳。
 */
export function drawPlayer(ctx: Ctx, px: number, py: number, dir: Dir, frame: number) {
  const x = Math.round(px) + 2;
  const y = Math.round(py) - 4;
  // 影子
  ctx.save();
  ctx.globalAlpha = 0.25;
  rect(ctx, "#000000", x + 1, y + 17, 10, 3);
  ctx.restore();
  const head = dir === "down" ? HEAD_DOWN : dir === "up" ? HEAD_UP : dir === "left" ? HEAD_LEFT : mirror(HEAD_LEFT);
  const body = dir === "down" || dir === "up" ? BODY_FRONT : dir === "left" ? BODY_SIDE : mirror(BODY_SIDE);
  const legs = LEGS[frame % LEGS.length];
  const bob = frame === 0 ? 0 : 1;
  sprite(ctx, head, PAL, x, y + bob);
  sprite(ctx, body, PAL, x, y + 9 + bob);
  sprite(ctx, legs, PAL, x, y + 14);
}
