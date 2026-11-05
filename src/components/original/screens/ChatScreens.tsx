"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { RunState } from "@/lib/left-on-read/game";
import { generateGirl, type Girl } from "@/lib/left-on-read/girl";
import { STORIES, STORY_BY_ID } from "@/lib/left-on-read/stories/index";
import { chatTranscript, isChatReady, isFinal, renderLine, type TranscriptLine } from "@/lib/left-on-read/story";
import type { Chat } from "@/lib/left-on-read/storyTypes";
import PixelCanvas from "../PixelCanvas";
import { rect, type Ctx } from "../pixel/draw";
import { PHOTO_H, PHOTO_W, drawGirl, drawGirlAvatar } from "../pixel/girlSprite";
import { COLOR, DialogBox, PixelButton, TOP_BAR_CLASS, Typewriter } from "../ui";

/** 頭像：把整張照片畫到暫存 canvas，再裁出臉 */
export function GirlAvatar({ girl, size = 44 }: { girl: Girl; size?: number }) {
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
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {run.chats.map((chat) => {
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

function Transcript({ lines }: { lines: readonly TranscriptLine[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [lines.length]);

  return (
    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-[#191933] px-3 py-3 text-[15px] leading-snug">
      {lines.map((line, i) => {
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
            <p key={i} className="px-2 text-center text-sm font-normal leading-relaxed text-[#c8cae0]">
              {line.text}
            </p>
          );
        }
        const mine = line.who === "me";
        return (
          <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <p
              className={`max-w-[80%] border-2 border-black px-2.5 py-1.5 shadow-[2px_2px_0_#000] ${
                mine ? "bg-[#ffb3c4] text-[#2a1a22]" : "bg-[#f4efe0] text-[#20203c]"
              }`}
            >
              {line.text}
            </p>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

interface ChatRoomProps {
  run: RunState;
  chat: Chat;
  onReply: (choice: number) => void;
  onFinish: () => void;
  onBack: () => void;
}

export function ChatRoom({ run, chat, onReply, onFinish, onBack }: ChatRoomProps) {
  const girl = useMemo(() => generateGirl(chat.girlSeed), [chat.girlSeed]);
  const story = STORY_BY_ID[chat.storyId];
  const step = story.steps[chat.stepIndex];
  const ready = isChatReady(chat, run.dayIndex);
  const lines = chatTranscript(chat, girl, run.dayIndex);

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
      <Transcript lines={lines} />
      <div className="flex max-h-[52%] shrink-0 flex-col gap-2 overflow-y-auto border-t-[3px] border-black bg-[#20203c] px-3 py-3">
        {!ready ? (
          <>
            <p className="text-center text-sm text-[#a9abc9]">已送出。今天她不會再回了。</p>
            <PixelButton onClick={onBack}>回列表</PixelButton>
          </>
        ) : isFinal(step) ? (
          <PixelButton color={COLOR.red} silent onClick={onFinish}>
            ……就這樣了
          </PixelButton>
        ) : (
          step.replies.map((reply, choice) => (
            <PixelButton
              key={reply}
              color="#f4efe0"
              textColor="#20203c"
              align="left"
              silent
              className="text-sm"
              disabled={step.decision?.choice === choice && run.money < step.decision.cost}
              sub={step.decision?.choice === choice && run.money < step.decision.cost ? "錢不夠" : undefined}
              onClick={() => onReply(choice)}
            >
              {renderLine(reply, girl)}
            </PixelButton>
          ))
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
  return (
    <div className="flex h-full flex-col">
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
          <Typewriter key={ending.narration} text={ending.narration} cps={20} />
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
        <PixelButton color={COLOR.blue} onClick={onClose}>
          收起手機
        </PixelButton>
      </div>
    </div>
  );
}
