/**
 * 存檔的序列化和容錯解析，只處理字串，不碰 localStorage。
 * 壞資料一律修復或回傳 null，不丟例外。
 */

import { ACHIEVEMENT_BY_ID, COUNTER_IDS } from "./achievements.ts";
import type { Achievements, MetaCounters } from "./achievements.ts";
import { DECK_SIZE, HEROINE_SEED, IRIS_SEED, MAX_MONEY, START_MONEY } from "./constants.ts";
import { ENDING_IDS } from "./dex.ts";
import type { Dex } from "./dex.ts";
import { OPENER_KINDS, PHASES, drawMeal, seededRngs } from "./game.ts";
import type { Phase, RunState } from "./game.ts";
import { MEALS } from "./meals.ts";
import { DEFAULT_GROOMING, DEFAULT_PROFILE, canUsePhoto, isProfileBioId, isProfilePhotoId } from "./profile.ts";
import type { Grooming, Profile } from "./profile.ts";
import { HEROINE_STORY_ID, HEROINE_V2_STORY_ID, LEGACY_HEROINE_STORY_ID, STORY_BY_ID, upgradeHeroineV2Chat, upgradeLegacyHeroineChat } from "./stories/index.ts";
import type { Chat, OpenerKind, Story } from "./storyTypes.ts";

export interface MetaState {
  v: 1;
  introSeen: boolean;
  graduationSeen: boolean;
  dex: Dex;
  /** 跨局累計的次數（成就用）；舊存檔沒有就從 0 起算 */
  counters: MetaCounters;
  achievements: Achievements;
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

/** 小晴路線舊 id：換成現行 id 和位置，之後照一般聊天驗證；存回去就是新格式，不會遷移兩次 */
function upgradeChat(raw: Json): Json {
  const { stepIndex, replies } = raw;
  const replyList = Array.isArray(replies) ? (replies as unknown[]) : [];
  const step = isCount(stepIndex) ? stepIndex : 0;
  if (raw.storyId === LEGACY_HEROINE_STORY_ID) {
    return { ...raw, storyId: HEROINE_STORY_ID, ...upgradeLegacyHeroineChat(step, replyList) };
  }
  if (raw.storyId === HEROINE_V2_STORY_ID) {
    return { ...raw, storyId: HEROINE_STORY_ID, ...upgradeHeroineV2Chat(step, replyList) };
  }
  return raw;
}

function parseChat(raw: unknown, dayIndex: number): Chat | null {
  if (!isObject(raw)) return null;
  const { id, girlSeed, storyId, opener, stepIndex, lastAdvancedDay, replies } = upgradeChat(raw);
  if (!Number.isSafeInteger(id) || (id as number) < 1) return null;
  if (typeof girlSeed !== "number" || !Number.isFinite(girlSeed)) return null;
  if (typeof storyId !== "string" || !STORY_BY_ID[storyId]) return null;
  const story: Story = STORY_BY_ID[storyId];
  const step = isCount(stepIndex) ? Math.min(stepIndex, story.steps.length - 1) : 0;
  const rawReplies = Array.isArray(replies) ? (replies as unknown[]) : [];
  const chat: Chat = {
    id: id as number,
    girlSeed: girlSeed as number,
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
  if (raw.heroineNightUsed === true) chat.heroineNightUsed = true;
  if (isObject(raw.stats)) {
    const a = raw.stats.affection, k = raw.stats.awkward, p = raw.stats.pressure;
    if ([a, k, p].every((n) => typeof n === "number" && Number.isFinite(n))) {
      chat.stats = { affection: a as number, awkward: k as number, pressure: p as number };
    }
  }
  return chat;
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
    const ngPlus = data.ngPlus === true;
    // 新遊戲＋的開場白只有新遊戲＋能用；壞資料就當一般開場白
    if (!ngPlus) for (const chat of chats) if (chat.opener === "memory") chat.opener = "hi";
    const grooming = parseGrooming(data.grooming);
    const nightHobby = isObject(data.nightHobby)
      ? {
          solo: data.nightHobby.solo === true,
          games: data.nightHobby.games === true,
          calm: data.nightHobby.solo === true && data.nightHobby.calm === true,
        }
      : { solo: false, games: false, calm: false };
    const nightLog = isObject(data.nightLog) ? data.nightLog : {};
    const rights = isCount(nightLog.rights) ? Math.min(nightLog.rights, DECK_SIZE) : 0;
    const today = isObject(data.today) ? data.today : {};
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
      dayReplies: isCount(data.dayReplies) ? data.dayReplies : 0,
      nightHobby,
      profile: parseProfile(data.profile, grooming),
      grooming,
      today: {
        eventDone: today.eventDone === true,
        overtime: today.overtime === true,
        tired: today.tired === true,
      },
      ngPlus,
      irisMet:
        data.irisMet === true || pendingMatchSeed === IRIS_SEED || chats.some((c) => c.girlSeed === IRIS_SEED),
      // 舊存檔沒有：從今天開始算
      lastMatchDay: isCount(data.lastMatchDay) ? Math.min(data.lastMatchDay, dayIndex) : dayIndex,
      nightLog: { rights, matches: isCount(nightLog.matches) ? Math.min(nightLog.matches, rights) : 0 },
    };
  } catch {
    return null;
  }
}

function parseGrooming(raw: unknown): Grooming {
  if (!isObject(raw)) return { ...DEFAULT_GROOMING };
  return {
    goldUntil: isCount(raw.goldUntil) ? raw.goldUntil : 0,
    haircutUntil: isCount(raw.haircutUntil) ? raw.haircutUntil : 0,
    outfit: raw.outfit === true,
    proPhoto: raw.proPhoto === true,
  };
}

/** 還沒拍的照片不能用，退回預設 */
function parseProfile(raw: unknown, grooming: Grooming): Profile {
  if (!isObject(raw)) return { ...DEFAULT_PROFILE };
  const photo = isProfilePhotoId(raw.photo) && canUsePhoto(raw.photo, grooming) ? raw.photo : DEFAULT_PROFILE.photo;
  const bio = isProfileBioId(raw.bio) ? raw.bio : DEFAULT_PROFILE.bio;
  return { photo, bio };
}


export function blankMeta(): MetaState {
  return { v: 1, introSeen: false, graduationSeen: false, dex: {}, counters: {}, achievements: {} };
}

function parseCounters(raw: unknown): MetaCounters {
  const counters: MetaCounters = {};
  if (!isObject(raw)) return counters;
  for (const id of COUNTER_IDS) if (isCount(raw[id])) counters[id] = raw[id] as number;
  return counters;
}

function parseAchievements(raw: unknown): Achievements {
  const out: Achievements = {};
  if (!isObject(raw)) return out;
  for (const [id, day] of Object.entries(raw)) {
    // 只收認得的成就，__proto__ 這類名稱不會進入結果
    if (!Object.hasOwn(ACHIEVEMENT_BY_ID, id)) continue;
    out[id] = isCount(day) ? day : 0;
  }
  return out;
}

export function parseMeta(raw: string | null): MetaState {
  try {
    const data = parseJson(raw);
    if (!isObject(data) || data.v !== 1) return blankMeta();
    const dex: Dex = {};
    if (isObject(data.dex)) {
      for (const [id, entry] of Object.entries(data.dex)) {
        // 只複製存在的劇情，__proto__ 這類名稱不會進入結果
        if ((!STORY_BY_ID[id] && !ENDING_IDS.includes(id)) || !isObject(entry)) continue;
        if (!isCount(entry.count) || entry.count < 1) continue;
        dex[id] = { count: entry.count, firstDayIndex: isCount(entry.firstDayIndex) ? entry.firstDayIndex : 0 };
      }
    }
    return {
      v: 1,
      introSeen: data.introSeen === true,
      graduationSeen: data.graduationSeen === true,
      dex,
      counters: parseCounters(data.counters),
      achievements: parseAchievements(data.achievements),
    };
  } catch {
    return blankMeta();
  }
}
