import { test } from "node:test";
import assert from "node:assert/strict";
import { calendarOf, isPhoneChatDay } from "./calendar.ts";
import { LADYBUG_COST, LADYBUG_ENDING_ID, START_MONEY } from "./constants.ts";
import { dexProgress } from "./dex.ts";
import { advance, checkInvariants, createRun, legalActions, settleRun } from "./game.ts";
import type { RunState } from "./game.ts";
import { deckSeed, generateGirl } from "./girl.ts";
import { LADYBUG_BEATS } from "./ladybug.ts";
import { blankMeta, parseMeta, parseRun, serializeMeta, serializeRun } from "./save.ts";
import { SPECIAL_STORIES, STORIES, STORY_BY_ID } from "./stories/index.ts";
import { storyWeights, validateStory } from "./story.ts";
import type { Chat } from "./storyTypes.ts";

const STUDIO = "studio";
function nextPhoneDay(from: number): number {
  let d = from;
  while (!isPhoneChatDay(calendarOf(d))) d++;
  return d;
}

const forceMatch = () => () => 0;

/** 找一個第一張牌就是個工的局 */
function studioRun(): RunState {
  for (let seed = 1; seed < 5000; seed++) {
    if (generateGirl(deckSeed(seed, 0, 0)).studio) return { ...createRun(seed), phase: "swiping" };
  }
  throw new Error("找不到個工");
}

function matchStudio(): RunState {
  const swiped = advance(studioRun(), {}, { type: "swipe", dir: "right" }, forceMatch).run;
  return advance(swiped, {}, { type: "chooseOpener", opener: "hi" }).run;
}

/** 直接把聊天擺到抉擇那一步，當天可以回 */
function atDecision(money = START_MONEY): { run: RunState; chat: Chat; decisionStep: number } {
  const run = matchStudio();
  const story = STORY_BY_ID[STUDIO];
  const decisionStep = story.steps.findIndex((s) => "decision" in s);
  const day = nextPhoneDay(Math.max(1, run.dayIndex));
  const chat: Chat = {
    ...run.chats[0],
    stepIndex: decisionStep,
    replies: Array(decisionStep).fill(0),
    lastAdvancedDay: day - 1,
  };
  return { run: { ...run, dayIndex: day, phase: "daytime", money, chats: [chat] }, chat, decisionStep };
}

function decisionChoice(): number {
  const step = STORY_BY_ID[STUDIO].steps.find((s) => "decision" in s);
  assert.ok(step && "decision" in step && step.decision);
  return step.decision.choice;
}

test("個工的卡片：大約 5%，一樣是成年人，工作寫個人工作室", () => {
  let count = 0;
  const total = 20000;
  for (let seed = 0; seed < total; seed++) {
    const g = generateGirl(seed);
    assert.ok(g.age >= 22 && g.age <= 38, `年齡 ${g.age}`);
    if (g.studio) {
      count++;
      assert.equal(g.job, "個人工作室");
    } else {
      assert.notEqual(g.job, "個人工作室");
    }
  }
  const rate = count / total;
  assert.ok(rate > 0.03 && rate < 0.07, `比例 ${rate}`);
});

test("個工路線的劇情資料合法，不算進 27 種失敗，也不會被隨機抽到", () => {
  assert.equal(STORIES.length, Object.values({ghost:7,fade:9,pitch:9,quick:8}).reduce((s,n)=>s+n,0));
  assert.ok(SPECIAL_STORIES.some((s) => s.id === STUDIO));
  for (const s of SPECIAL_STORIES) assert.deepEqual(validateStory(s), []);
  for (const s of STORIES) assert.ok(!SPECIAL_STORIES.includes(s));
  assert.ok(!storyWeights("hi", {}, []).some((w) => w.item.id === STUDIO));
  assert.equal(STORY_BY_ID[STUDIO].id, STUDIO);
  assert.equal(dexProgress({}).total, STORIES.length);
});

test("抉擇那一步就是 1h2s 3000，選項裡有去也有不去", () => {
  const story = STORY_BY_ID[STUDIO];
  const i = story.steps.findIndex((s) => "decision" in s);
  assert.ok(i >= 0);
  const step = story.steps[i];
  assert.ok("replies" in step && "text" in step.incoming);
  assert.match(step.incoming.text, /1h2s/);
  assert.match(step.incoming.text, /3000/);
  assert.ok(step.replies.length >= 2);
  assert.equal(LADYBUG_COST, 3000);
  // 前面要先認真聊過，至少有被問到有沒有經驗
  const before = story.steps.slice(0, i).map((s) => ("text" in s.incoming ? s.incoming.text : "")).join("");
  assert.ok(i >= 3, `才聊 ${i} 步`);
  assert.match(before, /經驗/);
});

test("個工幾乎秒配：右滑時就算一般機率配不到，還是會配到", () => {
  const run = studioRun();
  const r = advance(run, {}, { type: "swipe", dir: "right" }, () => () => 0.5);
  assert.equal(r.run.phase, "matched");
  // 左滑就不會
  assert.notEqual(advance(run, {}, { type: "swipe", dir: "left" }, forceMatch).run.phase, "matched");
});

test("跟個工配對後走的一定是個工路線，同時只會有一條", () => {
  const run = matchStudio();
  assert.equal(run.chats[0].storyId, STUDIO);
  const second: RunState = { ...run, phase: "matched", pendingMatchSeed: run.chats[0].girlSeed };
  const after = advance(second, {}, { type: "chooseOpener", opener: "hi" }).run;
  assert.notEqual(after.chats[1].storyId, STUDIO);
});

test("選去：扣 3000、聊天結束、記到圖鑑、發出結局事件", () => {
  const { run, chat } = atDecision();
  const r = advance(run, {}, { type: "reply", chatId: chat.id, choice: decisionChoice() });
  assert.equal(r.run.money, START_MONEY - LADYBUG_COST);
  assert.equal(r.run.chats.length, 0);
  assert.deepEqual(checkInvariants(r.run), []);
  assert.equal(r.dex[LADYBUG_ENDING_ID].count, 1);
  assert.deepEqual(
    r.events.find((e) => e.type === "gameEnding"),
    { type: "gameEnding", endingId: LADYBUG_ENDING_ID }
  );
});

for (const phase of ["daytime", "night", "nightDone"] as const) {
  test(`選去會結束這一局（${phase}）：沒有可以存的 run，圖鑑留著`, () => {
    const { run, chat } = atDecision();
    const r = advance({ ...run, phase }, {}, { type: "reply", chatId: chat.id, choice: decisionChoice() });
    assert.equal(settleRun(r), null);
    // 存回去再讀出來：這一局不見了，圖鑑還在
    const meta = parseMeta(serializeMeta({ ...blankMeta(), dex: r.dex }));
    assert.equal(meta.dex[LADYBUG_ENDING_ID].count, 1);
  });
}

test("從配對一路聊到 1h2s 再選去：這一局結束，身上還有別的聊天也一樣", () => {
  const story = STORY_BY_ID[STUDIO];
  const decisionStep = story.steps.findIndex((s) => "decision" in s);
  let run = matchStudio();
  let dex = {};
  // 還在聊的另一個人不能讓這一局活下來
  const other: Chat = { ...run.chats[0], id: 99, storyId: STORIES[0].id, lastAdvancedDay: 0 };
  run = { ...run, phase: "daytime", chats: [...run.chats, other], dayReplies: 0 };
  const chatId = run.chats[0].id;
  for (let i = 0; i < decisionStep; i++) {
    run = { ...run, dayIndex: nextPhoneDay(run.dayIndex + 1), dayReplies: 0 };
    const r = advance(run, dex, { type: "reply", chatId, choice: 0 });
    assert.notEqual(r.run, run);
    assert.notEqual(settleRun(r), null, `還沒到抉擇就結束了（第 ${i} 步）`);
    run = r.run;
    dex = r.dex;
  }
  run = { ...run, dayIndex: nextPhoneDay(run.dayIndex + 1), dayReplies: 0 };
  const end = advance(run, dex, { type: "reply", chatId, choice: decisionChoice() });
  assert.equal(end.run.chats.length, 1);
  assert.equal(settleRun(end), null);
  assert.equal(end.dex[LADYBUG_ENDING_ID].count, 1);
});

test("沒有走到結局的動作，這一局都還在", () => {
  const { run, chat } = atDecision();
  const refuse = advance(run, {}, { type: "reply", chatId: chat.id, choice: decisionChoice() === 0 ? 1 : 0 });
  assert.equal(settleRun(refuse), refuse.run);
  assert.deepEqual(parseRun(serializeRun(refuse.run)), refuse.run);

  // 錢不夠，選去不算數
  const poor = atDecision(LADYBUG_COST - 1);
  const denied = advance(poor.run, {}, { type: "reply", chatId: poor.chat.id, choice: decisionChoice() });
  assert.equal(settleRun(denied), poor.run);
});

test("錢不夠就去不了：動作不合法，回傳同一個 run", () => {
  const { run, chat } = atDecision(LADYBUG_COST - 1);
  const r = advance(run, {}, { type: "reply", chatId: chat.id, choice: decisionChoice() });
  assert.equal(r.run, run);
  assert.deepEqual(r.events, []);
});

test("剛好 3000 可以去，扣到 0", () => {
  const { run, chat } = atDecision(LADYBUG_COST);
  assert.equal(advance(run, {}, { type: "reply", chatId: chat.id, choice: decisionChoice() }).run.money, 0);
});

test("選不去：不扣錢，隔天收到結尾，收起來記一筆隱藏失敗，不影響 27 種的進度", () => {
  const { run, chat, decisionStep } = atDecision();
  const refuse = decisionChoice() === 0 ? 1 : 0;
  const r = advance(run, {}, { type: "reply", chatId: chat.id, choice: refuse });
  assert.equal(r.run.money, START_MONEY);
  assert.equal(r.run.chats[0].stepIndex, decisionStep + 1);
  assert.ok(!r.events.some((e) => e.type === "gameEnding"));
  assert.ok(!Object.hasOwn(r.dex, LADYBUG_ENDING_ID));

  const next: RunState = { ...r.run, dayIndex: nextPhoneDay(run.dayIndex + 1), dayReplies: 0 };
  assert.ok(legalActions(next).includes("closeChat"));
  const closed = advance(next, r.dex, { type: "closeChat", chatId: chat.id });
  assert.equal(closed.dex[STUDIO].count, 1);
  assert.equal(closed.run.chats.length, 0);
  assert.equal(dexProgress(closed.dex).collected, 0);
});

test("存檔：結局和隱藏失敗都留得住，亂寫的 id 不會", () => {
  const meta = {
    v: 1 as const,
    introSeen: true,
    graduationSeen: false,
    dex: {
      [LADYBUG_ENDING_ID]: { count: 2, firstDayIndex: 9 },
      [STUDIO]: { count: 1, firstDayIndex: 3 },
      nope: { count: 1, firstDayIndex: 0 },
    },
  };
  const parsed = parseMeta(serializeMeta(meta));
  assert.deepEqual(parsed.dex[LADYBUG_ENDING_ID], { count: 2, firstDayIndex: 9 });
  assert.deepEqual(parsed.dex[STUDIO], { count: 1, firstDayIndex: 3 });
  assert.ok(!Object.hasOwn(parsed.dex, "nope"));
});

test("結局腳本：每段都有文字，最後一段是片名，不含露骨字眼", () => {
  assert.ok(LADYBUG_BEATS.length >= 5);
  for (const b of LADYBUG_BEATS) assert.ok(b.text.trim().length > 0);
  assert.equal(LADYBUG_BEATS.at(-1)?.scene, "title");
  assert.match(LADYBUG_BEATS.at(-1)?.text ?? "", /瓢蟲結局/);
  const all = LADYBUG_BEATS.map((b) => b.text).join("");
  assert.match(all, /風俗/);
  assert.ok(!/脫|胸|裸|床上|高潮|插|射/.test(all), "結局不寫露骨內容");
});
