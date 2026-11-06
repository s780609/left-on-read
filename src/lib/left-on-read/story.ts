/**
 * 聊天的規則：開場白、抽劇情的權重、等待與 ready、對話紀錄、劇情資料驗證。
 */

import { calendarOf, isPhoneChatDay, isWorkday } from "./calendar.ts";
import { HEROINE_SEED, HEROINE_INTEREST_OPENER_SCORE, NON_LURE_PITCH_MULT } from "./constants.ts";
import type { Dex } from "./dex.ts";
import type { Girl } from "./girl.ts";
import { HEROINE_INTEREST, INTERESTS } from "./girlData.ts";
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
/** 新遊戲＋的開場白：上一輪學到要先關心她，比較不會被已讀，業績也比較少 */
const MEMORY_MULT: Record<StoryCategory, number> = { ghost: 1, fade: 2, pitch: 0.5, quick: 1 };

/** 新遊戲＋才有的開場白 */
export const MEMORY_OPENER = { kind: "memory" as const, text: "妳今天過得怎麼樣？我是真的想知道，不是開場白。" };

/** 有好感加成的開場白：興趣句和新遊戲＋那句 */
export function isWarmOpener(opener: OpenerKind): boolean {
  return opener === "interest" || opener === "memory";
}

/** 抽劇情時，卡片和冠宇檔案的影響 */
export interface StoryPickContext {
  /** 有業績的卡：只走業績學程 */
  lure?: boolean;
  /** 冠宇的照片和自介讓哪一類比較容易發生 */
  categoryMult?: Partial<Record<StoryCategory, number>>;
}

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
  return girl.interest === HEROINE_INTEREST.id ? HEROINE_INTEREST : INTERESTS.find((i) => i.id === girl.interest);
}

export function interestLabel(girl: Girl): string {
  return interestOf(girl)?.label ?? "";
}

export function renderLine(text: string, girl: Girl): string {
  return text
    .replaceAll("{name}", girl.nickname)
    .replaceAll("{interest}", interestOf(girl)?.label ?? "");
}

/** 配對畫面的開場白；新遊戲＋多一句 */
export function openerOptions(girl: Girl, ngPlus = false): { kind: OpenerKind; text: string }[] {
  return [
    ...GENERIC_OPENERS.map((o) => ({ ...o })),
    { kind: "interest", text: renderLine(interestOf(girl)?.openerLine ?? "", girl) },
    ...(ngPlus ? [{ ...MEMORY_OPENER }] : []),
  ];
}

/**
 * 沒有 context 時是原本的權重；有 context 才套用卡片（業績）和冠宇檔案的倍率。
 * 有業績的卡只抽業績學程，業績學程全被占用時才退回一般權重。
 */
export function storyWeights(
  opener: OpenerKind,
  dex: Dex,
  activeStoryIds: readonly string[],
  context?: StoryPickContext
): { item: Story; weight: number }[] {
  const table = opener === "interest" ? INTEREST_MULT : opener === "memory" ? MEMORY_MULT : GENERIC_MULT;
  const active = new Set(activeStoryIds);
  // 全部被占用時才解除，一定抽得到東西
  const allOccupied = STORIES.every((s) => active.has(s.id));
  const free = (s: Story) => allOccupied || !active.has(s.id);
  const lureOnly = Boolean(context?.lure) && STORIES.some((s) => s.category === "pitch" && free(s));
  return STORIES.map((item) => {
    if (!free(item)) return { item, weight: 0 };
    if (lureOnly && item.category !== "pitch") return { item, weight: 0 };
    const collected = Object.hasOwn(dex, item.id);
    let weight = table[item.category] * (collected ? 1 : UNCOLLECTED_MULT);
    if (context) {
      if (!context.lure && item.category === "pitch") weight *= NON_LURE_PITCH_MULT;
      weight *= context.categoryMult?.[item.category] ?? 1;
    }
    return { item, weight };
  });
}

export function pickStory(
  opener: OpenerKind,
  dex: Dex,
  activeStoryIds: readonly string[],
  rng: Rng,
  context?: StoryPickContext
): Story {
  return weightedPick(rng, storyWeights(opener, dex, activeStoryIds, context));
}

export function firstReadyDay(lastAdvancedDay: number, wait: StepWait = DEFAULT_WAIT): number {
  if ("days" in wait) return lastAdvancedDay + wait.days;
  // 等星期時當天不算，一定是之後的那一天
  const delta = (wait.weekday - calendarOf(lastAdvancedDay).weekday + 7) % 7;
  return lastAdvancedDay + (delta === 0 ? 7 : delta);
}

/** 夜晚階段：小晴可以在白天回過之後，當晚再推一步 */
export type ChatPhase = "daytime" | "night" | "nightDone" | string;

/** 只看等待時間（和小晴夜間加成）；對話紀錄用這個，平日不能回時仍看得到訊息 */
export function isWaitReady(chat: Chat, dayIndex: number, phase?: ChatPhase): boolean {
  const step = STORY_BY_ID[chat.storyId]?.steps[chat.stepIndex];
  if (step === undefined || ("date" in step && step.date)) return false;
  // 結局步立刻可關：拒 1h2s／軟收之後不要卡在「今晚她不會再回了」
  if (isFinal(step)) return true;
  const wait = step.wait ?? { days: 1 };
  const readyDay = firstReadyDay(chat.lastAdvancedDay, wait);
  if (dayIndex >= readyDay) return true;
  // 小晴專用：白天已回（等一天），晚上同一天再給一步
  if (
    chat.girlSeed === HEROINE_SEED &&
    !chat.heroineNightUsed &&
    (phase === "night" || phase === "nightDone") &&
    dayIndex === chat.lastAdvancedDay &&
    "days" in wait &&
    wait.days >= 1
  ) {
    return true;
  }
  return false;
}

/** 現在能不能回：等滿 + 今天是可回訊息日 */
export function isChatReady(chat: Chat, dayIndex: number, phase?: ChatPhase): boolean {
  return isWaitReady(chat, dayIndex, phase) && isPhoneChatDay(calendarOf(dayIndex));
}

export function readyChats(chats: readonly Chat[], dayIndex: number, phase?: ChatPhase): Chat[] {
  return chats.filter((chat) => isChatReady(chat, dayIndex, phase));
}

/** 開場白挑興趣句有加分，再加上每句回覆的分數；不存在狀態裡，舊存檔和壞資料都算得出來 */
export function chatScore(chat: Chat): number {
  const steps = STORY_BY_ID[chat.storyId]?.steps ?? [];
  return chat.replies.reduce(
    (total, choice, i) => {
      const step = steps[i];
      return total + (step && "replies" in step ? (step.scores?.[choice] ?? 0) : 0);
    },
    isWarmOpener(chat.opener) ? HEROINE_INTEREST_OPENER_SCORE : 0
  );
}

/** 卡在約會那一步的聊天：要等赴約才會往下走 */
export function pendingDateStep(chat: Chat): ReplyStep | null {
  const step = STORY_BY_ID[chat.storyId]?.steps[chat.stepIndex];
  return step && "date" in step && step.date ? step : null;
}

/** 今天可以赴約的聊天：週末，而且已經等滿這一步的等待時間 */
export function dueDateChat(chats: readonly Chat[], dayIndex: number): Chat | null {
  if (isWorkday(calendarOf(dayIndex))) return null;
  const due = chats.find((chat) => {
    const step = pendingDateStep(chat);
    return step !== null && dayIndex >= firstReadyDay(chat.lastAdvancedDay, step.wait);
  });
  return due ?? null;
}

/** 假失敗之後，她今天主動回來了的聊天 */
export function comebackChat(chats: readonly Chat[], dayIndex: number): Chat | null {
  const due = chats.find((chat) => {
    const step = STORY_BY_ID[chat.storyId]?.steps[chat.stepIndex];
    // 回來那天就要看得到她；能不能回仍看 isChatReady
    return step && "comeback" in step && step.comeback && isWaitReady(chat, dayIndex);
  });
  return due ?? null;
}

/** 假失敗到隔天早上之前，她要從手機上消失，玩家才會真的以為斷聯了；資料還留著 */
export function visibleChats(chats: readonly Chat[], dayIndex: number): Chat[] {
  return chats.filter((chat) => {
    const step = STORY_BY_ID[chat.storyId]?.steps[chat.stepIndex];
    return !(step && "comeback" in step && step.comeback) || isWaitReady(chat, dayIndex);
  });
}

function incomingLine(incoming: Incoming, girl: Girl): TranscriptLine | null {
  switch (incoming.kind) {
    case "none":
      return null;
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
  const opener = openerOptions(girl, true).find((o) => o.kind === chat.opener);
  const lines: TranscriptLine[] = opener ? [{ who: "me", text: opener.text }] : [];
  const pushIncoming = (incoming: Incoming) => {
    const line = incomingLine(incoming, girl);
    if (line) lines.push(line);
  };
  const pushLead = (step: ReplyStep | FinalStep) => {
    if ("lead" in step) for (const text of step.lead ?? []) lines.push({ who: "her", text: renderLine(text, girl) });
  };
  for (let i = 0; i < chat.stepIndex; i++) {
    const step = story.steps[i] as ReplyStep;
    pushLead(step);
    pushIncoming(step.incoming);
    // 約會裡的選擇和「……就這樣了」不是傳給她的訊息
    if (!step.date && !step.fakeEnding) {
      lines.push({ who: "me", text: renderLine(step.replies[chat.replies[i]], girl) });
    }
    const answer = step.answers?.[chat.replies[i]] ?? step.answer;
    if (answer) lines.push({ who: "her", text: renderLine(answer, girl) });
  }
  if (isWaitReady(chat, dayIndex)) {
    const current = story.steps[chat.stepIndex];
    pushLead(current);
    pushIncoming(current.incoming);
    if ("os" in current) for (const text of current.os ?? []) lines.push({ who: "narration", text: renderLine(text, girl) });
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
    // 0 = 同一輪立刻接（場次確認、約會當晚收尾、假失敗當日）
    return Number.isInteger(wait.days) && wait.days >= 0 ? [] : [`${where} 的等待天數不合法`];
  }
  return Number.isInteger(wait.weekday) && wait.weekday >= 0 && wait.weekday <= 6
    ? []
    : [`${where} 的星期不合法`];
}

/** 她路線才有的欄位 */
function routeFieldErrors(step: ReplyStep, where: string): string[] {
  const errors: string[] = [];
  const { scores, gate, answer, answers, lead, date, fakeEnding, comeback } = step;
  if (answers) {
    if (answers.length !== step.replies.length) errors.push(`${where} 的回應和回覆數不符`);
    answers.forEach((text, i) => errors.push(...placeholderErrors(text, `${where} 的回應 ${i}`)));
  }
  lead?.forEach((text, i) => errors.push(...placeholderErrors(text, `${where} 的鋪陳 ${i}`)));
  if (scores) {
    if (scores.length !== step.replies.length) errors.push(`${where} 的分數和回覆數不符`);
    if (!scores.every((s) => s === 1 || s === 0 || s === -1)) errors.push(`${where} 的分數不合法`);
  }
  if (gate && (!Number.isInteger(gate.minScore) || !STORY_BY_ID[gate.failStoryId])) {
    errors.push(`${where} 的分數門檻不合法`);
  }
  if (answer !== undefined) errors.push(...placeholderErrors(answer, `${where} 的回應`));
  if (date && (!Number.isInteger(date.cost) || date.cost < 0)) errors.push(`${where} 的約會花費不合法`);
  if (fakeEnding) {
    errors.push(...placeholderErrors(fakeEnding.narration, `${where} 的假結局`));
    if (!STORY_BY_ID[fakeEnding.storyId]) errors.push(`${where} 的假結局劇情不存在`);
  }
  if (comeback) errors.push(...placeholderErrors(comeback.aside, `${where} 的旁白`));
    if ("os" in step) for (const [i, line] of (step.os ?? []).entries()) errors.push(...placeholderErrors(line, `${where} 的內心 OS ${i}`));
  return errors;
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
      if (last && !step.date?.endingId) errors.push(`${where} 是最後一步卻沒有結局`);
      const minReplies = step.answer !== undefined || step.fakeEnding ? 1 : 2;
      if (!hasReplies || step.replies.length < minReplies || step.replies.length > 3) {
        errors.push(`${where} 的回覆要 2～3 句`);
      } else {
        step.replies.forEach((reply, r) => errors.push(...placeholderErrors(reply, `${where} 回覆 ${r}`)));
        if (step.decision && !step.replies[step.decision.choice]) errors.push(`${where} 的抉擇選項不存在`);
        errors.push(...routeFieldErrors(step, where));
      }
    }
  });
  return errors;
}
