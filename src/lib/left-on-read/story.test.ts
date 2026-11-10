import { test } from "node:test";
import assert from "node:assert/strict";
import { calendarOf, isPhoneChatDay } from "./calendar.ts";
import type { Dex } from "./dex.ts";
import { FRESH_TODAY, advance, createRun } from "./game.ts";
import type { GameEvent, RunState } from "./game.ts";
import { generateGirl } from "./girl.ts";
import type { Girl } from "./girl.ts";
import { INTERESTS } from "./girlData.ts";
import { createRng } from "./rng.ts";
import { STORIES, STORY_BY_ID } from "./stories/index.ts";
import {
  UNCOLLECTED_MULT,
  chatTranscript,
  firstReadyDay,
  isChatReady,
  isFollowUp,
  openerOptions,
  pickStory,
  readyChats,
  renderLine,
  storyWeights,
  validateStory,
} from "./story.ts";
import type { TranscriptLine } from "./story.ts";
import type { Chat, FinalStep, Incoming, OpenerKind, ReplyStep, Story, StoryCategory } from "./storyTypes.ts";

// ---------- 共用工具 ----------

const near = (actual: number, expected: number, eps = 1e-9) =>
  assert.ok(Math.abs(actual - expected) < eps, `${actual} 應該接近 ${expected}`);

const isFinal = (step: ReplyStep | FinalStep): step is FinalStep => "ending" in step;
const lastStep = (story: Story) => story.steps[story.steps.length - 1];
const endingOf = (id: string) => {
  const step = lastStep(STORY_BY_ID[id]);
  assert.ok(isFinal(step), `${id} 的最後一步應該是結局`);
  return step.ending;
};

const fullDex = (): Dex => Object.fromEntries(STORIES.map((s) => [s.id, { count: 1, firstDayIndex: 0 }]));
const allIds = () => STORIES.map((s) => s.id);

const makeChat = (story: Story, patch: Partial<Chat> = {}): Chat => ({
  id: 1,
  girlSeed: 7,
  storyId: story.id,
  opener: "hi",
  stepIndex: 0,
  lastAdvancedDay: 0,
  replies: [],
  ...patch,
});

const GENERIC_OPENERS: OpenerKind[] = ["hi", "whatsup", "eaten"];

type Weights = ReturnType<typeof storyWeights>;
const weightOf = (weights: Weights, id: string) => weights.find((w) => w.item.id === id)?.weight ?? 0;
const categoryTotal = (weights: Weights, category: StoryCategory) =>
  weights.filter((w) => w.item.category === category).reduce((sum, w) => sum + w.weight, 0);

function nextPhoneDay(from: number): number {
  let d = from;
  while (!isPhoneChatDay(calendarOf(d))) d++;
  return d;
}

/** 規格列的失敗劇情與分類 */
const EXPECTED_IDS: Record<StoryCategory, string[]> = {
  ghost: ["read-no-reply", "never-read", "morning-image", "sticker-only", "wall-of-text", "friend-photo", "loan-help"],
  fade: [
    "match-vanished",
    "what-do-you-do",
    "hot-water",
    "half-year",
    "rain-check",
    "stood-up",
    "good-guy-card",
    "fading-replies",
    "otaku-monologue",
  ],
  pitch: [
    "stock-sister",
    "insurance",
    "mlm",
    "tech-support",
    "like-for-me",
    "health-mlm",
    "crypto-course",
    "romance-wire",
    "ba-jia-jiu",
  ],
  quick: ["just-bored", "has-boyfriend", "background-check", "split-bill", "zodiac", "coworker", "bot", "otp-scam"],
};

const MAX_TOTAL_WAIT_DAYS = 30;

type ChatEnded = Extract<GameEvent, { type: "chatEnded" }>;

/** 用真正的 advance 把一段聊天走到結局 */
function walkStory(story: Story, choose: (step: ReplyStep, index: number) => number, startDay = 0) {
  let run: RunState = {
    ...createRun(1),
    phase: "daytime",
    dayIndex: startDay,
    money: 100_000,
    chats: [makeChat(story, { lastAdvancedDay: startDay })],
    nextChatId: 2,
  };
  let dex: Dex = {};
  let actions = 0;
  let ended: ChatEnded | undefined;
  let endDay = startDay;
  const replies: number[] = [];
  for (let day = startDay; run.chats.some((c) => !c.closed); day++) {
    assert.ok(day <= startDay + 90, `${story.id} 走了 90 天還沒結束`);
    run = { ...run, dayIndex: day, dayReplies: 0, today: { ...FRESH_TODAY } };
    const chat = run.chats[0];
    if (!isChatReady(chat, day)) continue;
    const step = story.steps[chat.stepIndex];
    const choice = isFinal(step) ? -1 : choose(step, chat.stepIndex);
    const result = advance(
      run,
      dex,
      isFinal(step) ? { type: "closeChat", chatId: chat.id } : { type: "reply", chatId: chat.id, choice }
    );
    assert.notEqual(result.run, run, `${story.id} 第 ${chat.stepIndex} 步在 ready 時應該能推進`);
    if (!isFinal(step)) replies.push(choice);
    run = result.run;
    dex = result.dex;
    actions++;
    endDay = day;
    ended = result.events.find((e): e is ChatEnded => e.type === "chatEnded") ?? ended;
  }
  assert.ok(ended, `${story.id} 結束時沒有 chatEnded 事件`);
  return { actions, ended, days: endDay - startDay, money: run.money, dex, replies };
}

// ---------- 資料完整性 ----------

test("劇情數量與規格表一致", () => {
  assert.ok(STORIES.length >= 24, `只有 ${STORIES.length} 種`);
  assert.equal(STORIES.length, Object.values(EXPECTED_IDS).flat().length);
});

test("id 和圖鑑名稱都不重複", () => {
  assert.equal(new Set(STORIES.map((s) => s.id)).size, STORIES.length);
  assert.equal(new Set(STORIES.map((s) => s.dexName)).size, STORIES.length);
});

test("規格列的 id 都存在，分類正確", () => {
  for (const [category, ids] of Object.entries(EXPECTED_IDS)) {
    for (const id of ids) {
      assert.ok(STORY_BY_ID[id], `缺少劇情 ${id}`);
      assert.equal(STORY_BY_ID[id].category, category, `${id} 分類錯誤`);
    }
  }
  const expectedCount = Object.values(EXPECTED_IDS).flat().length;
  assert.equal(expectedCount, STORIES.length);
  assert.deepEqual([...allIds()].sort(), Object.values(EXPECTED_IDS).flat().sort());
});

test("STORY_BY_ID 和 STORIES 指向相同物件", () => {
  for (const s of STORIES) assert.equal(STORY_BY_ID[s.id], s);
});

test("每種都有圖鑑名稱和吐槽", () => {
  for (const s of STORIES) {
    assert.ok(s.dexName.trim().length > 0, `${s.id} 沒有圖鑑名稱`);
    assert.ok(s.dexQuip.trim().length > 0, `${s.id} 沒有吐槽`);
  }
});

test("每種都通過 validateStory", () => {
  for (const s of STORIES) assert.deepEqual(validateStory(s), [], s.id);
});

test("所有對白都不含 Tinder", () => {
  assert.ok(!/tinder/i.test(JSON.stringify(STORIES)));
});

test("所有對白套入女角後，不會留下佔位符", () => {
  const girls = Array.from({ length: 20 }, (_, i) => generateGirl(i * 101));
  const texts = (s: Story) =>
    s.steps.flatMap((step) => {
      const incoming = "text" in step.incoming ? [step.incoming.text] : [];
      return isFinal(step) ? [...incoming, step.ending.narration] : [...incoming, ...step.replies];
    });
  for (const s of STORIES) {
    for (const text of texts(s)) {
      for (const g of girls) {
        const out = renderLine(text, g);
        assert.ok(!/[{}]/.test(out), `${s.id}：${out}`);
      }
    }
  }
});

// ---------- 驗證器本身 ----------

const GOOD: Story = {
  id: "test-good",
  dexName: "測試用",
  dexQuip: "測試用吐槽",
  category: "ghost",
  steps: [
    { incoming: { kind: "message", text: "嗨 {name}" }, replies: ["一", "二"] },
    { incoming: { kind: "read" }, wait: { days: 3 }, replies: ["一", "二", "聊{interest}"] },
    { incoming: { kind: "narration", text: "過了一週" }, wait: { weekday: 6 }, ending: { narration: "結束", cost: 120 } },
  ],
};
const replyStep = GOOD.steps[0];
const finalStep = GOOD.steps[2];
const withSteps = (...steps: unknown[]) => ({ ...GOOD, steps }) as unknown as Story;
const withFinal = (patch: object) => withSteps(replyStep, { ...finalStep, ...patch });
const withEnding = (patch: object) =>
  withFinal({ ending: { ...(finalStep as FinalStep).ending, ...patch } });

test("validateStory：正常的劇情沒有錯誤", () => {
  assert.deepEqual(validateStory(GOOD), []);
});

test("validateStory：抓得到每一種壞資料", () => {
  const bad: Record<string, Story> = {
    沒有步驟: withSteps(),
    只有一句回覆: withSteps({ ...replyStep, replies: ["一"] }, finalStep),
    沒有回覆: withSteps({ ...replyStep, replies: [] }, finalStep),
    四句回覆: withSteps({ ...replyStep, replies: ["一", "二", "三", "四"] }, finalStep),
    最後一步沒有結局: withSteps(replyStep, replyStep),
    中間出現結局: withSteps(finalStep, finalStep),
    末步同時有回覆: withFinal({ replies: ["一", "二"] }),
    花費是負數: withEnding({ cost: -1 }),
    花費是小數: withEnding({ cost: 1.5 }),
    訊息有未知佔位符: withSteps({ ...replyStep, incoming: { kind: "message", text: "{phone}" } }, finalStep),
    回覆有未知佔位符: withSteps({ ...replyStep, replies: ["一", "{phone}"] }, finalStep),
    結局有未知佔位符: withEnding({ narration: "{phone}" }),
    等待負數天: withFinal({ wait: { days: -1 } }),
    等待小數天: withFinal({ wait: { days: 1.5 } }),
    星期超出範圍: withFinal({ wait: { weekday: 7 } }),
    星期是負數: withFinal({ wait: { weekday: -1 } }),
    星期是小數: withFinal({ wait: { weekday: 1.5 } }),
  };
  for (const [name, story] of Object.entries(bad)) {
    assert.ok(validateStory(story).length > 0, `沒有抓到：${name}`);
  }
});

// ---------- 每種都會結束 ----------

const STRATEGIES: Record<string, (step: ReplyStep, index: number) => number> = {
  第一句: () => 0,
  最後一句: (step) => step.replies.length - 1,
  交替: (step, index) => index % step.replies.length,
};

test("每種都會結束：各種選法的步數都等於步驟數，總等待不超過 30 天", () => {
  for (const story of STORIES) {
    for (const [name, choose] of Object.entries(STRATEGIES)) {
      for (let startDay = 0; startDay < 7; startDay++) {
        const r = walkStory(story, choose, startDay);
        // 第一句不堆尷尬，步數應走滿；最後一句／交替可能因隱性數值提早跳結局
        if (name === "第一句") {
          assert.equal(r.actions, story.steps.length, `${story.id}／${name}`);
        } else {
          assert.ok(r.actions <= story.steps.length, `${story.id}／${name} 步數 ${r.actions}`);
          assert.ok(r.actions >= 2, `${story.id}／${name} 太早結束`);
        }
        assert.ok(r.days <= MAX_TOTAL_WAIT_DAYS, `${story.id}／${name} 從第 ${startDay} 天起走了 ${r.days} 天`);
      }
    }
  }
});

test("第一句和最後一句的結局相同", () => {
  for (const story of STORIES) {
    const a = walkStory(story, STRATEGIES.第一句);
    const b = walkStory(story, STRATEGIES.最後一句);
    assert.deepEqual(a.ended, b.ended, story.id);
    assert.equal(a.money, b.money, story.id);
    // 尷尬提早收線只影響哪天進圖鑑，不影響收了哪一種、收了幾次
    const counts = (dex: typeof a.dex) =>
      Object.fromEntries(Object.entries(dex).map(([id, e]) => [id, e.count]));
    assert.deepEqual(counts(a.dex), counts(b.dex), story.id);
  }
});

test("結局事件帶著該劇情的旁白、實扣金額和防詐標記", () => {
  for (const story of STORIES) {
    const r = walkStory(story, STRATEGIES.第一句);
    const { ending } = lastStep(story) as FinalStep;
    assert.equal(r.ended.storyId, story.id);
    assert.equal(r.ended.narration, renderLine(ending.narration, generateGirl(7)), story.id);
    assert.equal(r.ended.paid, ending.cost ?? 0, story.id);
    assert.equal(r.ended.firstTime, true, story.id);
    assert.equal(Boolean(r.ended.antiFraud), Boolean(ending.antiFraud), story.id);
  }
});

// ---------- 指定劇情 ----------

test("stock-sister：有防詐標記、旁白含 165，而且不花錢", () => {
  const ending = endingOf("stock-sister");
  assert.equal(ending.antiFraud, true);
  assert.ok(ending.narration.includes("165"));
  assert.equal(ending.cost, undefined);
});

test("所有防詐劇情的旁白都含 165，也都不花錢", () => {
  for (const s of STORIES) {
    const step = lastStep(s) as FinalStep;
    if (!step.ending.antiFraud) continue;
    assert.ok(step.ending.narration.includes("165"), s.id);
    assert.equal(step.ending.cost, undefined, s.id);
  }
});

test("stood-up：有花費，而且真的扣錢", () => {
  const cost = endingOf("stood-up").cost;
  assert.ok(typeof cost === "number" && cost > 0);
  const r = walkStory(STORY_BY_ID["stood-up"], STRATEGIES.第一句);
  assert.equal(r.money, 100_000 - cost);
});

test("fading-replies：回覆間隔依序是 1、3、7 天", () => {
  let last = 0;
  const gaps = STORY_BY_ID["fading-replies"].steps.map((step) => {
    const ready = firstReadyDay(last, step.wait);
    const gap = ready - last;
    last = ready;
    return gap;
  });
  const found = gaps.some((_, i) => gaps[i] === 1 && gaps[i + 1] === 3 && gaps[i + 2] === 7);
  assert.ok(found, `實際間隔 ${gaps.join("、")}`);
});

test("never-read：最後一步等 7 天", () => {
  const step = lastStep(STORY_BY_ID["never-read"]);
  assert.equal(firstReadyDay(10, step.wait) - 10, 7);
});

test("stood-up 等到週六、coworker 等到週二，每個起始日都正確", () => {
  const cases: [string, number][] = [
    ["stood-up", 6],
    ["coworker", 2],
  ];
  for (const [id, weekday] of cases) {
    const step = STORY_BY_ID[id].steps.find((s) => s.wait && "weekday" in s.wait);
    assert.ok(step, `${id} 沒有指定星期的等待`);
    assert.deepEqual(step.wait, { weekday });
    for (let from = 0; from < 21; from++) {
      const ready = firstReadyDay(from, step.wait);
      assert.equal(calendarOf(ready).weekday, weekday, `${id} 從第 ${from} 天起`);
      assert.ok(ready > from && ready <= from + 7, `${id} 從第 ${from} 天起得到 ${ready}`);
    }
  }
});

// ---------- 等待與 ready ----------

test("firstReadyDay：預設等一天，days 照天數", () => {
  assert.equal(firstReadyDay(10), 11);
  assert.equal(firstReadyDay(10, { days: 1 }), 11);
  assert.equal(firstReadyDay(10, { days: 3 }), 13);
});

test("firstReadyDay：等星期時，當天不算，一定是之後的那一天", () => {
  // 第 0 天是 9/15 週二
  assert.equal(firstReadyDay(0, { weekday: 2 }), 7); // 週二等週二，是下週二
  assert.equal(firstReadyDay(0, { weekday: 6 }), 4); // 週二等週六
  assert.equal(firstReadyDay(4, { weekday: 6 }), 11); // 週六等週六，是下週六
  assert.equal(firstReadyDay(4, { weekday: 1 }), 6); // 週六等週一（中間的週日跳過）
});

test("isChatReady：配對當天不算，到了等待日才算，之後都算", () => {
  for (const story of STORIES) {
    const chat = makeChat(story, { lastAdvancedDay: 20 });
    const ready = firstReadyDay(20, story.steps[0].wait);
    assert.ok(ready > 20, story.id);
    assert.equal(isChatReady(chat, 20), false, story.id);
    assert.equal(isChatReady(chat, ready - 1), false, story.id);
    assert.equal(isChatReady(chat, nextPhoneDay(ready)), true, story.id);
    assert.equal(isChatReady(chat, nextPhoneDay(ready) + 14), true, story.id);
  }
});

test("isChatReady：看的是目前這一步的等待", () => {
  const story = STORY_BY_ID["fading-replies"];
  story.steps.forEach((step, stepIndex) => {
    // 第 42 天是週二（第 40、41 天是週日、週一，遊戲裡不會停在那兩天）
    const chat = makeChat(story, { stepIndex, lastAdvancedDay: 42, replies: new Array<number>(stepIndex).fill(0) });
    if (isFinal(step)) {
      // 結局步不等待，當天就能關
      assert.equal(isChatReady(chat, 42), true, `第 ${stepIndex} 步結局`);
      return;
    }
    const ready = firstReadyDay(42, step.wait);
    assert.equal(isChatReady(chat, ready - 1), false, `第 ${stepIndex} 步`);
    assert.equal(isChatReady(chat, nextPhoneDay(ready)), true, `第 ${stepIndex} 步`);
  });
});

test("readyChats：只回傳 ready 的聊天，保持原順序，不改變傳入陣列", () => {
  const [a, b, c] = STORIES;
  const chats: readonly Chat[] = Object.freeze([
    makeChat(a, { id: 1, lastAdvancedDay: 0 }),
    makeChat(b, { id: 2, lastAdvancedDay: 50 }),
    makeChat(c, { id: 3, lastAdvancedDay: 0 }),
  ]);
  const day = 50;
  const expected = chats.filter((chat) => isChatReady(chat, day)).map((chat) => chat.id);
  assert.deepEqual(expected, [1, 3]);
  assert.deepEqual(readyChats(chats, day).map((chat) => chat.id), expected);
  assert.deepEqual(readyChats([], day), []);
});

// ---------- 開場白 ----------

test("openerOptions：4 句，第 4 句是依興趣生成的", () => {
  for (let seed = 0; seed < 300; seed++) {
    const g = generateGirl(seed);
    const options = openerOptions(g);
    assert.deepEqual(options.map((o) => o.kind), ["hi", "whatsup", "eaten", "interest"]);
    for (const o of options) assert.ok(o.text.trim().length > 0, `seed ${seed} ${o.kind}`);
    const interest = INTERESTS.find((i) => i.id === g.interest);
    assert.ok(interest);
    assert.equal(options[3].text, renderLine(interest.openerLine, g));
  }
});

test("openerOptions：前三句對每個人都一樣，第 4 句會隨興趣改變", () => {
  const girls = Array.from({ length: 300 }, (_, i) => generateGirl(i));
  const generic = new Set(girls.map((g) => JSON.stringify(openerOptions(g).slice(0, 3))));
  assert.equal(generic.size, 1);
  const fourth = new Set(girls.map((g) => openerOptions(g)[3].text));
  assert.ok(fourth.size > 1);
});

test("renderLine：替換 {name} 和 {interest}", () => {
  const g = generateGirl(1);
  const interest = INTERESTS.find((i) => i.id === g.interest);
  assert.ok(interest);
  assert.equal(renderLine("嗨{name}！", g), `嗨${g.nickname}！`);
  assert.equal(renderLine("聊{interest}吧", g), `聊${interest.label}吧`);
  assert.equal(renderLine("{name}{name}", g), `${g.nickname}${g.nickname}`);
  assert.equal(renderLine("沒有佔位符", g), "沒有佔位符");
});

// ---------- 權重 ----------

test("權重：已收集時就是規格的類別倍率", () => {
  const table: Record<"generic" | "interest", Record<StoryCategory, number>> = {
    generic: { ghost: 3, fade: 1, pitch: 1, quick: 1 },
    interest: { ghost: 0.5, fade: 3, pitch: 1, quick: 1 },
  };
  const check = (opener: OpenerKind, row: Record<StoryCategory, number>) => {
    const weights = storyWeights(opener, fullDex(), []);
    for (const s of STORIES) near(weightOf(weights, s.id), row[s.category]);
  };
  for (const opener of GENERIC_OPENERS) check(opener, table.generic);
  check("interest", table.interest);
});

test("權重：未收集的劇情再乘上 UNCOLLECTED_MULT", () => {
  assert.ok(UNCOLLECTED_MULT > 1);
  const collected = storyWeights("hi", fullDex(), []);
  const uncollected = storyWeights("hi", {}, []);
  for (const s of STORIES) near(weightOf(uncollected, s.id), weightOf(collected, s.id) * UNCOLLECTED_MULT);

  const [target] = STORIES;
  const dex = fullDex();
  delete dex[target.id];
  const partial = storyWeights("hi", dex, []);
  near(weightOf(partial, target.id), weightOf(collected, target.id) * UNCOLLECTED_MULT);
  for (const s of STORIES.slice(1)) near(weightOf(partial, s.id), weightOf(collected, s.id));
});

test("通用句時 ghost 總權重高於興趣句", () => {
  const interest = categoryTotal(storyWeights("interest", {}, []), "ghost");
  for (const opener of GENERIC_OPENERS) {
    assert.ok(categoryTotal(storyWeights(opener, {}, []), "ghost") > interest, opener);
  }
});

test("興趣句時 fade 總權重高於通用句", () => {
  const interest = categoryTotal(storyWeights("interest", {}, []), "fade");
  for (const opener of GENERIC_OPENERS) {
    assert.ok(interest > categoryTotal(storyWeights(opener, {}, []), "fade"), opener);
  }
});

test("進行中的劇情權重為 0，其他不受影響", () => {
  const [a, b] = STORIES;
  const weights = storyWeights("hi", {}, [a.id, b.id]);
  assert.equal(weightOf(weights, a.id), 0);
  assert.equal(weightOf(weights, b.id), 0);
  for (const s of STORIES.slice(2)) assert.ok(weightOf(weights, s.id) > 0, s.id);
});

test("全部被占用時才解除，權重恢復成沒有占用時的值", () => {
  const free = storyWeights("eaten", {}, []);
  const occupied = storyWeights("eaten", {}, allIds());
  for (const s of STORIES) near(weightOf(occupied, s.id), weightOf(free, s.id));
});

// ---------- 抽劇情 ----------

test("pickStory：同樣的亂數得到同樣的結果", () => {
  const draw = () => {
    const rng = createRng(5);
    return Array.from({ length: 50 }, () => pickStory("hi", {}, [], rng).id);
  };
  assert.deepEqual(draw(), draw());
});

test("pickStory：每一種都抽得到", () => {
  const rng = createRng(6);
  const seen = new Set<string>();
  for (let i = 0; i < 5000; i++) seen.add(pickStory("hi", {}, [], rng).id);
  assert.equal(seen.size, STORIES.length);
});

test("pickStory：抽出比例反映開場白的差異", () => {
  const share = (opener: OpenerKind, category: StoryCategory) => {
    const rng = createRng(8);
    let n = 0;
    for (let i = 0; i < 6000; i++) if (pickStory(opener, {}, [], rng).category === category) n++;
    return n / 6000;
  };
  assert.ok(share("hi", "ghost") > share("interest", "ghost") + 0.1);
  assert.ok(share("interest", "fade") > share("hi", "fade") + 0.1);
});

test("pickStory：進行中的劇情不重複，全部占用仍抽得到", () => {
  const rng = createRng(9);
  const active: string[] = [];
  for (let i = 0; i < STORIES.length; i++) {
    const story = pickStory("whatsup", {}, active, rng);
    assert.ok(!active.includes(story.id), `重複抽到 ${story.id}`);
    active.push(story.id);
  }
  assert.equal(new Set(active).size, STORIES.length);
  assert.ok(STORY_BY_ID[pickStory("whatsup", {}, active, rng).id]);
});

test("pickStory：亂數在兩端時也不會抽到進行中的劇情", () => {
  const [only] = STORIES;
  const active = allIds().filter((id) => id !== only.id);
  assert.equal(pickStory("hi", {}, active, () => 0).id, only.id);
  assert.equal(pickStory("hi", {}, active, () => 0.999999999).id, only.id);
});

// ---------- 對話紀錄 ----------

function incomingLine(incoming: Incoming, girl: Girl): TranscriptLine {
  switch (incoming.kind) {
    case "message":
      return { who: "her", text: renderLine(incoming.text, girl) };
    case "narration":
      return { who: "narration", text: renderLine(incoming.text, girl) };
    case "none":
      throw new Error("一般失敗不會用到 none");
    default:
      return { who: "status", status: incoming.kind };
  }
}

function expectedTranscript(story: Story, chat: Chat, girl: Girl, revealed: boolean): TranscriptLine[] {
  const opener = openerOptions(girl).find((o) => o.kind === chat.opener);
  assert.ok(opener);
  const lines: TranscriptLine[] = [{ who: "me", text: opener.text }];
  const pushLead = (step: ReplyStep | FinalStep) => {
    if ("lead" in step) for (const text of step.lead ?? []) lines.push({ who: "her", text: renderLine(text, girl) });
  };
  for (let i = 0; i < chat.stepIndex; i++) {
    const step = story.steps[i] as ReplyStep;
    pushLead(step);
    lines.push(incomingLine(step.incoming, girl));
    if (!step.date && !step.fakeEnding) {
      lines.push({ who: "me", text: renderLine(step.replies[chat.replies[i]], girl) });
    }
    const answer = step.answers?.[chat.replies[i]] ?? step.answer;
    if (answer) lines.push({ who: "her", text: renderLine(answer, girl) });
  }
  if (revealed) {
    const current = story.steps[chat.stepIndex];
    pushLead(current);
    lines.push(incomingLine(current.incoming, girl));
  }
  return lines;
}

test("chatTranscript：順序是開場白、她的訊息、冠宇選的回覆，內容已替換佔位符", () => {
  const openers: OpenerKind[] = ["hi", "whatsup", "eaten", "interest"];
  STORIES.forEach((story, n) => {
    const girlSeed = n * 31 + 1;
    const girl = generateGirl(girlSeed);
    const opener = openers[n % openers.length];
    story.steps.forEach((step, stepIndex) => {
      const replies = story.steps.slice(0, stepIndex).map((s, i) => i % (s as ReplyStep).replies.length);
      const chat = makeChat(story, { girlSeed, opener, stepIndex, lastAdvancedDay: 100, replies });
      const readyDay = firstReadyDay(100, step.wait);
      const where = `${story.id} 第 ${stepIndex} 步`;
      // 結局步、一輪對話裡她接著傳的那一步，當天就揭示
      const finalNow = isFinal(step) || isFollowUp(chat, 100);
      // 還沒到等待日：這一步還沒揭示（上面兩種除外）
      assert.deepEqual(
        chatTranscript(chat, girl, 100),
        expectedTranscript(story, chat, girl, finalNow),
        where
      );
      // 到了等待日：看得到她這一步的內容
      assert.deepEqual(chatTranscript(chat, girl, readyDay), expectedTranscript(story, chat, girl, true), where);
    });
  });
});

test("chatTranscript：只有開場白時，隔天才看得到她的第一步", () => {
  const story = STORIES[0];
  const girl = generateGirl(3);
  const chat = makeChat(story, { girlSeed: 3, opener: "eaten", lastAdvancedDay: 8 });
  assert.equal(chatTranscript(chat, girl, 8).length, 1);
  assert.equal(chatTranscript(chat, girl, firstReadyDay(8, story.steps[0].wait)).length, 2);
});

// ---------- 她依回覆回話、鋪陳 ----------

function transcriptAt(storyId: string, stepIndex: number, replies: number[], lastAdvancedDay = 0, dayIndex = 0) {
  const girl = generateGirl(1);
  const chat = { id: 1, girlSeed: 1, storyId, opener: "hi" as const, stepIndex, lastAdvancedDay, replies };
  return chatTranscript(chat, girl, dayIndex).filter((l) => l.who === "me" || l.who === "her");
}

test("照片僅供參考：三個回覆她都回得上，說眼鏡那句不會被反問幹嘛問這個", () => {
  const step = STORY_BY_ID["friend-photo"].steps[0];
  assert.ok("replies" in step && step.answers);
  assert.equal(step.answers.length, step.replies.length);
  // 選項順序不能動，舊存檔存的是第幾句
  assert.match(step.replies[1], /眼鏡/);
  assert.match(step.answers[1], /眼鏡/);
  assert.doesNotMatch(step.answers[1], /幹嘛問/);
  for (const choice of [0, 1, 2]) {
    const lines = transcriptAt("friend-photo", 1, [choice]);
    const i = lines.findIndex((l) => "text" in l && l.text === step.replies[choice]);
    const next = lines[i + 1];
    assert.equal(next.who, "her");
    assert.ok("text" in next && next.text === step.answers[choice], `第 ${choice} 句的回應`);
  }
});

test("照片僅供參考：隔天那一步的問題和三個回覆，接在三種開頭後面都不會是在怪他問問題", () => {
  const next = STORY_BY_ID["friend-photo"].steps[1];
  assert.ok("replies" in next && next.incoming.kind === "message");
  const all = [next.incoming.text, ...next.replies].join("\n");
  assert.doesNotMatch(all, /幹嘛問這個|沒別的意思|資料完整性/);
});

test("回應數量和回覆對不上、鋪陳是空字串，資料驗證都抓得到", () => {
  const base = { id: "x", dexName: "x", dexQuip: "x", category: "ghost" as const };
  const final = { incoming: { kind: "read" as const }, ending: { narration: "x" } };
  const bad = (extra: object) => ({
    ...base,
    steps: [{ incoming: { kind: "message" as const, text: "嗨" }, replies: ["a", "b"], ...extra }, final],
  });
  assert.deepEqual(validateStory(bad({ answers: ["1", "2"], lead: ["先講"] })), []);
  assert.ok(validateStory(bad({ answers: ["1"] })).length > 0);
  assert.ok(validateStory(bad({ answers: ["1", " "] })).length > 0);
  assert.ok(validateStory(bad({ lead: [""] })).length > 0);
});

test("1h2s 那題有鋪陳：她先把話講開才問，步驟數沒變，舊存檔的 stepIndex 不會錯位", () => {
  const steps = STORY_BY_ID.studio.steps;
  assert.equal(steps.length, 6, "步驟數不能變，存檔存的是第幾步");
  const i = steps.findIndex((s) => "decision" in s);
  assert.equal(i, 4);
  const ask = steps[i];
  assert.ok("lead" in ask && ask.lead && ask.lead.length >= 2);
  const lines = transcriptAt("studio", i, [0, 0, 0, 0], 0, 1);
  const texts = lines.map((l) => ("text" in l ? l.text : ""));
  const askAt = texts.findIndex((t) => /1h2s/.test(t));
  assert.equal(askAt, texts.length - 1, "1h2s 是最後才講的");
  for (const lead of ask.lead) assert.ok(texts.indexOf(lead) >= 0 && texts.indexOf(lead) < askAt);
  // 拒絕之後她有回應，也不會再被問一次
  assert.ok("answers" in ask && ask.answers?.every((a) => !/1h2s|3000/.test(a)));
  const refused = transcriptAt("studio", i + 1, [0, 0, 0, 0, 2], 0, 1);
  assert.equal(refused.filter((l) => "text" in l && /1h2s 3000/.test(l.text)).length, 1);
});
