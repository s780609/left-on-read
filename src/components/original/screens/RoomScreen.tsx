"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import type { RunState } from "@/lib/left-on-read/game";
import {
  facingObject,
  roomMenu,
  stepRoom,
  type Dir,
  type RoomActionId,
  type RoomDialog,
  type RoomObjectId,
  type RoomOption,
  type RoomPos,
} from "@/lib/left-on-read/room";
import { readyChats, visibleChats } from "@/lib/left-on-read/story";
import PixelCanvas from "../PixelCanvas";
import { ROOM_H, ROOM_W, TILE, drawNightShade, drawPlayer, drawRoom } from "../pixel/room";
import { COLOR, DialogBox, PixelButton, StatusBar, Typewriter } from "../ui";

const NO_OPTIONS: readonly RoomOption[] = [];

/** 走一格要幾毫秒 */
const STEP_MS = 170;
const SLEEP_MS = 1200;

const TONE: Record<RoomOption["tone"], string> = {
  pink: COLOR.pink,
  blue: COLOR.blue,
  green: COLOR.green,
  gray: COLOR.gray,
};

const KEY_DIR: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  W: "up",
  S: "down",
  A: "left",
  D: "right",
};

/** 房間外的人要冠宇先處理的事：例如颱風假的事件，選完才能走動 */
export interface RoomEvent {
  text: string;
  choices: readonly { label: string; disabled?: boolean; sub?: string }[];
  onChoose: (index: number) => void;
}

interface RoomScreenProps {
  run: RunState;
  /** 冠宇的位置放在外面，開手機、滑完卡回來還站在原地 */
  pos: RoomPos;
  onPos: (pos: RoomPos) => void;
  /** 一進房間要先說的話；看完呼叫 onIntroDone */
  intro: readonly string[] | null;
  onIntroDone: () => void;
  /** 做完一件事之後的一句（事件結果等），換一句就再顯示一次 */
  notice: string | null;
  event: RoomEvent | null;
  onAction: (id: Exclude<RoomActionId, "close">) => void;
  onMenu: () => void;
}

interface Walk {
  from: RoomPos;
  to: RoomPos;
  start: number;
}

/** 俯視的房間：方向鍵或畫面上的十字鍵走路，面向東西按 A 調查 */
export function RoomScreen({ run, pos, onPos, intro, onIntroDone, notice, event, onAction, onMenu }: RoomScreenProps) {
  const night = run.phase === "night" || run.phase === "nightDone";
  const unread = readyChats(visibleChats(run.chats, run.dayIndex), run.dayIndex, run.phase).length > 0;

  /** 目前的對話框；line 是看到第幾句 */
  const [dialog, setDialog] = useState<{ d: RoomDialog; line: number; intro?: boolean } | null>(() =>
    intro && intro.length > 0 ? { d: { lines: intro, options: [] }, line: 0, intro: true } : null
  );
  const [selected, setSelected] = useState(0);
  const [sleeping, setSleeping] = useState(false);
  const [noticeSeen, setNoticeSeen] = useState<string | null>(null);

  // 換一句 notice 就跳出來（不在 effect 裡 setState：渲染時比對上一句）
  if (notice && notice !== noticeSeen && !dialog) {
    setNoticeSeen(notice);
    setDialog({ d: { lines: [notice], options: [] }, line: 0 });
  }

  const posRef = useRef(pos);
  const walkRef = useRef<Walk | null>(null);
  const heldRef = useRef<Dir | null>(null);
  /** 輕點一下也要走一步：按下時記住，下一格一定走 */
  const tapRef = useRef<Dir | null>(null);
  const blockedRef = useRef(false);
  const stateRef = useRef({ night, unread });
  const bumpRef = useRef<(id: RoomObjectId) => void>(() => {});
  const onPosRef = useRef(onPos);

  const blocked = dialog !== null || event !== null || sleeping;
  useEffect(() => {
    blockedRef.current = blocked;
    stateRef.current = { night, unread };
    onPosRef.current = onPos;
  });

  const openMenu = useCallback(
    (id: RoomObjectId) => {
      audioManager.pop();
      setSelected(0);
      setDialog({ d: roomMenu(run, id), line: 0 });
    },
    [run]
  );
  useEffect(() => {
    bumpRef.current = (id) => {
      // 撞到門就是要出門；其他東西要面向它按 A
      if (id === "door") openMenu(id);
    };
  }, [openMenu]);

  const draw = useCallback((ctx: CanvasRenderingContext2D, t: number) => {
    const walk = walkRef.current;
    let cur = posRef.current;
    let px = cur.x * TILE;
    let py = cur.y * TILE;
    let frame = 0;
    if (walk) {
      const k = Math.min(1, (t - walk.start) / STEP_MS);
      px = (walk.from.x + (walk.to.x - walk.from.x) * k) * TILE;
      py = (walk.from.y + (walk.to.y - walk.from.y) * k) * TILE;
      frame = k < 0.5 ? 1 + ((walk.to.x + walk.to.y) % 2) : 0;
      if (k >= 1) {
        walkRef.current = null;
        posRef.current = walk.to;
        cur = walk.to;
        onPosRef.current(walk.to);
      }
    }
    if (!walkRef.current && !blockedRef.current) {
      const dir = tapRef.current ?? heldRef.current;
      tapRef.current = null;
      if (dir) {
        const r = stepRoom(cur, dir);
        if (r.moved) {
          walkRef.current = { from: cur, to: r.pos, start: t };
        } else {
          posRef.current = r.pos;
          if (r.pos.dir !== cur.dir) onPosRef.current(r.pos);
          if (r.bumped) {
            heldRef.current = null;
            const id = r.bumped;
            setTimeout(() => bumpRef.current(id), 0);
          }
        }
        cur = posRef.current;
      }
    }
    const { night: n, unread: u } = stateRef.current;
    drawRoom(ctx, { night: n, unread: u, t });
    drawPlayer(ctx, px, py, walkRef.current?.to.dir ?? cur.dir, frame);
    if (n) drawNightShade(ctx, t);
  }, []);

  const press = useCallback((dir: Dir) => {
    tapRef.current = dir;
    heldRef.current = dir;
  }, []);
  const release = useCallback((dir?: Dir) => {
    if (!dir || heldRef.current === dir) heldRef.current = null;
  }, []);

  const options = useMemo(
    () => (dialog && dialog.line >= dialog.d.lines.length - 1 ? dialog.d.options : NO_OPTIONS),
    [dialog]
  );

  const choose = useCallback(
    (option: RoomOption) => {
      if (option.disabled) return;
      setDialog(null);
      if (option.id === "close") return;
      if (option.id === "sleep") {
        audioManager.pop();
        setSleeping(true);
        setTimeout(() => onAction("sleep"), SLEEP_MS);
        return;
      }
      onAction(option.id);
    },
    [onAction]
  );

  /** A：對話框開著就往下／確認，關著就調查面前的東西 */
  const pressA = useCallback(() => {
    if (sleeping || event) return;
    if (dialog) {
      if (dialog.line < dialog.d.lines.length - 1) {
        setDialog({ ...dialog, line: dialog.line + 1 });
        return;
      }
      if (options.length > 0) {
        const option = options[Math.min(selected, options.length - 1)];
        if (option) choose(option);
        return;
      }
      if (dialog.intro) onIntroDone();
      setDialog(null);
      return;
    }
    if (walkRef.current) return;
    const id = facingObject(posRef.current);
    if (id) openMenu(id);
  }, [sleeping, event, dialog, options, selected, choose, onIntroDone, openMenu]);

  const pressB = useCallback(() => {
    if (!dialog || sleeping) return;
    if (dialog.intro) onIntroDone();
    setDialog(null);
  }, [dialog, sleeping, onIntroDone]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const dir = KEY_DIR[e.key];
      if (dir) {
        e.preventDefault();
        if (dialog && options.length > 0) {
          if (!e.repeat && (dir === "up" || dir === "down")) {
            const n = options.length;
            setSelected((s) => (s + (dir === "down" ? 1 : n - 1)) % n);
          }
          return;
        }
        if (!e.repeat) press(dir);
        else heldRef.current = dir;
        return;
      }
      if (e.repeat) return;
      if (e.key === "Enter" || e.key === " " || e.key === "z" || e.key === "Z") {
        e.preventDefault();
        pressA();
      } else if (e.key === "Escape" || e.key === "x" || e.key === "X") {
        pressB();
      }
    };
    const up = (e: KeyboardEvent) => {
      const dir = KEY_DIR[e.key];
      if (dir) release(dir);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [dialog, options, press, release, pressA, pressB]);

  const line = dialog ? dialog.d.lines[dialog.line] : null;
  const hint = night ? "走到手機、電腦或床旁邊，面向它按 A" : "走到門口出門；面向東西按 A 看看";

  return (
    <>
      <StatusBar run={run} onMenu={onMenu} />
      <div className="relative shrink-0 border-b-[3px] border-black bg-black">
        <PixelCanvas
          width={ROOM_W}
          height={ROOM_H}
          draw={draw}
          animate
          frameMs={0}
          label={night ? "深夜的租屋處" : "早上的租屋處"}
          className="block h-auto w-full"
        />
        {sleeping ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black" style={{ animation: "lor-appear 900ms ease-out both" }}>
            <span className="text-lg text-[#c8cae0]">晚安</span>
          </div>
        ) : null}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-3">
        {event ? (
          <>
            <DialogBox>
              <Typewriter key={event.text} text={event.text} />
            </DialogBox>
            {event.choices.map((c, i) => (
              <PixelButton key={c.label} color={i === 0 ? COLOR.pink : COLOR.gray} disabled={c.disabled} sub={c.sub} onClick={() => event.onChoose(i)}>
                {c.label}
              </PixelButton>
            ))}
          </>
        ) : line !== null ? (
          <>
            <DialogBox>
              <button type="button" className="block w-full cursor-pointer text-left" onClick={options.length > 0 ? undefined : pressA}>
                <Typewriter key={`${dialog?.line}:${line}`} text={line} />
                {options.length === 0 ? <span className="mt-1 block text-right text-xs text-[#a9abc9]">▼</span> : null}
              </button>
            </DialogBox>
            {options.map((o, i) => (
              <PixelButton
                key={o.id}
                color={TONE[o.tone]}
                disabled={o.disabled}
                sub={o.sub}
                silent={o.id === "sleep"}
                className={i === selected ? "outline outline-2 outline-offset-2 outline-[#f6f1de]" : ""}
                onClick={() => choose(o)}
              >
                {o.label}
              </PixelButton>
            ))}
          </>
        ) : (
          <p className="px-1 text-center text-sm text-[#a9abc9]">{sleeping ? "" : hint}</p>
        )}
      </div>
      <Pad onPress={press} onRelease={release} onA={pressA} onB={pressB} />
    </>
  );
}

/** 畫面下方的十字鍵和 A、B */
function Pad({
  onPress,
  onRelease,
  onA,
  onB,
}: {
  onPress: (d: Dir) => void;
  onRelease: (d?: Dir) => void;
  onA: () => void;
  onB: () => void;
}) {
  const arrow = (dir: Dir, label: ReactNode, cls: string) => (
    <button
      type="button"
      aria-label={{ up: "上", down: "下", left: "左", right: "右" }[dir]}
      className={`absolute flex h-11 w-11 touch-none select-none items-center justify-center border-[3px] border-black bg-[#3a3a5e] text-[#c8cae0] active:bg-[#55587a] ${cls}`}
      onPointerDown={(e) => {
        e.preventDefault();
        onPress(dir);
        // 手指滑出按鈕也繼續走；有些瀏覽器不給捕捉就算了
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* 沒關係 */
        }
      }}
      onPointerUp={() => onRelease(dir)}
      onPointerCancel={() => onRelease(dir)}
      onPointerLeave={() => onRelease(dir)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
  const round = (label: string, onClick: () => void, color: string) => (
    <button
      type="button"
      aria-label={label}
      className="flex h-14 w-14 touch-none select-none items-center justify-center rounded-full border-[3px] border-black text-lg text-white shadow-[2px_3px_0_#000] active:translate-y-0.5"
      style={{ backgroundColor: color }}
      onPointerDown={(e) => {
        e.preventDefault();
        onClick();
      }}
    >
      {label}
    </button>
  );
  return (
    <div className="flex shrink-0 items-center justify-between border-t-[3px] border-black bg-[#191933] px-5 py-3">
      <div className="relative h-[132px] w-[132px]">
        {arrow("up", "▲", "left-[44px] top-0")}
        {arrow("left", "◀", "left-0 top-[44px]")}
        {arrow("right", "▶", "left-[88px] top-[44px]")}
        {arrow("down", "▼", "left-[44px] top-[88px]")}
        <div className="absolute left-[44px] top-[44px] h-11 w-11 border-[3px] border-black bg-[#3a3a5e]" />
      </div>
      <div className="flex items-end gap-3">
        <div className="mb-2">{round("B", onB, COLOR.gray)}</div>
        <div className="mb-8">{round("A", onA, COLOR.pink)}</div>
      </div>
    </div>
  );
}
