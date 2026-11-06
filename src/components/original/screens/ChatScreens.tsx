"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import type { RunState } from "@/lib/left-on-read/game";
import { generateGirl, type Girl } from "@/lib/left-on-read/girl";
import { STORIES, STORY_BY_ID } from "@/lib/left-on-read/stories/index";
import {
  chatTranscript,
  isChatReady,
  isFinal,
  pendingDateStep,
  renderLine,
  visibleChats,
  type TranscriptLine,
} from "@/lib/left-on-read/story";
import type { Chat, ReplyStep } from "@/lib/left-on-read/storyTypes";
import PixelCanvas from "../PixelCanvas";
import { rect, type Ctx } from "../pixel/draw";
import { PHOTO_H, PHOTO_W, drawGirl, drawGirlAvatar } from "../pixel/girlSprite";
import { COLOR, DialogBox, PixelButton, TOP_BAR_CLASS, Typewriter, useAdvanceKeys } from "../ui";

/** 頭像：把整張照片畫到暫存 canvas，再裁出臉 */
export function GirlAvatar({ girl, size = 44 }: { girl: Girl; size?: number }) {
  const [photo] = girl.photos ?? [];
  const draw = useCallback(
    (ctx: Ctx) => {
      const source = document.createElement("canvas");
      source.width = PHOTO_W;
      source.height = PHOTO_H;
      const c = source.getContext("2d");
      if (!c) return;
      drawGirl(c, girl);
      drawGirlAvatar(ctx, girl, source);
      rect(ctx, "#00000055", 0, 39, 40, 1);
    },
    [girl]
  );
  if (photo) {
    // 離線也要能看，不走圖片最佳化；只取上半部當大頭
    return (
      <Image
        src={photo}
        alt={`${girl.nickname}的頭像`}
        width={size}
        height={size}
        unoptimized
        className="shrink-0 border-2 border-black object-cover object-top"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <PixelCanvas
      width={40}
      height={40}
      draw={draw}
      label={`${girl.nickname}的頭像`}
      className="shrink-0 border-2 border-black"
      style={{ width: size, height: size }}
    />
  );
}

const STATUS_TEXT = { read: "已讀", unread: "未讀", vanished: "對方已離開" } as const;

function lastLineText(line: TranscriptLine | undefined): string {
  if (!line) return "";
  if (line.who === "status") return `（${STATUS_TEXT[line.status]}）`;
  return line.text;
}

// ---------- 聊天列表 ----------

interface ChatListProps {
  run: RunState;
  onOpen: (chatId: number) => void;
  onClose: () => void;
}

export function ChatList({ run, onOpen, onClose }: ChatListProps) {
  return (
    <>
      <div className={TOP_BAR_CLASS}>
        <div className="min-w-0 flex-1 text-lg text-[#ff9fb4]">Swipy 訊息</div>
        {run.phase !== "daytime" ? <span className="shrink-0 text-xs text-[#a9abc9]">深夜</span> : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {visibleChats(run.chats, run.dayIndex).map((chat) => {
          const girl = generateGirl(chat.girlSeed);
          const ready = isChatReady(chat, run.dayIndex);
          const lines = chatTranscript(chat, girl, run.dayIndex);
          return (
            <button
              key={chat.id}
              type="button"
              onClick={() => onOpen(chat.id)}
              className="flex w-full cursor-pointer items-center gap-3 border-b-2 border-black px-3 py-2.5 text-left active:bg-[#2a2a4e]"
            >
              <GirlAvatar girl={girl} />
              <span className="min-w-0 flex-1">
                <span className="block truncate">
                  {girl.nickname}
                  <span className="ml-1 text-xs text-[#a9abc9]">{girl.age}</span>
                </span>
                <span className="block truncate text-sm font-normal text-[#a9abc9]">
                  {lastLineText(lines[lines.length - 1])}
                </span>
              </span>
              {ready ? (
                <span className="shrink-0 border-2 border-black bg-[#ff6f91] px-1.5 text-xs text-white">新</span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="shrink-0 border-t-[3px] border-black bg-[#191933] px-4 py-3">
        <PixelButton color={COLOR.blue} onClick={onClose}>
          收起手機
        </PixelButton>
      </div>
    </>
  );
}

// ---------- 聊天室 ----------

/** 她鋪陳的訊息一則一則來：第一則的等待和之後的間隔 */
const LEAD_FIRST_MS = 300;
const LEAD_GAP_MS = 1100;
/** 新訊息進來時，她的那句晚一點，才像是看完才回 */
const HER_REPLY_DELAY_MS = 450;

const newLineStyle = (delayMs: number) => ({ animation: `lor-appear 320ms ease-out ${delayMs}ms both` });

/** 聊天泡泡，結局裡的對話也用這個 */
export function ChatBubble({ mine, children, style }: { mine: boolean; children: ReactNode; style?: CSSProperties }) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`} style={style}>
      <div
        className={`max-w-[80%] border-2 border-black px-2.5 py-1.5 shadow-[2px_2px_0_#000] ${
          mine ? "bg-[#ffb3c4] text-[#2a1a22]" : "bg-[#f4efe0] text-[#20203c]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

interface TranscriptProps {
  lines: readonly TranscriptLine[];
  herDelayMs?: number;
  onTap?: () => void;
}

export function Transcript({ lines, herDelayMs = 0, onTap }: TranscriptProps) {
  // 一打開就有的訊息直接顯示，之後才進來的淡入
  const [initialCount] = useState(lines.length);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [lines.length]);

  return (
    <div onClick={onTap} className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-[#191933] px-3 py-3 text-[15px] leading-snug">
      {lines.map((line, i) => {
        const fresh = i >= initialCount;
        // 對話紀錄不會中途插入或刪除，用順序當 key
        if (line.who === "status") {
          return (
            <p key={i} className="text-center text-xs tracking-widest text-[#8d92b2]">
              ── {STATUS_TEXT[line.status]} ──
            </p>
          );
        }
        if (line.who === "narration") {
          return (
            <p
              key={i}
              className="px-2 text-center text-sm font-normal leading-relaxed text-[#c8cae0]"
              style={fresh ? newLineStyle(0) : undefined}
            >
              {line.text}
            </p>
          );
        }
        const mine = line.who === "me";
        return (
          <ChatBubble key={i} mine={mine} style={fresh ? newLineStyle(mine ? 0 : herDelayMs) : undefined}>
            {line.text}
          </ChatBubble>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

interface ChatRoomProps {
  run: RunState;
  chat: Chat;
  /** panelHeight：選項區當下的高度，接下來的畫面要從這個高度慢慢收，版面才不會跳 */
  onReply: (choice: number, panelHeight?: number) => void;
  onFinish: () => void;
  onBack: () => void;
}

export function ChatRoom({ run, chat, onReply, onFinish, onBack }: ChatRoomProps) {
  const girl = useMemo(() => generateGirl(chat.girlSeed), [chat.girlSeed]);
  const story = STORY_BY_ID[chat.storyId];
  const step = story.steps[chat.stepIndex];
  const ready = isChatReady(chat, run.dayIndex);
  const allLines = chatTranscript(chat, girl, run.dayIndex);
  const dateIsNext = pendingDateStep(chat) !== null;
  const panelRef = useRef<HTMLDivElement>(null);

  // 有鋪陳的那一步：她一則一則傳完才出現選項，選項先佔好位子，版面不會跳；按聊天區可以跳過
  const leadTotal = ready && !isFinal(step) && step.lead ? step.lead.length + 1 : 0;
  const revealKey = `${chat.id}:${chat.stepIndex}`;
  const [reveal, setReveal] = useState({ key: revealKey, shown: 0 });
  const shown = reveal.key === revealKey ? reveal.shown : 0;
  const revealing = shown < leadTotal;
  useEffect(() => {
    if (!revealing) return;
    const id = setTimeout(
      () => setReveal({ key: revealKey, shown: shown + 1 }),
      shown === 0 ? LEAD_FIRST_MS : LEAD_GAP_MS
    );
    return () => clearTimeout(id);
  }, [revealing, revealKey, shown]);
  const lines = revealing ? allLines.slice(0, allLines.length - (leadTotal - shown)) : allLines;

  return (
    <>
      <div className={TOP_BAR_CLASS}>
        <GirlAvatar girl={girl} size={36} />
        <div className="min-w-0 flex-1 truncate leading-tight">
          {girl.nickname}
          <span className="ml-1 text-xs text-[#a9abc9]">{girl.age}</span>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 cursor-pointer border-2 border-black bg-[#55587a] px-2 py-1 text-xs active:translate-y-[1px]"
        >
          列表
        </button>
      </div>
      <Transcript
        lines={lines}
        herDelayMs={HER_REPLY_DELAY_MS}
        onTap={revealing ? () => setReveal({ key: revealKey, shown: leadTotal }) : undefined}
      />
      <div
        ref={panelRef}
        className="relative flex max-h-[52%] shrink-0 flex-col gap-2 overflow-y-auto border-t-[3px] border-black bg-[#20203c] px-3 py-3"
      >
        {!ready ? (
          <>
            <p className="text-center text-sm text-[#a9abc9]">
              {dateIsNext
                ? "約好了。週末白天才能出門赴約。"
                : `已送出。${run.phase === "daytime" ? "今天" : "今晚"}她不會再回了。`}
            </p>
            <PixelButton onClick={onBack}>回列表</PixelButton>
          </>
        ) : isFinal(step) ? (
          <PixelButton color={COLOR.red} silent onClick={onFinish}>
            ……就這樣了
          </PixelButton>
        ) : (
          <>
            <div
              className="flex flex-col gap-2"
              style={revealing ? { visibility: "hidden" } : leadTotal > 0 ? newLineStyle(0) : undefined}
            >
              {step.replies.map((reply, choice) => (
                <PixelButton
                  key={reply}
                  color={step.fakeEnding ? COLOR.red : "#f4efe0"}
                  textColor={step.fakeEnding ? "#ffffff" : "#20203c"}
                  align={step.fakeEnding ? "center" : "left"}
                  silent
                  className={step.fakeEnding ? "" : "text-sm"}
                  disabled={step.decision?.choice === choice && run.money < step.decision.cost}
                  sub={step.decision?.choice === choice && run.money < step.decision.cost ? "錢不夠" : undefined}
                  onClick={() => onReply(choice, panelRef.current?.offsetHeight)}
                >
                  {renderLine(reply, girl)}
                </PixelButton>
              ))}
            </div>
            {revealing ? (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-[#a9abc9]">她正在輸入……</p>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}

// ---------- 結局 ----------

export interface EndingInfo {
  storyId: string;
  narration: string;
  paid: number;
  firstTime: boolean;
  antiFraud: boolean;
  girl: Girl;
  collected: number;
  total: number;
}

export function EndingScreen({ ending, onClose }: { ending: EndingInfo; onClose: () => void }) {
  const story = STORY_BY_ID[ending.storyId];
  // 字打完之前，按第一下只會把字打完，不會整段不見
  const [typed, setTyped] = useState(false);
  const finishTyping = useCallback(() => setTyped(true), []);
  const advance = () => (typed ? onClose() : setTyped(true));
  useAdvanceKeys(advance);
  return (
    <div className="flex h-full flex-col" onClick={finishTyping}>
      <div className={TOP_BAR_CLASS}>
        <GirlAvatar girl={ending.girl} size={36} />
        <div className="min-w-0 flex-1 truncate text-sm text-[#a9abc9]">{ending.girl.nickname}</div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="mb-5 flex justify-center">
          <div
            className="border-4 border-[#ff6f91] px-4 py-2 text-center text-xl text-[#ff6f91]"
            style={{ animation: "lor-stamp 360ms steps(6) both" }}
          >
            {story.dexName}
          </div>
        </div>
        <DialogBox>
          <Typewriter key={ending.narration} text={ending.narration} cps={20} instant={typed} onDone={finishTyping} />
        </DialogBox>
        {ending.antiFraud ? (
          <p className="mt-4 border-[3px] border-black bg-[#f2d675] px-3 py-2 text-sm leading-relaxed text-[#20203c] shadow-[3px_3px_0_#000]">
            老師帶單、拉群、保證獲利都是常見的投資詐騙話術。有疑慮請撥 165 反詐騙專線查證，不要匯款。
          </p>
        ) : null}
        {ending.paid > 0 ? (
          <p className="mt-4 text-center text-sm text-[#ff9a8f]">花掉 NT${ending.paid.toLocaleString("en-US")}</p>
        ) : null}
        <div className="mt-5 border-t-2 border-dashed border-[#55587a] pt-3 text-center">
          <p className="text-xs text-[#a9abc9]">
            {STORIES.includes(story)
              ? `${ending.firstTime ? "失敗圖鑑新增一筆" : "這一筆圖鑑上已經有了"}　${ending.collected} / ${ending.total}`
              : "隱藏路線"}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#d8d9ea]">{story.dexQuip}</p>
        </div>
      </div>
      <div className="shrink-0 border-t-[3px] border-black bg-[#191933] px-4 py-3">
        <PixelButton color={COLOR.blue} onClick={advance}>
          收起手機
        </PixelButton>
      </div>
    </div>
  );
}

// ---------- 假失敗之後：她主動回來 ----------

const CRACK_LEFT = "polygon(0 0, 54% 0, 44% 32%, 58% 52%, 42% 74%, 50% 100%, 0 100%)";
const CRACK_RIGHT = "polygon(54% 0, 100% 0, 100% 100%, 50% 100%, 42% 74%, 58% 52%, 44% 32%)";

/** 隔天早上：手機震動，昨天那個印章裂開，她傳訊息來了 */
export function ComebackScreen({ chat, onReply }: { chat: Chat; onReply: (choice: number) => void }) {
  const girl = useMemo(() => generateGirl(chat.girlSeed), [chat.girlSeed]);
  const step = STORY_BY_ID[chat.storyId].steps[chat.stepIndex] as ReplyStep;
  const stamp = step.comeback?.stamp ?? "";
  const stampClass = "border-4 border-[#ff6f91] px-4 py-2 text-center text-xl text-[#ff6f91]";
  const appear = (delayMs: number) => ({ animation: `lor-appear 320ms ease-out ${delayMs}ms both` });

  useEffect(() => {
    audioManager.chime();
  }, []);

  return (
    <div className="flex h-full flex-col" style={{ animation: "lor-shake 120ms linear 4" }}>
      <div className={TOP_BAR_CLASS}>
        <GirlAvatar girl={girl} size={36} />
        <div className="min-w-0 flex-1 truncate text-sm text-[#a9abc9]">{girl.nickname}</div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="mb-6 flex justify-center">
          <div className="relative -rotate-[8deg]" aria-label={`${stamp}的印章裂開了`}>
            <div className={`${stampClass} invisible`}>{stamp}</div>
            <div
              className={`${stampClass} absolute inset-0`}
              style={{ clipPath: CRACK_LEFT, animation: "lor-crack-left 420ms steps(5) 700ms both" }}
            >
              {stamp}
            </div>
            <div
              className={`${stampClass} absolute inset-0`}
              style={{ clipPath: CRACK_RIGHT, animation: "lor-crack-right 420ms steps(5) 700ms both" }}
            >
              {stamp}
            </div>
          </div>
        </div>
        {"text" in step.incoming ? (
          <p
            className="mb-4 max-w-[85%] border-2 border-black bg-[#f4efe0] px-2.5 py-1.5 text-[15px] leading-snug text-[#20203c] shadow-[2px_2px_0_#000]"
            style={appear(1100)}
          >
            {step.incoming.text}
          </p>
        ) : null}
        <div style={appear(1700)}>
          <DialogBox>{step.comeback?.aside}</DialogBox>
        </div>
      </div>
      <div
        className="flex shrink-0 flex-col gap-2 border-t-[3px] border-black bg-[#20203c] px-3 py-3"
        style={appear(2200)}
      >
        {step.replies.map((reply, choice) => (
          <PixelButton
            key={reply}
            color="#f4efe0"
            textColor="#20203c"
            align="left"
            silent
            className="text-sm"
            onClick={() => onReply(choice)}
          >
            {reply}
          </PixelButton>
        ))}
      </div>
    </div>
  );
}
