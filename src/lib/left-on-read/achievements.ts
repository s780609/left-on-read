/**
 * 成就：跟失敗圖鑑分開，記的是冠宇這個人的事，不是她們的事。
 * 每個動作之後，用動作前後的局面和事件更新累計次數、檢查有沒有新解鎖。純函式，不碰存檔。
 */

import { DECK_SIZE, DRY_SPELL_DAYS, RICH_ALONE_MONEY } from "./constants.ts";
import { endingProgress, isDexComplete } from "./dex.ts";
import type { Dex } from "./dex.ts";
import type { GameEvent, RunState } from "./game.ts";
import { holidayOf } from "./holidays.ts";
import { isHaircutActive } from "./profile.ts";

/** 跨局累計的次數 */
export type MetaCounters = Record<string, number>;
/** 解鎖的成就：id → 第一次解鎖是第幾天 */
export type Achievements = Record<string, number>;

export interface AchievementDef {
  id: string;
  name: string;
  /** 解鎖條件，解鎖前就看得到 */
  hint: string;
  /** 解鎖之後的那句 */
  quip: string;
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: "first-match", name: "有人右滑我", hint: "第一次配對", quip: "我截圖了。截完才想到沒有人可以傳。" },
  {
    id: "dry-spell",
    name: "三十天的沉默",
    hint: `連續 ${DRY_SPELL_DAYS} 天沒有配對`,
    quip: "演算法沒有放棄我。它只是比較忙。",
  },
  { id: "ten-zero", name: "十投零中", hint: "一晚右滑滿 10 張，一個都沒配到", quip: "右滑的手指很努力。手指沒有錯。" },
  {
    id: "rich-alone",
    name: "存款破十萬",
    hint: `存款 NT$${RICH_ALONE_MONEY.toLocaleString("en-US")} 以上，手機裡一個聊天都沒有`,
    quip: "錢存起來了。不知道要請誰吃飯。",
  },
  { id: "scam-dodger", name: "看得出來", hint: "左滑 5 張有業績的卡", quip: "我第一次在交友軟體上躲過一劫。五次。" },
  { id: "mixup", name: "手滑", hint: "同時聊太多人，傳錯一次", quip: "複製貼上是工程師的技能，不是談戀愛的。" },
  { id: "sage", name: "賢者", hint: "用賢者模式回 5 次訊息", quip: "冷靜的時候我很會聊天。可惜我不常冷靜。" },
  { id: "gold", name: "付費會員", hint: "買一次 Swipy Gold", quip: "我付錢讓更多人可以不回我。" },
  {
    id: "glow-up",
    name: "全身翻新",
    hint: "剛剪完頭髮、有新衣服、有形象照",
    quip: "鏡子裡的人看起來有在過日子。我會努力配得上他。",
  },
  { id: "overtime", name: "責任制", hint: "答應加班 5 次", quip: "主管開始記得我的名字了。是因為我很好叫。" },
  {
    id: "holiday-alone",
    name: "一個人的節日",
    hint: "情人節、七夕、平安夜或跨年，一個人睡著",
    quip: "節日是給有約的人過的。我過的是星期幾。",
  },
  { id: "ng-plus", name: "帶著記憶重來", hint: "走過結局之後開始新遊戲＋", quip: "這次我記得要先問她今天過得好不好。" },
  { id: "graduate", name: "失敗學程畢業", hint: "失敗圖鑑收集完", quip: "我在失敗這件事上，終於是專家了。" },
  { id: "all-endings", name: "三個結局", hint: "三個結局全部看過", quip: "已讀之後，原來還有這麼多頁。" },
];

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a])
);

export const COUNTER_IDS = ["matches", "dodged", "calm", "gold", "overtime", "mixups"] as const;

/** 這些事件讓哪些累計次數 +1 */
export function tallyEvents(counters: MetaCounters, events: readonly GameEvent[]): MetaCounters {
  const next = { ...counters };
  const bump = (key: string) => {
    next[key] = (next[key] ?? 0) + 1;
  };
  for (const e of events) {
    if (e.type === "matched") bump("matches");
    if (e.type === "dodged") bump("dodged");
    if (e.type === "calm") bump("calm");
    if (e.type === "bought" && e.item === "gold") bump("gold");
    if (e.type === "dayEvent" && e.overtime) bump("overtime");
    if (e.type === "mixup") bump("mixups");
  }
  return next;
}

export interface AchievementContext {
  /** 動作之後的這一局；走到結局這一局就沒了，是 null */
  run: RunState | null;
  dex: Dex;
  counters: MetaCounters;
  events: readonly GameEvent[];
}

/** 現在符合條件的成就（不管之前解過沒有） */
export function earnedAchievements({ run, dex, counters, events }: AchievementContext): string[] {
  const earned: string[] = [];
  const count = (key: string) => counters[key] ?? 0;
  if (count("matches") >= 1) earned.push("first-match");
  if (count("dodged") >= 5) earned.push("scam-dodger");
  if (count("mixups") >= 1) earned.push("mixup");
  if (count("calm") >= 5) earned.push("sage");
  if (count("gold") >= 1) earned.push("gold");
  if (count("overtime") >= 5) earned.push("overtime");
  if (isDexComplete(dex)) earned.push("graduate");
  const endings = endingProgress(dex);
  if (endings.collected === endings.total) earned.push("all-endings");
  if (run) {
    if (run.ngPlus) earned.push("ng-plus");
    if (run.dayIndex - run.lastMatchDay >= DRY_SPELL_DAYS) earned.push("dry-spell");
    if (run.deckIndex >= DECK_SIZE && run.nightLog.rights >= DECK_SIZE && run.nightLog.matches === 0) {
      earned.push("ten-zero");
    }
    if (run.money >= RICH_ALONE_MONEY && run.chats.length === 0) earned.push("rich-alone");
    if (isHaircutActive(run.grooming, run.dayIndex) && run.grooming.outfit && run.grooming.proPhoto) {
      earned.push("glow-up");
    }
    for (const e of events) {
      if (e.type === "slept" && holidayOf(e.fromDay)?.couple) earned.push("holiday-alone");
    }
  }
  return earned;
}

/** 更新累計和成就；回傳這次新解鎖的 */
export function progressAchievements(
  counters: MetaCounters,
  achievements: Achievements,
  context: Omit<AchievementContext, "counters">,
  dayIndex: number
): { counters: MetaCounters; achievements: Achievements; unlocked: AchievementDef[] } {
  const nextCounters = tallyEvents(counters, context.events);
  const nextAchievements = { ...achievements };
  const unlocked: AchievementDef[] = [];
  for (const id of earnedAchievements({ ...context, counters: nextCounters })) {
    if (Object.hasOwn(nextAchievements, id)) continue;
    nextAchievements[id] = dayIndex;
    unlocked.push(ACHIEVEMENT_BY_ID[id]);
  }
  return { counters: nextCounters, achievements: nextAchievements, unlocked };
}
