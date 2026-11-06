/**
 * 聊天隱性數值：好感／尷尬／已讀壓力。
 * 回覆會改這三條；尷尬太高或「沒好感又壓力爆」會提早走到結局步。
 */
import {
  AFFECTION_SOFT_MIN,
  AWKWARD_END,
  PRESSURE_SOFT_END,
} from "./constants.ts";
import type { Chat, ChatStats, ReplyStep, Story } from "./storyTypes.ts";

export const ZERO_STATS: ChatStats = { affection: 0, awkward: 0, pressure: 0 };

export function statsOf(chat: Chat): ChatStats {
  return chat.stats ?? { ...ZERO_STATS };
}

/** 從這一步的選項推數值變化 */
export function replyDelta(step: ReplyStep, choice: number): ChatStats {
  const custom = step.deltas?.[choice];
  if (custom) {
    return {
      affection: custom.affection ?? 0,
      awkward: custom.awkward ?? 0,
      pressure: custom.pressure ?? 0,
    };
  }
  const score = step.scores?.[choice];
  if (score !== undefined) {
    return {
      affection: score,
      awkward: score < 0 ? 1 : 0,
      pressure: score === 0 ? 1 : 0,
    };
  }
  const n = step.replies.length;
  if (n <= 1) return { affection: 0, awkward: 0, pressure: 0 };
  if (choice === 0) return { affection: 0, awkward: 0, pressure: 0 };
  if (choice === n - 1) return { affection: 0, awkward: 1, pressure: 0 };
  return { affection: 1, awkward: 0, pressure: 0 };
}

export function applyDelta(stats: ChatStats, delta: ChatStats): ChatStats {
  return {
    affection: stats.affection + delta.affection,
    awkward: Math.max(0, stats.awkward + delta.awkward),
    pressure: Math.max(0, stats.pressure + delta.pressure),
  };
}

/** 該不該提早跳到結局步 */
export function shouldSoftEnd(stats: ChatStats): boolean {
  if (stats.awkward >= AWKWARD_END) return true;
  if (stats.pressure >= PRESSURE_SOFT_END && stats.affection < AFFECTION_SOFT_MIN) return true;
  return false;
}

/** 把聊天推到最後一步（結局），中間沒走過的回覆用 0 補上 */
export function jumpToEnding(chat: Chat, story: Story, choiceJustMade: number): Chat {
  const last = story.steps.length - 1;
  const replies = [...chat.replies, choiceJustMade];
  while (replies.length < last) replies.push(0);
  return { ...chat, stepIndex: last, replies: replies.slice(0, last) };
}

// ---------- C：數值看得出來，但不顯示數字 ----------

export type Vibe = "warm" | "cold" | "awkward" | "neutral";

/** 聊天室上方冠宇的觀察；neutral 沒有句子 */
export function chatVibe(stats: ChatStats): { vibe: Vibe; line: string | null } {
  if (stats.awkward >= 2) return { vibe: "awkward", line: "她的回覆越來越短。上一則只有兩個字。" };
  if (stats.pressure >= 2 && stats.affection < 2) {
    return { vibe: "cold", line: "上次隔太久才回。她這次也回得很慢，像在等我反省。" };
  }
  if (stats.affection >= 2) return { vibe: "warm", line: "她回訊息開始會加表情符號了。我截圖存起來。" };
  return { vibe: "neutral", line: null };
}

// ---------- E：打手槍之後的賢者模式 ----------

/** 賢者模式那一句：好感 +1，尷尬和壓力各 -1 */
export const CALM_DELTA: ChatStats = { affection: 1, awkward: -1, pressure: -1 };

/** 這一步能不能用賢者模式：要有得選，而且不是計分題、抉擇、約會或假失敗 */
export function canCalm(step: ReplyStep): boolean {
  return (
    step.replies.length >= 2 && !step.scores && !step.decision && !step.date && !step.fakeEnding && !step.comeback
  );
}

/** 冷靜下來就看得出哪一句最好：好感最高、尷尬和壓力最低的那句，同分取前面 */
export function calmChoice(step: ReplyStep): number {
  let best = 0;
  let bestValue = -Infinity;
  step.replies.forEach((_, i) => {
    const d = replyDelta(step, i);
    const value = d.affection - d.awkward - d.pressure;
    if (value > bestValue) {
      best = i;
      bestValue = value;
    }
  });
  return best;
}
