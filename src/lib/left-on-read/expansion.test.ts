/**
 * 玩法擴展：冠宇的檔案與付費（A）、看自介識破業績（B）、聊天氣氛（C）、傳錯人（D）、
 * 夜間消遣的效果（E）、節日與白天事件（F）、新遊戲＋、Iris 路線、成就、存檔相容。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { ACHIEVEMENTS, earnedAchievements, progressAchievements, tallyEvents } from "./achievements.ts";
import { calendarOf } from "./calendar.ts";
import { CALM_DELTA, calmChoice, canCalm, chatVibe } from "./chatStats.ts";
import {
  DAYTIME_REPLY_LIMIT,
  DECK_SIZE,
  GOLD_DAYS,
  GOLD_PRICE,
  IRIS_ENDING_ID,
  IRIS_PATIENCE,
  IRIS_SEED,
  LADYBUG_ENDING_ID,
  LURE_RATE,
  MIXUP_MIN_CHATS,
  OVERTIME_PAY,
  PHOTOSHOOT_PRICE,
  SUPER_LIKE_PRICE,
  TRUE_ENDING_ID,
  TYPHOON_REPLY_BONUS,
} from "./constants.ts";
import { DAY_EVENTS, dayEventOf, isInvoiceDay } from "./dayEvents.ts";
import { endingProgress } from "./dex.ts";
import type { Dex } from "./dex.ts";
import {
  advance,
  checkInvariants,
  createRun,
  dayReplyLimit,
  deckCardSeed,
  heroineCardIndex,
  irisCardIndex,
  legalActions,
  mixupVictim,
  runMatchMult,
  todayEvent,
} from "./game.ts";
import type { GameAction, GameEvent, RngFactory, RunState } from "./game.ts";
import { generateGirl } from "./girl.ts";
import { LURE_BIOS, LURE_JOBS } from "./girlData.ts";
import { holidayMatchMult, holidayOf } from "./holidays.ts";
import { matchProbability } from "./match.ts";
import {
  DEFAULT_GROOMING,
  PROFILE_BIOS,
  PROFILE_PHOTOS,
  exposureStars,
  profileCategoryMult,
  profileMatchMult,
} from "./profile.ts";
import { blankMeta, parseMeta, parseRun, serializeMeta, serializeRun } from "./save.ts";
import {
  IRIS_ALMOST_STORY_ID,
  IRIS_LEFT_STORY_ID,
  IRIS_STORY_ID,
  MIXUP_STORY_ID,
  SPECIAL_STORIES,
  STORIES,
  STORY_BY_ID,
  datesForStory,
} from "./stories/index.ts";
import { chatScore, chatTranscript, isChatReady, openerOptions, storyWeights, validateStory } from "./story.ts";
import type { Chat, ReplyStep, Story } from "./storyTypes.ts";

const NO_MATCH: RngFactory = () => () => 0.999;
const at = (patch: Partial<RunState>): RunState => ({ ...createRun(1), ...patch });
const eventOf = <T extends GameEvent["type"]>(events: readonly GameEvent[], type: T) =>
  events.find((e): e is Extract<GameEvent, { type: T }> => e.type === type);
const ENDED: Dex = { [LADYBUG_ENDING_ID]: { count: 1, firstDayIndex: 0 } };

function act(run: RunState, dex: Dex, action: GameAction, rngs?: RngFactory) {
  const r = advance(run, dex, action, rngs);
  assert.notEqual(r.run, run, `${action.type} 應該合法`);
  assert.deepEqual(checkInvariants(r.run), [], action.type);
  return r;
}

/** 找第一個符合條件的日子 */
function findDay(pred: (dayIndex: number) => boolean, from = 0): number {
  for (let d = from; d < 800; d++) if (pred(d)) return d;
  throw new Error("找不到符合條件的日子");
}

const isWeekend = (d: number) => [0, 6].includes(calendarOf(d).weekday);

/** 某一則一般劇情的聊天，停在 stepIndex */
function normalChat(id: number, story: Story, stepIndex = 0, girlSeed = 1000 + id): Chat {
  return {
    id,
    girlSeed,
    storyId: story.id,
    opener: "hi",
    stepIndex,
    lastAdvancedDay: 0,
    replies: Array<number>(stepIndex).fill(0),
  };
}

const longStories = () => STORIES.filter((s) => s.steps.length >= 4);

// ---------- A：冠宇的檔案、付費、打理自己 ----------

test("A：預設檔案不改變配對率，照片和自介各自有倍率", () => {
  assert.equal(profileMatchMult({ photo: "selfie", bio: "honest" }, DEFAULT_GROOMING, 0), 1);
  assert.ok(profileMatchMult({ photo: "cat", bio: "sincere" }, DEFAULT_GROOMING, 0) > 1.2);
  assert.ok(profileMatchMult({ photo: "group", bio: "stats" }, DEFAULT_GROOMING, 0) < 1);
  assert.equal(runMatchMult(createRun(1)), holidayMatchMult(0));
});

test("A：照片和自介改的是哪一種失敗比較容易發生", () => {
  assert.deepEqual(profileCategoryMult({ photo: "selfie", bio: "honest" }), {});
  assert.ok((profileCategoryMult({ photo: "pro", bio: "stats" }).pitch ?? 1) >= 5);
  assert.ok((profileCategoryMult({ photo: "cat", bio: "honest" }).ghost ?? 1) > 1);
  for (const p of PROFILE_PHOTOS) for (const b of PROFILE_BIOS) {
    for (const m of Object.values(profileCategoryMult({ photo: p.id, bio: b.id }))) assert.ok(m! > 0);
  }
});

test("A：曝光指數 1～5 顆星，越高越多", () => {
  assert.equal(exposureStars(0.5), 1);
  assert.equal(exposureStars(1), 2);
  assert.equal(exposureStars(3), 5);
  assert.ok(exposureStars(1.3) > exposureStars(1));
});

test("A：Swipy Gold 拿得起手機就能買，扣錢、30 天有效、可以續", () => {
  const night = at({ phase: "night", dayIndex: 10 });
  const r = act(night, {}, { type: "buy", item: "gold" });
  assert.equal(r.run.money, night.money - GOLD_PRICE);
  assert.equal(r.run.grooming.goldUntil, 10 + GOLD_DAYS);
  assert.ok(runMatchMult(r.run) > runMatchMult(night) || holidayOf(10) !== null);
  const again = act(r.run, {}, { type: "buy", item: "gold" });
  assert.equal(again.run.grooming.goldUntil, 10 + GOLD_DAYS * 2);
  assert.equal(eventOf(r.events, "bought")?.price, GOLD_PRICE);
  // 吃飯、滑卡中不行；錢不夠不行
  for (const phase of ["evening", "swiping"] as const) {
    const s = at({ phase, offeredMealId: "braised-pork" });
    assert.equal(advance(s, {}, { type: "buy", item: "gold" }).run, s, phase);
  }
  const broke = at({ phase: "night", money: GOLD_PRICE - 1 });
  assert.equal(advance(broke, {}, { type: "buy", item: "gold" }).run, broke);
  assert.ok(!legalActions(broke).includes("buy"));
});

test("A：剪頭髮、衣服、形象照只有週末白天買得到；衣服和形象照只能買一次", () => {
  const weekday = findDay((d) => !isWeekend(d) && calendarOf(d).day !== 5);
  const weekend = findDay((d) => isWeekend(d) && calendarOf(d).day !== 5);
  for (const item of ["haircut", "outfit", "photoshoot"] as const) {
    const w = at({ phase: "daytime", dayIndex: weekday, money: 50_000 });
    assert.equal(advance(w, {}, { type: "buy", item }).run, w, `${item} 平日不能買`);
    const n = at({ phase: "night", dayIndex: weekend, money: 50_000 });
    assert.equal(advance(n, {}, { type: "buy", item }).run, n, `${item} 晚上不能買`);
  }
  let run = at({ phase: "daytime", dayIndex: weekend, money: 50_000 });
  run = act(run, {}, { type: "buy", item: "photoshoot" }).run;
  assert.equal(run.money, 50_000 - PHOTOSHOOT_PRICE);
  assert.equal(run.grooming.proPhoto, true);
  assert.equal(advance(run, {}, { type: "buy", item: "photoshoot" }).run, run);
  run = act(run, {}, { type: "buy", item: "outfit" }).run;
  assert.equal(advance(run, {}, { type: "buy", item: "outfit" }).run, run);
  run = act(run, {}, { type: "buy", item: "haircut" }).run;
  assert.ok(run.grooming.haircutUntil > weekend);
});

test("A：改檔案只在晚上，形象照要先拍過才能用", () => {
  const night = at({ phase: "night" });
  const r = act(night, {}, { type: "editProfile", photo: "cat", bio: "sincere" });
  assert.deepEqual(r.run.profile, { photo: "cat", bio: "sincere" });
  assert.equal(advance(night, {}, { type: "editProfile", photo: "pro", bio: "honest" }).run, night);
  const shot = at({ phase: "night", grooming: { ...DEFAULT_GROOMING, proPhoto: true } });
  act(shot, {}, { type: "editProfile", photo: "pro", bio: "honest" });
  const day = at({ phase: "daytime" });
  assert.equal(advance(day, {}, { type: "editProfile", photo: "cat", bio: "honest" }).run, day);
  // 跟現在一樣、亂寫的 id 都不算
  assert.equal(advance(night, {}, { type: "editProfile", photo: "selfie", bio: "honest" }).run, night);
  const bad = { type: "editProfile", photo: "nope", bio: "honest" } as unknown as GameAction;
  assert.equal(advance(night, {}, bad).run, night);
});

test("A：超級喜歡扣 99 元、算右滑、配對率比較高；錢不夠不能按", () => {
  const swiping = at({ phase: "swiping", money: 1_000 });
  const r = act(swiping, {}, { type: "swipe", dir: "super" }, NO_MATCH);
  assert.equal(r.run.money, 1_000 - SUPER_LIKE_PRICE);
  assert.equal(r.run.rightStreak, 1);
  assert.equal(r.run.nightLog.rights, 1);
  const broke = at({ phase: "swiping", money: SUPER_LIKE_PRICE - 1 });
  assert.equal(advance(broke, {}, { type: "swipe", dir: "super" }).run, broke);
  const base = { pickiness: 0.5, rightStreak: 0, age: 25, eduMod: 0 as const };
  assert.ok(matchProbability({ ...base, mult: 2.2, maxP: 0.6 }) > matchProbability(base));
  assert.ok(matchProbability({ ...base, pickiness: 0, mult: 99, maxP: 0.6 }) <= 0.6);
});

// ---------- B：看自介識破業績 ----------

test("B：有業績的卡大約一成，自介和職業都看得出來，個工不會同時是業績", () => {
  let lure = 0;
  const N = 4000;
  for (let seed = 1; seed <= N; seed++) {
    const g = generateGirl(seed * 7919);
    if (!g.lure) continue;
    lure++;
    assert.ok(!g.studio);
    assert.ok((LURE_BIOS as readonly string[]).includes(g.bio), g.bio);
    assert.ok((LURE_JOBS as readonly string[]).includes(g.job), g.job);
  }
  assert.ok(Math.abs(lure / N - LURE_RATE * 0.95) < 0.025, `比例 ${lure / N}`);
  assert.equal(generateGirl(IRIS_SEED).lure, false);
});

test("B：業績卡只抽業績學程；一般卡的業績學程變少", () => {
  const lure = storyWeights("hi", {}, [], { lure: true });
  for (const { item, weight } of lure) if (item.category !== "pitch") assert.equal(weight, 0, item.id);
  assert.ok(lure.some((w) => w.weight > 0));
  const plain = storyWeights("hi", {}, [], {});
  const old = storyWeights("hi", {}, []);
  const pitchShare = (ws: typeof plain) =>
    ws.filter((w) => w.item.category === "pitch").reduce((a, w) => a + w.weight, 0) /
    ws.reduce((a, w) => a + w.weight, 0);
  assert.ok(pitchShare(plain) < pitchShare(old) / 3);
  // 業績學程全被占用時退回一般權重，一定抽得到
  const allPitch = STORIES.filter((s) => s.category === "pitch").map((s) => s.id);
  const fallback = storyWeights("hi", {}, allPitch, { lure: true });
  assert.ok(fallback.some((w) => w.weight > 0 && w.item.category !== "pitch"));
});

test("B：配對到業績卡，劇情一定是業績學程；左滑業績卡會記一次", () => {
  const lureSeed = findSeed((g) => g.lure);
  const matched = at({ phase: "matched", pendingMatchSeed: lureSeed, deckIndex: 1 });
  for (const opener of ["hi", "whatsup", "eaten", "interest"] as const) {
    const r = act(matched, {}, { type: "chooseOpener", opener });
    assert.equal(STORY_BY_ID[r.run.chats[0].storyId].category, "pitch", opener);
  }
  // 找一晚牌組裡有業績卡的位置
  for (let day = 0; day < 200; day++) {
    const run = at({ phase: "swiping", dayIndex: day });
    for (let i = 0; i < DECK_SIZE; i++) {
      if (!generateGirl(deckCardSeed(run, {}, i)).lure) continue;
      const r = act({ ...run, deckIndex: i }, {}, { type: "swipe", dir: "left" });
      assert.ok(eventOf(r.events, "dodged"));
      return;
    }
  }
  assert.fail("200 晚都沒有業績卡");
});

function findSeed(pred: (g: ReturnType<typeof generateGirl>) => boolean): number {
  for (let seed = 1; seed < 100_000; seed++) if (pred(generateGirl(seed))) return seed;
  throw new Error("找不到");
}

// ---------- C：聊天氣氛 ----------

test("C：氣氛看得出來但不顯示數字，尷尬優先", () => {
  assert.deepEqual(chatVibe({ affection: 0, awkward: 0, pressure: 0 }), { vibe: "neutral", line: null });
  assert.equal(chatVibe({ affection: 3, awkward: 0, pressure: 0 }).vibe, "warm");
  assert.equal(chatVibe({ affection: 0, awkward: 0, pressure: 2 }).vibe, "cold");
  assert.equal(chatVibe({ affection: 5, awkward: 2, pressure: 5 }).vibe, "awkward");
  for (const s of [
    { affection: 3, awkward: 0, pressure: 0 },
    { affection: 0, awkward: 0, pressure: 2 },
    { affection: 0, awkward: 2, pressure: 0 },
  ]) {
    const { line } = chatVibe(s);
    assert.ok(line && !/\d/.test(line), line ?? "");
  }
});

// ---------- D：傳錯人 ----------

test("D：同時聊不到三個人不會傳錯；三個人以上由 runSeed 決定、會發生", () => {
  const stories = longStories();
  const two = at({ phase: "night", chats: [normalChat(1, stories[0]), normalChat(2, stories[1])], nextChatId: 3 });
  for (let seed = 0; seed < 300; seed++) assert.equal(mixupVictim({ ...two, runSeed: seed }, two.chats[0]), null);
  const chats = [0, 1, 2].map((i) => normalChat(i + 1, stories[i]));
  assert.equal(chats.length, MIXUP_MIN_CHATS);
  let hits = 0;
  for (let seed = 0; seed < 1000; seed++) {
    const run = at({ phase: "night", runSeed: seed, chats, nextChatId: 4 });
    const victim = mixupVictim(run, chats[0]);
    if (victim) {
      hits++;
      assert.notEqual(victim, chats[0]);
      assert.equal(mixupVictim(run, chats[0]), victim, "同一個局面結果一樣");
    }
  }
  assert.ok(hits > 80 && hits < 230, `1000 次傳錯 ${hits} 次`);
});

test("D：傳錯人：原本的聊天照樣往下，被傳到的那個人直接結束，記一筆隱藏失敗", () => {
  const stories = longStories();
  const chats = [0, 1, 2].map((i) => normalChat(i + 1, stories[i]));
  const runSeed = findDay((s) => mixupVictim(at({ runSeed: s, chats, nextChatId: 4, dayIndex: 1 }), chats[0]) !== null);
  const run = at({ phase: "night", runSeed, chats, nextChatId: 4, dayIndex: 1 });
  const victim = mixupVictim(run, chats[0])!;
  const r = act(run, {}, { type: "reply", chatId: 1, choice: 0 });
  assert.ok(eventOf(r.events, "mixup"));
  const ended = eventOf(r.events, "chatEnded");
  assert.equal(ended?.storyId, MIXUP_STORY_ID);
  assert.equal(ended?.girlSeed, victim.girlSeed);
  assert.ok(ended?.narration.includes(generateGirl(victim.girlSeed).nickname));
  assert.equal(r.run.chats.find((c) => c.id === 1)?.stepIndex, 1);
  // 被傳到的那個人留在列表，標成已結束，不會再被傳錯
  assert.equal(r.run.chats.find((c) => c.id === victim.id)?.closed, true);
  assert.equal(r.run.chats.filter((c) => !c.closed).length, 2);
  assert.equal(r.dex[MIXUP_STORY_ID].count, 1);
  // 隱藏失敗，不算進一般圖鑑
  assert.ok(!STORIES.some((s) => s.id === MIXUP_STORY_ID));
});

test("D：小晴、個工、Iris 不會被傳錯，也不會傳錯給別人", () => {
  const stories = longStories();
  for (const special of ["heroine-v3", "studio", IRIS_STORY_ID]) {
    const chats = [
      { ...normalChat(1, STORY_BY_ID[special]) },
      normalChat(2, stories[0]),
      normalChat(3, stories[1]),
    ];
    for (let seed = 0; seed < 300; seed++) {
      const run = at({ runSeed: seed, chats, nextChatId: 4 });
      assert.equal(mixupVictim(run, chats[0]), null, special);
      const v = mixupVictim(run, chats[1]);
      assert.ok(v === null || v.storyId !== special, special);
    }
  }
});

// ---------- E：夜間消遣 ----------

test("E：打手槍之後多一個賢者模式，只能選冷靜看得出來的那句，一晚一次", () => {
  const story = longStories().find((s) => canCalm(s.steps[0] as ReplyStep))!;
  const step = story.steps[0] as ReplyStep;
  const chat = normalChat(1, story);
  let run = at({ phase: "night", dayIndex: 1, chats: [chat], nextChatId: 2 });
  const calmAction: GameAction = { type: "reply", chatId: 1, choice: calmChoice(step), calm: true };
  assert.equal(advance(run, {}, calmAction).run, run, "還沒打手槍");
  run = act(run, {}, { type: "jerkOff" }).run;
  assert.equal(run.nightHobby.calm, true);
  const wrong = { ...calmAction, choice: (calmChoice(step) + 1) % step.replies.length };
  assert.equal(advance(run, {}, wrong).run, run, "只能選那一句");
  const r = act(run, {}, calmAction);
  assert.ok(eventOf(r.events, "calm"));
  assert.equal(r.run.nightHobby.calm, false);
  assert.deepEqual(r.run.chats[0].stats, {
    affection: CALM_DELTA.affection,
    awkward: 0,
    pressure: 0,
  });
  // 對話紀錄照常顯示那一句
  const lines = chatTranscript(r.run.chats[0], generateGirl(chat.girlSeed), 1);
  assert.ok(lines.some((l) => l.who === "me" && l.text.length > 0));
  // 睡覺歸零
  const slept = act({ ...run, phase: "night" }, {}, { type: "sleep" });
  assert.equal(slept.run.nightHobby.calm, false);
});

test("E：計分題、抉擇、約會、假失敗不能用賢者模式；賢者模式選的是最好的那句", () => {
  for (const story of [...STORIES, ...SPECIAL_STORIES]) {
    for (const step of story.steps) {
      if (!("replies" in step)) continue;
      if (step.scores || step.decision || step.date || step.fakeEnding) assert.ok(!canCalm(step), story.id);
    }
  }
  const step: ReplyStep = { incoming: { kind: "read" }, replies: ["a", "b", "c"] };
  assert.equal(calmChoice(step), 1);
});

test("E：打電動的晚上不累積已讀壓力，但隔天白天少回一則", () => {
  const story = longStories()[0];
  const day = 3;
  const chat = { ...normalChat(1, story), lastAdvancedDay: day - 1 };
  const base = at({ phase: "night", dayIndex: day, chats: [chat], nextChatId: 2 });
  assert.ok(isChatReady(chat, day, "night"));
  const played = act(base, {}, { type: "playGames" }).run;
  const slept = act(played, {}, { type: "sleep" }).run;
  assert.equal(slept.chats[0].stats?.pressure ?? 0, 0);
  assert.equal(slept.today.tired, true);
  const normal = act(base, {}, { type: "sleep" }).run;
  assert.equal(normal.chats[0].stats?.pressure, 1);
  assert.equal(dayReplyLimit({ ...slept, phase: "daytime" }), dayReplyLimit({ ...normal, phase: "daytime" }) - 1);
});

// ---------- F：節日與白天事件 ----------

test("F：節日落在真實日期；情侶節日配對率比較低，光棍節比較高", () => {
  const dayOf = (y: number, m: number, d: number) =>
    findDay((i) => {
      const c = calendarOf(i);
      return c.year === y && c.month === m && c.day === d;
    });
  assert.equal(holidayOf(dayOf(2026, 8, 19))?.id, "qixi");
  assert.equal(holidayOf(dayOf(2026, 12, 24))?.id, "christmas-eve");
  assert.equal(holidayOf(dayOf(2026, 11, 11))?.id, "singles-day");
  assert.equal(holidayOf(dayOf(2026, 5, 10))?.id, "mothers-day");
  assert.equal(calendarOf(dayOf(2026, 5, 10)).weekday, 0);
  assert.equal(holidayOf(dayOf(2026, 5, 11)), null);
  assert.ok(holidayMatchMult(dayOf(2026, 8, 19)) < 1);
  assert.ok(holidayMatchMult(dayOf(2026, 11, 11)) > 1);
  assert.equal(holidayMatchMult(dayOf(2026, 4, 1)), 1);
});

test("F：白天事件由 runSeed、dayIndex 決定，大約四分之一的日子有；發票日一定有", () => {
  let count = 0;
  for (let d = 0; d < 400; d++) {
    const e = dayEventOf(7, d);
    assert.deepEqual(dayEventOf(7, d), e);
    if (isInvoiceDay(d)) assert.ok(e?.id.startsWith("invoice"), `第 ${d} 天`);
    else if (e) count++;
    if (e && e.when !== "any") assert.equal(e.when === "weekend", isWeekend(d), e.id);
  }
  assert.ok(count > 60 && count < 140, `${count} 天`);
  for (const e of DAY_EVENTS) assert.ok(e.choices.length >= 1, e.id);
});

test("F：加班：拿加班費，下班直接回家，今晚不能滑", () => {
  const day = findDay((d) => {
    const e = dayEventOf(1, d);
    return e?.id === "overtime" && calendarOf(d).day !== 5;
  });
  let run = at({ phase: "daytime", dayIndex: day });
  const choice = todayEvent(run)!.choices.findIndex((c) => c.overtime);
  const r = act(run, {}, { type: "dayEvent", choice });
  assert.equal(r.run.money, run.money + OVERTIME_PAY);
  assert.equal(eventOf(r.events, "dayEvent")?.overtime, true);
  assert.equal(advance(r.run, {}, { type: "dayEvent", choice }).run, r.run, "一天只能選一次");
  run = act(r.run, {}, { type: "endDaytime" }).run;
  assert.equal(run.phase, "nightDone");
  assert.ok(!legalActions(run).includes("openApp"));
  run = act(run, {}, { type: "sleep" }).run;
  assert.equal(run.today.overtime, false);
});

test("F：跟同事去唱歌：晚餐吃過了，下班直接到深夜，還能滑", () => {
  const day = findDay((d) => dayEventOf(1, d)?.id === "karaoke" && calendarOf(d).day !== 5);
  let run = act(at({ phase: "daytime", dayIndex: day }), {}, { type: "dayEvent", choice: 0 }).run;
  assert.equal(run.today.outing, true);
  run = act(run, {}, { type: "endDaytime" }).run;
  assert.equal(run.phase, "night");
  assert.ok(legalActions(run).includes("openApp"));
  assert.deepEqual(parseRun(serializeRun(run))?.today, run.today);
  assert.equal(act(run, {}, { type: "sleep" }).run.today.outing, undefined);
});

test("F：颱風假白天多回兩則；錢不夠的選項不能選", () => {
  const day = findDay((d) => dayEventOf(1, d)?.id === "typhoon");
  const run = at({ phase: "daytime", dayIndex: day });
  assert.equal(dayReplyLimit(run), DAYTIME_REPLY_LIMIT + TYPHOON_REPLY_BONUS);
  const kday = findDay((d) => dayEventOf(1, d)?.id === "karaoke" && calendarOf(d).day !== 5);
  const broke = at({ phase: "daytime", dayIndex: kday, money: 100 });
  assert.equal(advance(broke, {}, { type: "dayEvent", choice: 0 }).run, broke);
  act(broke, {}, { type: "dayEvent", choice: 1 });
});

// ---------- 新遊戲＋ ----------

test("新遊戲＋：多一句開場白，有好感加成；一般局不能用；白天多回一則", () => {
  const girl = generateGirl(42);
  assert.equal(openerOptions(girl).length, 4);
  assert.equal(openerOptions(girl, true).length, 5);
  const plain = at({ phase: "matched", pendingMatchSeed: 42, deckIndex: 1 });
  assert.equal(advance(plain, {}, { type: "chooseOpener", opener: "memory" }).run, plain);
  const ng = { ...plain, ngPlus: true };
  const r = act(ng, {}, { type: "chooseOpener", opener: "memory" });
  assert.equal(r.run.chats[0].stats?.affection, 1);
  assert.equal(chatScore(r.run.chats[0]), 1);
  assert.equal(chatTranscript(r.run.chats[0], girl, 0)[0].who, "me");
  assert.equal(dayReplyLimit({ ...createRun(1, { ngPlus: true }) }), dayReplyLimit(createRun(1)) + 1);
});

// ---------- Iris ----------

test("Iris：走過任何結局之後才會出現；跟小晴不會排在同一張", () => {
  for (let day = 0; day < 100; day++) assert.equal(irisCardIndex(at({ dayIndex: day }), {}), null);
  let seen = 0;
  const unlocked: Dex = { ...ENDED, ...Object.fromEntries(STORIES.slice(0, 5).map((s) => [s.id, { count: 1, firstDayIndex: 0 }])) };
  for (let day = 0; day < 100; day++) {
    const run = at({ dayIndex: day });
    const i = irisCardIndex(run, ENDED);
    if (i === null) continue;
    seen++;
    assert.equal(deckCardSeed(run, ENDED, i), IRIS_SEED);
    const h = heroineCardIndex(run, unlocked);
    assert.ok(h === null || irisCardIndex(run, unlocked) !== h);
  }
  assert.ok(seen > 30 && seen < 70, `${seen} 晚`);
  assert.equal(irisCardIndex(at({ irisMet: true }), ENDED), null);
});

test("Iris：右滑一定配對，配對後一定走她的路線", () => {
  const day = findDay((d) => irisCardIndex(at({ dayIndex: d }), ENDED) !== null);
  const run = at({ phase: "swiping", dayIndex: day });
  const index = irisCardIndex(run, ENDED)!;
  const r = act({ ...run, deckIndex: index }, ENDED, { type: "swipe", dir: "right" }, NO_MATCH);
  assert.equal(r.run.pendingMatchSeed, IRIS_SEED);
  assert.equal(r.run.irisMet, true);
  const chat = act(r.run, ENDED, { type: "chooseOpener", opener: "hi" }).run.chats[0];
  assert.equal(chat.storyId, IRIS_STORY_ID);
});

test("Iris：路線資料合法；分數不夠走回「她先講了」", () => {
  for (const id of [IRIS_STORY_ID, IRIS_ALMOST_STORY_ID, IRIS_LEFT_STORY_ID, MIXUP_STORY_ID]) {
    assert.deepEqual(validateStory(STORY_BY_ID[id]), [], id);
  }
  assert.equal(datesForStory(IRIS_STORY_ID).length, 2);
  // 前四題都選 0 分以下：走回失敗
  const steps = STORY_BY_ID[IRIS_STORY_ID].steps as readonly ReplyStep[];
  let run = at({ phase: "night", irisMet: true, chats: [], nextChatId: 2 });
  let chat: Chat = { id: 1, girlSeed: IRIS_SEED, storyId: IRIS_STORY_ID, opener: "hi", stepIndex: 0, lastAdvancedDay: 0, replies: [] };
  run = { ...run, chats: [chat] };
  for (let i = 0; i < 4; i++) {
    const worst = steps[i].scores!.indexOf(-1);
    run = act({ ...run, dayIndex: i + 1, phase: "night" }, {}, { type: "reply", chatId: 1, choice: worst }).run;
  }
  chat = run.chats[0];
  assert.equal(chat.storyId, IRIS_ALMOST_STORY_ID);
});

test("Iris：連續兩晚已讀不回，睡一覺她就走了；回了就重算", () => {
  const chat: Chat = {
    id: 1,
    girlSeed: IRIS_SEED,
    storyId: IRIS_STORY_ID,
    opener: "hi",
    stepIndex: 0,
    lastAdvancedDay: 0,
    replies: [],
  };
  let run = at({ phase: "night", dayIndex: 1, irisMet: true, chats: [chat], nextChatId: 2 });
  run = act(run, {}, { type: "sleep" }).run;
  assert.equal(run.chats[0].stats?.pressure, 1);
  // 回了就歸零
  const replied = act({ ...run, phase: "night" }, {}, { type: "reply", chatId: 1, choice: 1 }).run;
  assert.equal(replied.chats[0].stats?.pressure, 0);
  // 再不回一晚就走了
  const r = act({ ...run, phase: "night" }, {}, { type: "sleep" });
  assert.equal(r.run.chats[0].closed, true);
  const ended = eventOf(r.events, "chatEnded");
  assert.equal(ended?.storyId, IRIS_LEFT_STORY_ID);
  assert.equal(ended?.girlSeed, IRIS_SEED);
  assert.equal(r.dex[IRIS_LEFT_STORY_ID].count, 1);
  assert.equal(IRIS_PATIENCE, 2);
});

test("Iris：好好聊、兩次約會之後走到結局，這一局結束", () => {
  let run = at({ phase: "night", dayIndex: 1, irisMet: true, money: 50_000, nextChatId: 2 });
  run = {
    ...run,
    chats: [{ id: 1, girlSeed: IRIS_SEED, storyId: IRIS_STORY_ID, opener: "interest", stepIndex: 0, lastAdvancedDay: 0, replies: [] }],
  };
  let dex: Dex = {};
  const story = STORY_BY_ID[IRIS_STORY_ID];
  let ended = false;
  for (let guard = 0; guard < 200 && !ended; guard++) {
    const chat = run.chats[0];
    const step = story.steps[chat.stepIndex] as ReplyStep;
    if (step.date) {
      if (legalActions({ ...run, phase: "daytime" }).includes("goOnDate")) {
        const r = act({ ...run, phase: "daytime" }, dex, { type: "goOnDate", choice: 0 });
        dex = r.dex;
        if (eventOf(r.events, "gameEnding")) {
          assert.equal(eventOf(r.events, "gameEnding")?.endingId, IRIS_ENDING_ID);
          ended = true;
          break;
        }
        run = r.run;
        continue;
      }
    } else if (isChatReady(chat, run.dayIndex, "night")) {
      const best = step.scores ? step.scores.indexOf(1) : 0;
      run = act({ ...run, phase: "night" }, dex, { type: "reply", chatId: 1, choice: best }).run;
      continue;
    }
    run = act({ ...run, phase: "night" }, dex, { type: "sleep" }).run;
    assert.ok(!run.chats[0].closed, "好好回的時候她不會走");
  }
  assert.ok(ended, "沒走到 Iris 的結局");
  assert.equal(endingProgress(dex).collected, 1);
});

// ---------- 成就 ----------

test("成就：累計次數從事件來；條件達成才解鎖，解過不會重複", () => {
  const counters = tallyEvents({}, [
    { type: "matched", girlSeed: 1 },
    { type: "dodged", girlSeed: 2 },
    { type: "calm", chatId: 1 },
    { type: "bought", item: "gold", price: GOLD_PRICE, line: "" },
    { type: "dayEvent", eventId: "overtime", choice: 0, money: 1, line: "", overtime: true },
    { type: "mixup", chatId: 1, toGirlSeed: 3 },
  ]);
  assert.deepEqual(counters, { matches: 1, dodged: 1, calm: 1, gold: 1, overtime: 1, mixups: 1 });
  const first = progressAchievements({}, {}, { run: createRun(1), dex: {}, events: [{ type: "matched", girlSeed: 1 }] }, 3);
  assert.deepEqual(first.unlocked.map((a) => a.id), ["first-match"]);
  assert.equal(first.achievements["first-match"], 3);
  const again = progressAchievements(first.counters, first.achievements, { run: createRun(1), dex: {}, events: [] }, 9);
  assert.deepEqual(again.unlocked, []);
  assert.equal(again.achievements["first-match"], 3);
});

test("成就：局面上的條件", () => {
  const ids = (run: RunState | null, dex: Dex = {}, events: GameEvent[] = []) =>
    earnedAchievements({ run, dex, counters: {}, events });
  assert.ok(ids(at({ dayIndex: 40, lastMatchDay: 5 })).includes("dry-spell"));
  assert.ok(!ids(at({ dayIndex: 20, lastMatchDay: 5 })).includes("dry-spell"));
  assert.ok(ids(at({ deckIndex: DECK_SIZE, nightLog: { rights: DECK_SIZE, matches: 0 } })).includes("ten-zero"));
  assert.ok(ids(at({ money: 120_000 })).includes("rich-alone"));
  assert.ok(ids(at({ ngPlus: true })).includes("ng-plus"));
  const qixi = findDay((d) => holidayOf(d)?.id === "qixi");
  assert.ok(ids(at({}), {}, [{ type: "slept", fromDay: qixi }]).includes("holiday-alone"));
  const all: Dex = Object.fromEntries(
    [LADYBUG_ENDING_ID, TRUE_ENDING_ID, IRIS_ENDING_ID].map((id) => [id, { count: 1, firstDayIndex: 0 }])
  );
  assert.ok(ids(null, all).includes("all-endings"));
  for (const a of ACHIEVEMENTS) assert.ok(a.name && a.hint && a.quip, a.id);
});

// ---------- 存檔 ----------

test("存檔：新欄位往返相等；舊存檔沒有新欄位也讀得進來", () => {
  const run: RunState = {
    ...createRun(5, { ngPlus: true }),
    dayIndex: 20,
    phase: "night",
    profile: { photo: "pro", bio: "stats" },
    grooming: { goldUntil: 30, haircutUntil: 25, outfit: true, proPhoto: true },
    today: { eventDone: true, overtime: false, tired: true },
    nightHobby: { solo: true, games: false, calm: true },
    irisMet: true,
    lastMatchDay: 12,
    nightLog: { rights: 3, matches: 1 },
  };
  assert.deepEqual(parseRun(serializeRun(run)), run);
  const old = JSON.parse(serializeRun(createRun(5)));
  for (const key of ["profile", "grooming", "today", "ngPlus", "irisMet", "lastMatchDay", "nightLog"]) delete old[key];
  old.nightHobby = { solo: true, games: false };
  old.dayIndex = 9;
  const parsed = parseRun(JSON.stringify(old))!;
  assert.deepEqual(checkInvariants(parsed), []);
  assert.deepEqual(parsed.profile, { photo: "selfie", bio: "honest" });
  assert.equal(parsed.nightHobby.calm, false);
  assert.equal(parsed.lastMatchDay, 9);
});

test("存檔：壞資料不會當機，還沒拍的照片、一般局的上一輪開場白會被修掉", () => {
  const raw = JSON.parse(serializeRun(createRun(5)));
  raw.profile = { photo: "pro", bio: "nope" };
  raw.grooming = { goldUntil: -3, haircutUntil: "x", outfit: 1, proPhoto: false };
  raw.lastMatchDay = 999;
  raw.nightLog = { rights: 50, matches: 99 };
  raw.chats = [{ id: 1, girlSeed: 5, storyId: STORIES[0].id, opener: "memory", stepIndex: 0, lastAdvancedDay: 0, replies: [] }];
  const parsed = parseRun(JSON.stringify(raw))!;
  assert.deepEqual(checkInvariants(parsed), []);
  assert.equal(parsed.profile.photo, "selfie");
  assert.equal(parsed.chats[0].opener, "hi");
  assert.deepEqual(parsed.grooming, DEFAULT_GROOMING);
});

test("存檔：成就和累計次數留得住，亂寫的 id 不會", () => {
  const meta = { ...blankMeta(), counters: { dodged: 3 }, achievements: { "first-match": 4 } };
  const parsed = parseMeta(serializeMeta(meta));
  assert.deepEqual(parsed.counters, { dodged: 3 });
  assert.deepEqual(parsed.achievements, { "first-match": 4 });
  const bad = parseMeta(
    JSON.stringify({ v: 1, dex: { [IRIS_ENDING_ID]: { count: 1, firstDayIndex: 0 } }, counters: { nope: 1, calm: -1 }, achievements: { nope: 1, ["__proto__"]: 1, gold: "x" } })
  );
  assert.deepEqual(bad.counters, {});
  assert.deepEqual(Object.keys(bad.achievements), ["gold"]);
  assert.ok(Object.hasOwn(bad.dex, IRIS_ENDING_ID));
  assert.deepEqual(parseMeta(null).achievements, {});
});
