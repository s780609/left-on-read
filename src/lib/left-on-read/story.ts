/**
 * 聊天的規則：開場白、抽劇情的權重、等待與 ready、對話紀錄、劇情資料驗證。
 */

import { calendarOf } from "./calendar.ts";
import type { Dex } from "./dex.ts";
import type { Girl } from "./girl.ts";
import { INTERESTS } from "./girlData.ts";
import { weightedPick } from "./rng.ts";
import type { Rng } from "./rng.ts";
import { STORIES, STORY_BY_ID } from "./stories/index.ts";
import type {
  Chat,
  FinalStep,
  Incoming,
  OpenerKind,
  ReplyStep,
  StepWait,
  Story,
  StoryCategory,
} from "./storyTypes.ts";

/** 沒收集過的劇情比較容易抽到，圖鑑才集得滿 */
export const UNCOLLECTED_MULT = 8;

const GENERIC_MULT: Record<StoryCategory, number> = { ghost: 3, fade: 1, pitch: 1, quick: 1 };
const INTEREST_MULT: Record<StoryCategory, number> = { ghost: 0.5, fade: 3, pitch: 1, quick: 1 };

const GENERIC_OPENERS: readonly { kind: OpenerKind; text: string }[] = [
  { kind: "hi", text: "嗨，很高興認識妳" },
  { kind: "whatsup", text: "妳平常都在幹嘛？" },
  { kind: "eaten", text: "吃飯了嗎" },
];

const DEFAULT_WAIT: StepWait = { days: 1 };
const PLACEHOLDER = /\{([^{}]*)\}/g;
const KNOWN_PLACEHOLDERS = new Set(["name", "interest"]);

export type TranscriptLine =
  | { who: "me"; text: string }
  | { who: "her"; text: string }
  | { who: "narration"; text: string }
  | { who: "status"; status: "read" | "unread" | "vanished" };

export function isFinal(step: ReplyStep | FinalStep): step is FinalStep {
  return "ending" in step;
}

function interestOf(girl: Girl) {
  return INTERESTS.find((i) => i.id === girl.interest);
}

export function renderLine(text: string, girl: Girl): string {
  return text
    .replaceAll("{name}", girl.nickname)
    .replaceAll("{interest}", interestOf(girl)?.label ?? "");
}

export function openerOptions(girl: Girl): { kind: OpenerKind; text: string }[] {
  return [
    ...GENERIC_OPENERS.map((o) => ({ ...o })),
    { kind: "interest", text: renderLine(interestOf(girl)?.openerLine ?? "", girl) },
  ];
}

export function storyWeights(
  opener: OpenerKind,
  dex: Dex,
  activeStoryIds: readonly string[]
): { item: Story; weight: number }[] {
  const table = opener === "interest" ? INTEREST_MULT : GENERIC_MULT;
  const active = new Set(activeStoryIds);
  // 全部被占用時才解除，一定抽得到東西
  const allOccupied = STORIES.every((s) => active.has(s.id));
  return STORIES.map((item) => {
    if (!allOccupied && active.has(item.id)) return { item, weight: 0 };
    const collected = Object.hasOwn(dex, item.id);
    return { item, weight: table[item.category] * (collected ? 1 : UNCOLLECTED_MULT) };
  });
}

export function pickStory(
  opener: OpenerKind,
  dex: Dex,
  activeStoryIds: readonly string[],
  rng: Rng
): Story {
  return weightedPick(rng, storyWeights(opener, dex, activeStoryIds));
}

export function firstReadyDay(lastAdvancedDay: number, wait: StepWait = DEFAULT_WAIT): number {
  if ("days" in wait) return lastAdvancedDay + wait.days;
  // 等星期時當天不算，一定是之後的那一天
  const delta = (wait.weekday - calendarOf(lastAdvancedDay).weekday + 7) % 7;
  return lastAdvancedDay + (delta === 0 ? 7 : delta);
}

export function isChatReady(chat: Chat, dayIndex: number): boolean {
  const step = STORY_BY_ID[chat.storyId]?.steps[chat.stepIndex];
  return step !== undefined && dayIndex >= firstReadyDay(chat.lastAdvancedDay, step.wait);
}

export function readyChats(chats: readonly Chat[], dayIndex: number): Chat[] {
  return chats.filter((chat) => isChatReady(chat, dayIndex));
}

function incomingLine(incoming: Incoming, girl: Girl): TranscriptLine {
  switch (incoming.kind) {
    case "message":
      return { who: "her", text: renderLine(incoming.text, girl) };
    case "narration":
      return { who: "narration", text: renderLine(incoming.text, girl) };
    default:
      return { who: "status", status: incoming.kind };
  }
}

/** 開場白，再來每步「她的內容、冠宇選的回覆」；目前這一步要 ready 才顯示 */
export function chatTranscript(chat: Chat, girl: Girl, dayIndex: number): TranscriptLine[] {
  const story = STORY_BY_ID[chat.storyId];
  const opener = openerOptions(girl).find((o) => o.kind === chat.opener);
  const lines: TranscriptLine[] = opener ? [{ who: "me", text: opener.text }] : [];
  for (let i = 0; i < chat.stepIndex; i++) {
    const step = story.steps[i] as ReplyStep;
    lines.push(incomingLine(step.incoming, girl));
    lines.push({ who: "me", text: renderLine(step.replies[chat.replies[i]], girl) });
  }
  if (isChatReady(chat, dayIndex)) {
    lines.push(incomingLine(story.steps[chat.stepIndex].incoming, girl));
  }
  return lines;
}

function placeholderErrors(text: unknown, where: string): string[] {
  if (typeof text !== "string" || text.trim().length === 0) return [`${where} 沒有文字`];
  const errors: string[] = [];
  for (const m of text.matchAll(PLACEHOLDER)) {
    if (!KNOWN_PLACEHOLDERS.has(m[1])) errors.push(`${where} 有未知佔位符 {${m[1]}}`);
  }
  if (/[{}]/.test(text.replace(PLACEHOLDER, ""))) errors.push(`${where} 的大括號不成對`);
  return errors;
}

function waitErrors(wait: StepWait | undefined, where: string): string[] {
  if (wait === undefined) return [];
  if ("days" in wait) {
    return Number.isInteger(wait.days) && wait.days >= 1 ? [] : [`${where} 的等待天數不合法`];
  }
  return Number.isInteger(wait.weekday) && wait.weekday >= 0 && wait.weekday <= 6
    ? []
    : [`${where} 的星期不合法`];
}

/** 回傳錯誤訊息，空陣列代表沒問題 */
export function validateStory(story: Story): string[] {
  const errors: string[] = [];
  if (story.steps.length === 0) errors.push(`${story.id} 沒有步驟`);
  story.steps.forEach((step, i) => {
    const where = `${story.id} 第 ${i} 步`;
    const last = i === story.steps.length - 1;
    const hasReplies = "replies" in step;
    if ("text" in step.incoming) errors.push(...placeholderErrors(step.incoming.text, `${where} 的內容`));
    errors.push(...waitErrors(step.wait, where));
    if (isFinal(step)) {
      if (!last) errors.push(`${where} 不是最後一步卻有結局`);
      if (hasReplies) errors.push(`${where} 同時有結局和回覆`);
      errors.push(...placeholderErrors(step.ending.narration, `${where} 的結局`));
      const { cost } = step.ending;
      if (cost !== undefined && (!Number.isInteger(cost) || cost < 0)) errors.push(`${where} 的花費不合法`);
    } else {
      if (last) errors.push(`${where} 是最後一步卻沒有結局`);
      if (!hasReplies || step.replies.length < 2 || step.replies.length > 3) {
        errors.push(`${where} 的回覆要 2～3 句`);
      } else {
        step.replies.forEach((reply, r) => errors.push(...placeholderErrors(reply, `${where} 回覆 ${r}`)));
        if (step.decision && !step.replies[step.decision.choice]) errors.push(`${where} 的抉擇選項不存在`);
      }
    }
  });
  return errors;
}
