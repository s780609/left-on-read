"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import type { RunState } from "@/lib/left-on-read/game";
import {
  adjacentAutoObject,
  facingObject,
  planTap,
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
const STEP_MS = 150;
const SLEEP_MS = 1200;
/** 點下去的那一格閃多久 */
const MARK_MS = 600;

const TONE: Record<RoomOption["tone"], string> = {
  pink: COLOR.pink,
  blue: COLOR.blue,
  green: COLOR.green,
  gray: COLOR.gray,
};

/** 電腦上也能用方向鍵走、Enter 調查 */
const KEY_DIR: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
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

const dirBetween = (a: RoomPos, b: RoomPos): Dir =>
  b.x > a.x ? "right" : b.x < a.x ? "left" : b.y > a.y ? "down" : "up";

/** 俯視的房間：點哪走到哪；走到手機、電腦、床、門旁邊就自己跳出選項 */
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

  // 換一句 notice 就跳出來（渲染時比對上一句，不在 effect 裡 setState）
  if (notice && notice !== noticeSeen && !dialog) {
    setNoticeSeen(notice);
    setDialog({ d: { lines: [notice], options: [] }, line: 0 });
  }

  const canvasBoxRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(pos);
  const walkRef = useRef<Walk | null>(null);
  /** 點了之後還沒走完的格子 */
  const pathRef = useRef<RoomPos[]>([]);
  /** 走完要看的東西；null 就是走到之後看看旁邊有沒有會自己跳出來的 */
  const targetRef = useRef<{ object: RoomObjectId | null; face: Dir | null } | null>(null);
  const markRef = useRef<{ x: number; y: number; at: number } | null>(null);
  const clockRef = useRef(0);
  const blockedRef = useRef(false);
  const stateRef = useRef({ night, unread });
  const arriveRef = useRef<(id: RoomObjectId) => void>(() => {});
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
    arriveRef.current = openMenu;
  }, [openMenu]);

  const draw = useCallback((ctx: CanvasRenderingContext2D, t: number) => {
    clockRef.current = t;
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
        // 走完最後一格：面向要看的東西，跳出選項
        if (pathRef.current.length === 0 && targetRef.current) {
          const target = targetRef.current;
          targetRef.current = null;
          const auto = target.object ? null : adjacentAutoObject(cur);
          const object = target.object ?? auto?.object ?? null;
          const face = target.face ?? auto?.dir ?? null;
          if (face && face !== cur.dir) {
            posRef.current = { ...cur, dir: face };
            cur = posRef.current;
            onPosRef.current(cur);
          }
          if (object) setTimeout(() => arriveRef.current(object), 0);
        }
      }
    }
    if (!walkRef.current && !blockedRef.current && pathRef.current.length > 0) {
      const next = pathRef.current.shift()!;
      walkRef.current = { from: cur, to: { ...next, dir: dirBetween(cur, next) }, start: t };
    }
    const { night: n, unread: u } = stateRef.current;
    drawRoom(ctx, { night: n, unread: u, t });
    // 點下去的那一格閃一下
    const mark = markRef.current;
    if (mark && t - mark.at < MARK_MS) {
      ctx.save();
      ctx.globalAlpha = 0.55 * (1 - (t - mark.at) / MARK_MS);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.strokeRect(mark.x * TILE + 1.5, mark.y * TILE + 1.5, TILE - 3, TILE - 3);
      ctx.restore();
    }
    drawPlayer(ctx, px, py, walkRef.current?.to.dir ?? cur.dir, frame);
    if (n) drawNightShade(ctx, t);
  }, []);

  /** 從現在（或正在走的那一格）出發，走到點的地方 */
  const goTo = useCallback((x: number, y: number) => {
    const from = walkRef.current?.to ?? posRef.current;
    const plan = planTap(from, x, y);
    if (!plan) return;
    markRef.current = { x, y, at: clockRef.current };
    pathRef.current = plan.path;
    targetRef.current = { object: plan.object, face: plan.face };
    // 已經站在旁邊：不用走，直接面向它
    if (plan.path.length === 0 && !walkRef.current) {
      const cur = posRef.current;
      targetRef.current = null;
      const auto = plan.object ? null : adjacentAutoObject(cur);
      const object = plan.object ?? auto?.object ?? null;
      const face = plan.face ?? auto?.dir ?? null;
      if (face) {
        posRef.current = { ...cur, dir: face };
        onPosRef.current(posRef.current);
      }
      if (object) openMenu(object);
    }
  }, [openMenu]);

  const options = useMemo(
    () => (dialog && dialog.line >= dialog.d.lines.length - 1 ? dialog.d.options : NO_OPTIONS),
    [dialog]
  );

  const closeDialog = useCallback(() => {
    if (!dialog || sleeping) return;
    if (dialog.intro) onIntroDone();
    setDialog(null);
  }, [dialog, sleeping, onIntroDone]);

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

  /** 點對話框：下一句，沒有下一句也沒有選項就關掉 */
  const advanceDialog = useCallback(() => {
    if (!dialog || sleeping) return;
    if (dialog.line < dialog.d.lines.length - 1) {
      setDialog({ ...dialog, line: dialog.line + 1 });
      return;
    }
    if (options.length === 0) closeDialog();
  }, [dialog, sleeping, options, closeDialog]);

  /** 點房間：對話框開著就先關掉；不然走過去 */
  const onTapRoom = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (sleeping || event) return;
    if (dialog) {
      if (dialog.line < dialog.d.lines.length - 1 || options.length === 0) advanceDialog();
      else closeDialog();
      return;
    }
    const box = canvasBoxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    // 畫布等比縮放、靠上置中
    const scale = Math.min(rect.width / ROOM_W, rect.height / ROOM_H);
    const offX = (rect.width - ROOM_W * scale) / 2;
    const x = Math.floor((e.clientX - rect.left - offX) / (scale * TILE));
    const y = Math.floor((e.clientY - rect.top) / (scale * TILE));
    goTo(x, y);
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const dir = KEY_DIR[e.key];
      if (dir) {
        e.preventDefault();
        if (dialog && options.length > 0) {
          if (dir === "up" || dir === "down") {
            const n = options.length;
            setSelected((s) => (s + (dir === "down" ? 1 : n - 1)) % n);
          }
          return;
        }
        if (dialog || event || sleeping || walkRef.current) return;
        const r = stepRoom(posRef.current, dir);
        if (r.moved) {
          pathRef.current = [r.pos];
          targetRef.current = null;
        } else {
          posRef.current = r.pos;
          onPosRef.current(r.pos);
          if (r.bumped === "door") openMenu("door");
        }
        return;
      }
      if (e.repeat) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (dialog) {
          if (options.length > 0) choose(options[Math.min(selected, options.length - 1)]);
          else advanceDialog();
        } else if (!event && !sleeping) {
          const id = facingObject(posRef.current);
          if (id) openMenu(id);
        }
      } else if (e.key === "Escape") {
        closeDialog();
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [dialog, options, selected, event, sleeping, choose, advanceDialog, closeDialog, openMenu]);

  const line = dialog ? dialog.d.lines[dialog.line] : null;
  const hint = night ? "點哪走到哪。走到手機、電腦或床旁邊看看" : "點哪走到哪。走到門口出門";

  return (
    <>
      <StatusBar run={run} onMenu={onMenu} />
      <div className="relative min-h-0 flex-1 touch-none select-none overflow-hidden bg-[#191933]" onPointerDown={onTapRoom}>
        <div ref={canvasBoxRef} className="absolute inset-0">
          <PixelCanvas
            width={ROOM_W}
            height={ROOM_H}
            draw={draw}
            animate
            frameMs={0}
            label={night ? "深夜的租屋處" : "早上的租屋處"}
            className="block h-full w-full"
            style={{ objectFit: "contain", objectPosition: "center top" }}
          />
        </div>
        {sleeping ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black" style={{ animation: "lor-appear 900ms ease-out both" }}>
            <span className="text-lg text-[#c8cae0]">晚安</span>
          </div>
        ) : null}
        {event || line !== null ? (
          // 對話框蓋在畫面下方；點這裡不會讓冠宇走路
          <div
            className="absolute inset-x-0 bottom-0 flex max-h-[62%] flex-col gap-2 overflow-y-auto px-3 pb-3 pt-2"
            onPointerDown={(e) => e.stopPropagation()}
          >
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
            ) : (
              <>
                <DialogBox>
                  <button type="button" className="block w-full cursor-pointer text-left" onClick={advanceDialog}>
                    <Typewriter key={`${dialog?.line}:${line}`} text={line ?? ""} />
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
            )}
          </div>
        ) : !sleeping ? (
          <p className="pointer-events-none absolute inset-x-0 bottom-3 px-4 text-center text-sm text-[#a9abc9]">{hint}</p>
        ) : null}
      </div>
    </>
  );
}
