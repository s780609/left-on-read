/**
 * 存檔的序列化和容錯解析，只處理字串，不碰 localStorage。
 * 壞資料一律修復或回傳 null，不丟例外。
 */

import { DECK_SIZE, HEROINE_SEED, LADYBUG_ENDING_ID, MAX_MONEY, START_MONEY, TRUE_ENDING_ID } from "./constants.ts";
import type { Dex } from "./dex.ts";
import { OPENER_KINDS, PHASES, drawMeal, seededRngs } from "./game.ts";
import type { Phase, RunState } from "./game.ts";
import { MEALS } from "./meals.ts";
import { STORY_BY_ID } from "./stories/index.ts";
import type { Chat, OpenerKind, Story } from "./storyTypes.ts";

export interface MetaState {
  v: 1;
  introSeen: boolean;
  graduationSeen: boolean;
  dex: Dex;
}

type Json = Record<string, unknown>;

const isObject = (x: unknown): x is Json => typeof x === "object" && x !== null && !Array.isArray(x);
const isCount = (x: unknown): x is number => Number.isSafeInteger(x) && (x as number) >= 0;
const clamp = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x));

export function serializeRun(run: RunState): string {
  return JSON.stringify(run);
}

export function serializeMeta(meta: MetaState): string {
  return JSON.stringify(meta);
}

function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseMoney(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return START_MONEY;
  return clamp(Math.floor(raw), 0, MAX_MONEY);
}

function parseChat(raw: unknown, dayIndex: number): Chat | null {
  if (!isObject(raw)) return null;
  const { id, girlSeed, storyId, opener, stepIndex, lastAdvancedDay, replies } = raw;
  if (!Number.isSafeInteger(id) || (id as number) < 1) return null;
  if (typeof girlSeed !== "number" || !Number.isFinite(girlSeed)) return null;
  if (typeof storyId !== "string" || !STORY_BY_ID[storyId]) return null;
  const story: Story = STORY_BY_ID[storyId];
  const step = isCount(stepIndex) ? Math.min(stepIndex, story.steps.length - 1) : 0;
  const rawReplies = Array.isArray(replies) ? (replies as unknown[]) : [];
  return {
    id: id as number,
    girlSeed,
    storyId,
    opener: OPENER_KINDS.includes(opener as OpenerKind) ? (opener as OpenerKind) : "hi",
    stepIndex: step,
    lastAdvancedDay: isCount(lastAdvancedDay) ? Math.min(lastAdvancedDay, dayIndex) : dayIndex,
    // 已走過的每一步都要有合法選項，對話紀錄才查得到那句回覆
    replies: story.steps.slice(0, step).map((s, i) => {
      const choice = rawReplies[i];
      const options = "replies" in s ? s.replies.length : 0;
      return isCount(choice) && choice < options ? choice : 0;
    }),
  };
}

function parseChats(raw: unknown, dayIndex: number): Chat[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  const chats: Chat[] = [];
  for (const item of raw as unknown[]) {
    const chat = parseChat(item, dayIndex);
    if (!chat || seen.has(chat.id)) continue;
    seen.add(chat.id);
    chats.push(chat);
  }
  return chats;
}

export function parseRun(raw: string | null): RunState | null {
  try {
    const data = parseJson(raw);
    if (!isObject(data) || data.v !== 1) return null;
    const { runSeed, dayIndex, phase: rawPhase } = data;
    if (typeof runSeed !== "number" || !Number.isFinite(runSeed)) return null;
    if (!isCount(dayIndex)) return null;
    if (!PHASES.includes(rawPhase as Phase)) return null;

    let phase = rawPhase as Phase;
    const deckIndex = typeof data.deckIndex === "number" && Number.isInteger(data.deckIndex)
      ? clamp(data.deckIndex, 0, DECK_SIZE)
      : 0;
    const afterDeck: Phase = deckIndex >= DECK_SIZE ? "nightDone" : "swiping";

    const validSeed = typeof data.pendingMatchSeed === "number" && Number.isFinite(data.pendingMatchSeed);
    if (phase === "matched" && !validSeed) phase = afterDeck;
    if (phase === "swiping") phase = afterDeck;
    const pendingMatchSeed = phase === "matched" ? (data.pendingMatchSeed as number) : null;

    let offeredMealId: string | null = null;
    if (phase === "evening") {
      offeredMealId = MEALS.some((m) => m.id === data.offeredMealId)
        ? (data.offeredMealId as string)
        : drawMeal(seededRngs(runSeed)("meal", dayIndex)).id;
    }

    const chats = parseChats(data.chats, dayIndex);
    return {
      v: 1,
      runSeed,
      dayIndex,
      money: parseMoney(data.money),
      phase,
      rightStreak: isCount(data.rightStreak) ? data.rightStreak : 0,
      deckIndex,
      pendingMatchSeed,
      offeredMealId,
      chats,
      nextChatId: chats.reduce((max, c) => Math.max(max, c.id), 0) + 1,
      // 舊存檔沒有這個欄位；她已經在聊天或配對畫面裡，就算遇過
      heroineMet:
        data.heroineMet === true || pendingMatchSeed === HEROINE_SEED || chats.some((c) => c.girlSeed === HEROINE_SEED),
    };
  } catch {
    return null;
  }
}

export function blankMeta(): MetaState {
  return { v: 1, introSeen: false, graduationSeen: false, dex: {} };
}

export function parseMeta(raw: string | null): MetaState {
  try {
    const data = parseJson(raw);
    if (!isObject(data) || data.v !== 1) return blankMeta();
    const dex: Dex = {};
    if (isObject(data.dex)) {
      for (const [id, entry] of Object.entries(data.dex)) {
        // 只複製存在的劇情，__proto__ 這類名稱不會進入結果
        if ((!STORY_BY_ID[id] && id !== LADYBUG_ENDING_ID && id !== TRUE_ENDING_ID) || !isObject(entry)) continue;
        if (!isCount(entry.count) || entry.count < 1) continue;
        dex[id] = { count: entry.count, firstDayIndex: isCount(entry.firstDayIndex) ? entry.firstDayIndex : 0 };
      }
    }
    return { v: 1, introSeen: data.introSeen === true, graduationSeen: data.graduationSeen === true, dex };
  } catch {
    return blankMeta();
  }
}
