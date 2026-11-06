import { test } from "node:test";
import assert from "node:assert/strict";
import { HEROINE_DATE_COSTS, HEROINE_SEED, LADYBUG_COST, LADYBUG_ENDING_ID, TRUE_ENDING_ID } from "./constants.ts";
import type { Dex } from "./dex.ts";
import { advance, checkInvariants, createRun, heroineCardIndex, legalActions } from "./game.ts";
import type { GameAction, GameEvent, Phase, RunState } from "./game.ts";
import { createRng, pick, randInt } from "./rng.ts";
import { parseRun, serializeRun } from "./save.ts";
import { HEROINE_STORY_ID, STORIES, STORY_BY_ID, STUDIO_STORY_ID } from "./stories/index.ts";
import { chatTranscript, comebackChat, isChatReady, isFinal, readyChats, visibleChats } from "./story.ts";
import { generateGirl } from "./girl.ts";
import type { Chat, ReplyStep, Story } from "./storyTypes.ts";

const NIGHT_PHASES: readonly Phase[] = ["night", "nightDone"];
const CLOSED_PHASES: readonly Phase[] = ["payday", "evening", "swiping", "matched"];

const replyStory = () => {
  const story = STORIES.find((s) => s.steps.length >= 3 && !isFinal(s.steps[0]) && !s.steps[0].wait);
  assert.ok(story);
  return story;
};

const chatOf = (story: Story, patch: Partial<Chat> = {}): Chat => ({
  id: 1,
  girlSeed: 7,
  storyId: story.id,
  opener: "hi",
  stepIndex: 0,
  lastAdvancedDay: 0,
  replies: [],
  ...patch,
});

const finalChat = (story: Story): Chat => {
  const stepIndex = story.steps.length - 1;
  return chatOf(story, { stepIndex, replies: new Array<number>(stepIndex).fill(0) });
};

/** 第 30 天某個階段的狀態，聊天都已經等滿 */
const at = (phase: Phase, chats: Chat[], patch: Partial<RunState> = {}): RunState => ({
  ...createRun(1),
  phase,
  dayIndex: 32, // 週五：平日可回訊息
  chats,
  nextChatId: chats.reduce((max, c) => Math.max(max, c.id), 0) + 1,
  pendingMatchSeed: phase === "matched" ? 123 : null,
  ...patch,
});

function act(run: RunState, dex: Dex, action: GameAction) {
  const r = advance(run, dex, action);
  assert.notEqual(r.run, run, `${run.phase} 的 ${action.type} 應該合法`);
  assert.deepEqual(checkInvariants(r.run), []);
  return r;
}

// ---------- 什麼時候能回 ----------

test("晚上和滑完之後都可以回訊息，而且不會改變階段", () => {
  for (const phase of NIGHT_PHASES) {
    const run = at(phase, [chatOf(replyStory())]);
    assert.ok(legalActions(run).includes("reply"), phase);
    const r = act(run, {}, { type: "reply", chatId: 1, choice: 1 });
    assert.equal(r.run.phase, phase);
    assert.equal(r.run.dayIndex, 32);
    assert.equal(r.run.chats[0].stepIndex, 1);
    assert.equal(r.run.chats[0].lastAdvancedDay, 32);
    assert.deepEqual(r.run.chats[0].replies, [1]);
    assert.deepEqual(r.events, [{ type: "chatAdvanced", chatId: 1 }]);
  }
});

test("晚上回完還是可以打開 Swipy 或去睡覺", () => {
  const replied = act(at("night", [chatOf(replyStory())]), {}, { type: "reply", chatId: 1, choice: 0 }).run;
  assert.deepEqual([...legalActions(replied)].sort(), ["buy", "editProfile", "jerkOff", "openApp", "playGames", "sleep"]);
  assert.equal(act(replied, {}, { type: "openApp" }).run.phase, "swiping");
  assert.equal(act(replied, {}, { type: "sleep" }).run.dayIndex, 33);
});

test("晚上也可以看完結局，圖鑑和花費都跟白天一樣", () => {
  const story = STORIES.find((s) => {
    const last = s.steps[s.steps.length - 1];
    return isFinal(last) && (last.ending.cost ?? 0) > 0;
  });
  assert.ok(story);
  const chat = finalChat(story);
  for (const phase of NIGHT_PHASES) {
    const run = at(phase, [chat], { money: 100_000 });
    assert.ok(legalActions(run).includes("closeChat"), phase);
    const night = act(run, {}, { type: "closeChat", chatId: 1 });
    const day = act({ ...run, phase: "daytime" }, {}, { type: "closeChat", chatId: 1 });
    assert.deepEqual(night.events, day.events);
    assert.deepEqual(night.dex, day.dex);
    assert.equal(night.run.money, day.run.money);
    assert.equal(night.run.chats.length, 1);
    assert.equal(night.run.chats[0].closed, true);
    assert.equal(night.run.phase, phase);
  }
});

test("領薪通知、吃飯、滑卡和配對畫面中不能回", () => {
  const story = replyStory();
  for (const phase of CLOSED_PHASES) {
    for (const [chat, action] of [
      [chatOf(story), { type: "reply", chatId: 1, choice: 0 }],
      [finalChat(story), { type: "closeChat", chatId: 1 }],
    ] as const) {
      const run = at(phase, [chat], phase === "evening" ? { offeredMealId: "x" } : {});
      assert.ok(!legalActions(run).includes("reply"), phase);
      assert.ok(!legalActions(run).includes("closeChat"), phase);
      assert.equal(advance(run, {}, action).run, run, phase);
    }
  }
});

test("沒有等滿的、不合法的回覆，晚上一樣不接受", () => {
  const story = replyStory();
  const waiting = at("night", [chatOf(story, { lastAdvancedDay: 32 })]);
  assert.deepEqual([...legalActions(waiting)].sort(), ["buy", "editProfile", "jerkOff", "openApp", "playGames", "sleep"]);
  assert.equal(advance(waiting, {}, { type: "reply", chatId: 1, choice: 0 }).run, waiting);
  const ready = at("nightDone", [chatOf(story)]);
  for (const action of [
    { type: "reply", chatId: 99, choice: 0 },
    { type: "reply", chatId: 1, choice: -1 },
    { type: "closeChat", chatId: 1 },
  ] as const) {
    assert.equal(advance(ready, {}, action).run, ready);
  }
});

// ---------- 節奏 ----------

test("每個聊天每天還是只推進一步：白天回過，晚上不能再回", () => {
  const replied = act(at("daytime", [chatOf(replyStory())]), {}, { type: "reply", chatId: 1, choice: 0 }).run;
  const night = { ...replied, phase: "night" as const };
  assert.ok(!isChatReady(night.chats[0], night.dayIndex, "night"));
  assert.equal(advance(night, {}, { type: "reply", chatId: 1, choice: 0 }).run, night);
});

test("晚上回過，要隔天才有下一步；隔天白天就接得上", () => {
  const story = replyStory();
  const replied = act(at("night", [chatOf(story)]), {}, { type: "reply", chatId: 1, choice: 0 }).run;
  assert.equal(advance(replied, {}, { type: "reply", chatId: 1, choice: 0 }).run, replied);
  const morning = act(replied, {}, { type: "sleep" }).run;
  assert.ok(isChatReady(morning.chats[0], morning.dayIndex));
  const again = act({ ...morning, phase: "daytime" }, {}, { type: "reply", chatId: 1, choice: 0 }).run;
  assert.equal(again.chats[0].stepIndex, 2);
});

test("今晚才配對的人，要等到隔天才有回覆", () => {
  const swiping = at("matched", [], { pendingMatchSeed: 123, deckIndex: 10 });
  const run = act(swiping, {}, { type: "chooseOpener", opener: "hi" }).run;
  assert.equal(run.phase, "nightDone");
  assert.deepEqual(readyChats(run.chats, run.dayIndex), []);
  assert.deepEqual(legalActions(run), ["editProfile", "buy", "sleep"]);
});

test("白天回和晚上回，走出來的對話紀錄完全相同", () => {
  const story = replyStory();
  const girl = generateGirl(7);
  const play = (phase: Phase) => {
    let run = at(phase, [chatOf(story)]);
    for (let i = 0; i < story.steps.length - 1; i++) {
      run = advance(run, {}, { type: "reply", chatId: 1, choice: 0 }).run;
      run = { ...run, dayIndex: run.dayIndex + 8, phase };
    }
    return run.chats[0];
  };
  const day = play("daytime");
  assert.equal(day.stepIndex, story.steps.length - 1);
  assert.deepEqual(chatTranscript(play("night"), girl, 200), chatTranscript(day, girl, 200));
});

// ---------- 存檔 ----------

test("沒有這個功能時留下的存檔：讀進來在深夜就能回，不需要新欄位", () => {
  const story = replyStory();
  const parsed = parseRun(JSON.stringify(at("nightDone", [chatOf(story)])));
  assert.ok(parsed);
  assert.equal(parsed.phase, "nightDone");
  assert.deepEqual(Object.keys(parsed).sort(), Object.keys(createRun(1)).sort());
  assert.equal(act(parsed, {}, { type: "reply", chatId: 1, choice: 0 }).run.chats[0].stepIndex, 1);
});

test("晚上回完存檔再讀回來，今天不能回第二次", () => {
  const replied = act(at("night", [chatOf(replyStory())]), {}, { type: "reply", chatId: 1, choice: 0 }).run;
  const reloaded = parseRun(serializeRun(replied));
  assert.deepEqual(reloaded, replied);
  assert.ok(reloaded);
  assert.equal(advance(reloaded, {}, { type: "reply", chatId: 1, choice: 0 }).run, reloaded);
});

// ---------- 個工路線 ----------

test("個工那題晚上也能回：去了走瓢蟲結局，錢不夠不能去", () => {
  const story = STORY_BY_ID[STUDIO_STORY_ID];
  const stepIndex = story.steps.findIndex((s) => "decision" in s);
  const { choice } = (story.steps[stepIndex] as ReplyStep).decision ?? { choice: -1 };
  const chat = chatOf(story, { stepIndex, replies: new Array<number>(stepIndex).fill(0) });

  const rich = at("night", [chat], { money: LADYBUG_COST });
  const r = act(rich, {}, { type: "reply", chatId: 1, choice });
  assert.deepEqual(r.events, [{ type: "gameEnding", endingId: LADYBUG_ENDING_ID }]);
  assert.equal(r.run.money, 0);
  assert.equal(r.dex[LADYBUG_ENDING_ID].count, 1);

  const poor = at("night", [chat], { money: LADYBUG_COST - 1 });
  assert.equal(advance(poor, {}, { type: "reply", chatId: 1, choice }).run, poor);
});

// ---------- 小晴路線 ----------

const HEROINE = STORY_BY_ID[HEROINE_STORY_ID];
const heroineChat = (stepIndex: number, patch: Partial<Chat> = {}): Chat =>
  chatOf(HEROINE, {
    girlSeed: HEROINE_SEED,
    stepIndex,
    replies: new Array<number>(stepIndex).fill(0),
    ...patch,
  });
const FAKE_STEP = HEROINE.steps.findIndex((s) => "fakeEnding" in s);

test("小晴例外：白天回過，晚上还能再推一步", () => {
  const run = at("daytime", [heroineChat(0)], { heroineMet: true });
  const replied = act(run, {}, { type: "reply", chatId: 1, choice: 0 }).run;
  assert.equal(replied.chats[0].stepIndex, 1);
  assert.ok(!isChatReady(replied.chats[0], replied.dayIndex, "daytime"), "白天不能連回兩步");
  const night = { ...replied, phase: "night" as const };
  assert.ok(isChatReady(night.chats[0], night.dayIndex, "night"), "晚上可以再回小晴");
  const again = act(night, {}, { type: "reply", chatId: 1, choice: 0 }).run;
  assert.equal(again.chats[0].stepIndex, 2);
  assert.equal(again.phase, "night");
});

const UNLOCKED: Dex = Object.fromEntries(STORIES.slice(0, 10).map((s) => [s.id, { count: 1, firstDayIndex: 0 }]));

test("假失敗在晚上演：不記圖鑑、聊天留著、當晚消失，隔天早上她回來", () => {
  const chat = heroineChat(FAKE_STEP);
  const run = at("night", [chat], { heroineMet: true });
  const r = act(run, UNLOCKED, { type: "reply", chatId: 1, choice: 0 });
  assert.equal(r.events.filter((e) => e.type === "fakeEnding").length, 1);
  assert.deepEqual(r.dex, UNLOCKED);
  assert.equal(r.run.chats.length, 1);
  assert.deepEqual(visibleChats(r.run.chats, r.run.dayIndex), [], "當晚她要從手機上消失");
  assert.equal(comebackChat(r.run.chats, r.run.dayIndex), null);
  const morning = act(r.run, r.dex, { type: "sleep" }).run;
  assert.equal(comebackChat(morning.chats, morning.dayIndex)?.id, 1, "隔天早上一定會收到她的訊息");
});

test("假失敗第三句晚上回完，當晚就能按「……就這樣了」", () => {
  const run = at("night", [heroineChat(FAKE_STEP - 1)], { heroineMet: true });
  const replied = act(run, {}, { type: "reply", chatId: 1, choice: 0 }).run;
  assert.ok(isChatReady(replied.chats[0], replied.dayIndex));
  const r = act(replied, {}, { type: "reply", chatId: 1, choice: 0 });
  assert.ok(r.events.some((e) => e.type === "fakeEnding"));
});

test("約會還是只有週末白天能去，晚上只回得了訊息", () => {
  const dateStep = HEROINE.steps.findIndex((s) => "date" in s && s.date);
  // 第 5 天是週六，晚上不能赴約，也不能拿回訊息繞過約會
  const run = at("night", [heroineChat(dateStep)], { dayIndex: 5, heroineMet: true });
  assert.deepEqual([...legalActions(run)].sort(), ["buy", "editProfile", "jerkOff", "openApp", "playGames", "sleep"]);
  assert.equal(advance(run, {}, { type: "goOnDate", choice: 0 }).run, run);
  assert.equal(advance(run, {}, { type: "reply", chatId: 1, choice: 0 }).run, run);
});

test("分數門檻晚上一樣有效：分數不夠就走回失敗", () => {
  const gateStep = HEROINE.steps.findIndex((s) => "gate" in s && s.gate);
  const worst = (i: number) => (HEROINE.steps[i] as ReplyStep).scores?.indexOf(-1) ?? 0;
  const replies = Array.from({ length: gateStep }, (_, i) => worst(i));
  const run = at("night", [heroineChat(gateStep, { replies })], { heroineMet: true });
  const next = act(run, {}, { type: "reply", chatId: 1, choice: worst(gateStep) }).run;
  assert.equal(next.chats[0].storyId, (HEROINE.steps[gateStep] as ReplyStep).gate?.failStoryId);
});

/** 白天除了赴約和她回來那一刻，什麼都不回，訊息全部留到晚上 */
function playAllRepliesAtNight(seed: number) {
  let dex = UNLOCKED;
  let run = createRun(seed);
  const all: { event: GameEvent; phase: Phase }[] = [];
  const step = (action: GameAction) => {
    const phase = run.phase;
    const r = act(run, dex, action);
    run = r.run;
    dex = r.dex;
    all.push(...r.events.map((event) => ({ event, phase })));
  };
  const bestReply = (chat: Chat) => {
    const current = HEROINE.steps[chat.stepIndex] as ReplyStep;
    step({ type: "reply", chatId: chat.id, choice: current.scores ? current.scores.indexOf(1) : 0 });
  };
  for (let guard = 0; guard < 20_000 && !all.some((e) => e.event.type === "gameEnding"); guard++) {
    const chat = run.chats.find((c) => c.girlSeed === HEROINE_SEED);
    switch (run.phase) {
      case "payday":
        step({ type: "ackPayday" });
        break;
      case "daytime": {
        // 畫面上她回來時會直接蓋住白天，不回不能往下走
        const returning = comebackChat(run.chats, run.dayIndex);
        if (returning) bestReply(returning);
        else if (legalActions(run).includes("goOnDate")) step({ type: "goOnDate", choice: 0 });
        else step({ type: "endDaytime" });
        break;
      }
      case "evening":
        step({ type: "goHome" });
        break;
      case "night":
      case "nightDone":
        if (chat && isChatReady(chat, run.dayIndex)) bestReply(chat);
        else if (run.phase === "night" && !run.heroineMet) step({ type: "openApp" });
        else step({ type: "sleep" });
        break;
      case "swiping":
        step({ type: "swipe", dir: heroineCardIndex(run, dex) === run.deckIndex ? "right" : "left" });
        break;
      case "matched":
        step({ type: "chooseOpener", opener: "interest" });
        break;
    }
  }
  return { run, dex, all };
}

test("所有訊息都留到晚上回，還是走得到真結局：約會金額正確，假失敗在晚上演", () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const { run, dex, all } = playAllRepliesAtNight(seed);
    assert.ok(all.some((e) => e.event.type === "gameEnding"), `seed ${seed} 走不到真結局`);
    assert.equal(dex[TRUE_ENDING_ID].count, 1);
    assert.deepEqual(
      all.flatMap((e) => (e.event.type === "dateFinished" ? [e.event.cost] : [])),
      [...HEROINE_DATE_COSTS]
    );
    const fake = all.filter((e) => e.event.type === "fakeEnding");
    assert.equal(fake.length, 1);
    assert.ok(NIGHT_PHASES.includes(fake[0].phase));
    assert.ok(
      all.some((e) => e.event.type === "chatAdvanced" && NIGHT_PHASES.includes(e.phase)),
      "要真的在晚上回過"
    );
    assert.equal(run.chats.length, 0);
  }
});

// ---------- 模糊測試 ----------

test("模糊測試：只在晚上回訊息，不變量永遠成立，晚上真的回得到訊息也看得到結局", () => {
  let nightReplies = 0;
  let nightEndings = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const rng = createRng(seed);
    let run = createRun(seed);
    let dex: Dex = {};
    for (let i = 0; i < 3000; i++) {
      const where = `seed ${seed} 第 ${i} 步（${run.phase}）`;
      // 這裡只測晚上回訊息；買東西、改檔案、白天事件有自己的測試
      const legal = legalActions(run).filter(
        (t) =>
          (run.phase !== "daytime" || (t !== "reply" && t !== "closeChat")) &&
          t !== "buy" &&
          t !== "editProfile" &&
          t !== "dayEvent"
      );
      assert.ok(legal.length > 0, where);
      // 偏向先回訊息；白天的回覆動作上面已經濾掉
      const type = legal.includes("closeChat") ? "closeChat" : legal.includes("reply") ? "reply" : pick(rng, legal);
      const ready = readyChats(run.chats, run.dayIndex, run.phase);
      const stepOf = (c: Chat) => STORY_BY_ID[c.storyId].steps[c.stepIndex];
      let action: GameAction;
      if (type === "reply") {
        const candidates = ready.filter((c) => !isFinal(stepOf(c)));
        if (candidates.length === 0) {
          action = { type: pick(rng, legal.filter((t) => t !== "reply" && t !== "closeChat")) } as GameAction;
        } else {
          const chat = pick(rng, candidates);
          const options = (stepOf(chat) as ReplyStep).replies.length;
          action = { type, chatId: chat.id, choice: randInt(rng, 0, options - 1) };
          nightReplies++;
        }
      } else if (type === "closeChat") {
        const finals = ready.filter((c) => isFinal(stepOf(c)));
        if (finals.length === 0) {
          action = { type: pick(rng, legal.filter((t) => t !== "closeChat")) } as GameAction;
        } else {
          action = { type, chatId: pick(rng, finals).id };
          nightEndings++;
        }
      } else if (type === "deleteChat") {
        const closed = run.chats.filter((c) => c.closed);
        if (closed.length === 0) {
          action = { type: pick(rng, legal.filter((t) => t !== "deleteChat")) } as GameAction;
        } else {
          action = { type, chatId: pick(rng, closed).id };
        }
      } else if (type === "swipe") {
        action = { type, dir: rng() < 0.3 ? "left" : "right" };
      } else if (type === "chooseOpener") {
        action = { type, opener: pick(rng, ["hi", "whatsup", "eaten", "interest"] as const) };
      } else if (type === "goOnDate") {
        action = { type, choice: 0 };
      } else {
        action = { type } as GameAction;
      }
      const r = advance(run, dex, action);
      assert.notEqual(r.run, run, `${where} ${action.type} 列為合法卻沒有作用`);
      assert.deepEqual(checkInvariants(r.run), [], where);
      // 瓢蟲結局之後這一局就結束了，換新的一局
      run = r.events.some((e) => e.type === "gameEnding") ? createRun(seed + i) : r.run;
      dex = r.dex;
    }
  }
  assert.ok(nightReplies > 0 && nightEndings > 0, `晚上回了 ${nightReplies} 次、結局 ${nightEndings} 次`);
});

test("小晴白天回過、晚上加成那一步：對話紀錄要帶 phase，她的訊息和選項一起出現", () => {
  const day = 10;
  const chat: Chat = {
    id: 1,
    girlSeed: HEROINE_SEED,
    storyId: HEROINE_STORY_ID,
    opener: "memory",
    stepIndex: 1,
    lastAdvancedDay: day,
    replies: [1],
  };
  const girl = generateGirl(HEROINE_SEED);
  const step = STORY_BY_ID[HEROINE_STORY_ID].steps[1];
  const text = "text" in step.incoming ? step.incoming.text : "";
  assert.ok(isChatReady(chat, day, "night"), "晚上加成：可以回");
  const night = chatTranscript(chat, girl, day, "night");
  assert.ok(night.some((l) => l.who === "her" && l.text === text), "晚上看得到她這一步的訊息");
  // 白天同一天還不能回，也不顯示
  assert.ok(!isChatReady(chat, day, "daytime"));
  assert.ok(!chatTranscript(chat, girl, day, "daytime").some((l) => l.who === "her" && l.text === text));
});
