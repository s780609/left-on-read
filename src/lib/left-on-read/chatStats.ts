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
