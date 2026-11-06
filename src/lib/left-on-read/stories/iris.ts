/**
 * 第二條真結局：Iris 的路線。走到任何一個結局之後的新遊戲才會遇到她。
 * 她跟小晴相反：她會先傳、先約、先告白，最討厭已讀不回。
 * 聊天計分（同小晴）→ 兩次約會 → 結局；中途連續兩晚沒回她，她就走了（Story.patience）。
 */

import { IRIS_DATE_COSTS, IRIS_ENDING_ID, IRIS_PASS_SCORE, IRIS_PATIENCE } from "../constants.ts";
import type { ChatStats, ReplyStep, Story } from "../storyTypes.ts";
import type { HeroineDate } from "./heroine.ts";

export const IRIS_STORY_ID = "iris";
export const IRIS_ALMOST_STORY_ID = "iris-almost";
export const IRIS_LEFT_STORY_ID = "iris-left";

export const IRIS_DATES: readonly HeroineDate[] = [
  {
    place: "象山步道",
    activity: "爬象山，看 101。",
    cost: IRIS_DATE_COSTS[0],
    opening: "爬到六巨石的時候，我已經喘到講不出話。她把水遞給我：「你平常真的都不動耶。」",
    options: [
      { text: "「對。但我今天動了。」", response: "她笑出來：「好，算你一次。」" },
      {
        text: "「我有在動，每天都在動滑鼠。」",
        response: "她看了我三秒：「這句你是不是在交友軟體上用過。」我說對。她笑到要扶欄杆。",
      },
    ],
    closing: "下山的時候她說，下次換她帶我去她的祕密景點。她說的下次，聽起來跟別人的不一樣。",
  },
  {
    place: "北投",
    activity: "她的祕密景點：圖書館，然後泡腳。",
    cost: IRIS_DATE_COSTS[1],
    opening: "泡腳的時候，她把頭靠過來：「我先講喔。我喜歡你。你不用馬上回。」",
    options: [
      { text: "「我現在就回。我也喜歡妳。」", response: "她說：「三秒內。你真的很快。」" },
      {
        text: "我想了很久，最後只說：「已讀。」",
        response: "她瞪我。我馬上補：「然後我也喜歡妳。」她說：「這次原諒你。下次要直接講。」",
      },
    ],
    closing: "原來回訊息，也可以是一種告白。",
  },
];

/** 計分題的數值：答好她不急，答壞她尷尬；回了就不會累積已讀壓力 */
const SCORED_DELTA: Record<number, Partial<ChatStats>> = {
  1: { affection: 1 },
  0: {},
  [-1]: { awkward: 1 },
};

function scored(step: Omit<ReplyStep, "deltas">): ReplyStep {
  return { ...step, deltas: (step.scores ?? []).map((s) => SCORED_DELTA[s] ?? {}) };
}

/** 第一階段：分數順序打散，不能每題都選同一個位置 */
const IRIS_CHAT_STEPS: readonly ReplyStep[] = [
  scored({
    incoming: { kind: "message", text: "嗨！我先講，我很討厭已讀不回。你呢？" },
    replies: [
      "看情況啦，有時候真的很忙",
      "我也討厭。所以我現在就回妳了",
      "我通常已讀之後會想三天再回，這樣比較有深度",
    ],
    answers: ["嗯……好吧。那你現在忙嗎？", "哈哈，好，你過關了。第一關。", "三天？你是在寫論文嗎。"],
    scores: [0, 1, -1],
  }),
  scored({
    incoming: { kind: "message", text: "我今天去爬七星山，腿快斷了。你週末都在幹嘛？" },
    replies: [
      "我做了一份登山裝備比價表，還沒爬過",
      "在家。但聽妳講完，我有點想出門",
      "睡覺",
    ],
    answers: ["……比價表可以給我看嗎，我是說真的。", "那你下次可以跟我去。我會等你。", "睡覺也是一種運動吧。大概。"],
    scores: [-1, 1, 0],
  }),
  scored({
    incoming: { kind: "message", text: "今天被客戶罵，回家路上一直哭。好丟臉。" },
    replies: [
      "妳先不要管丟不丟臉。妳現在在哪？到家了嗎",
      "要不要我幫妳分析一下那個客戶的心理",
      "客戶都這樣啦",
    ],
    answers: ["到了。謝謝你先問這個。", "……不用，我現在不想分析。", "嗯，大概吧。"],
    scores: [1, -1, 0],
  }),
  scored({
    incoming: { kind: "message", text: "跟你講話很輕鬆。你要不要約我？這次我等你先開口。" },
    replies: [
      "哈哈好啊，改天",
      "我先排一下時程，下個月第二週可能有空",
      "象山？我體力很差，但我想去",
    ],
    answers: ["改天是哪天？", "下個月……好吧。", "好！週末。不准反悔。"],
    scores: [0, -1, 1],
    gate: { minScore: IRIS_PASS_SCORE, failStoryId: IRIS_ALMOST_STORY_ID },
  }),
];

function dateStep(index: number, endingId?: string, wait?: ReplyStep["wait"]): ReplyStep {
  const date = IRIS_DATES[index];
  return {
    incoming: { kind: "narration", text: `（${date.place}）` },
    replies: date.options.map((o) => o.text),
    date: { index, cost: date.cost, endingId },
    ...(wait ? { wait } : {}),
  };
}

export const IRIS_STORY: Story = {
  id: IRIS_STORY_ID,
  dexName: "Iris",
  dexQuip: "這一筆不會被記進失敗圖鑑。",
  category: "fade",
  patience: { max: IRIS_PATIENCE, leaveStoryId: IRIS_LEFT_STORY_ID },
  steps: [
    ...IRIS_CHAT_STEPS,
    {
      // 同一輪就把時間講死，週末才接得上
      wait: { days: 0 },
      incoming: { kind: "none" },
      replies: ["週六下午四點，象山步道口見？", "週六四點。我先查好捷運出口，二號出口"],
      answers: ["好！我帶水，你帶腳。", "你真的會查耶。好，四點，二號出口。"],
    },
    dateStep(0),
    {
      wait: { days: 0 },
      lead: ["到家了！"],
      incoming: { kind: "message", text: "你的腿還好嗎？" },
      replies: ["不太好。但很值得", "我在冰敷，像一個退休的運動員"],
      answers: ["很值得這句我收下了。晚安。", "退休的運動員要早點睡。晚安。"],
    },
    {
      incoming: { kind: "message", text: "下次換我帶你去祕密景點。不要問是哪裡。" },
      replies: ["好，我不問", "是需要爬山的那種嗎"],
      answers: ["很好。你進步了。", "不用爬山。你可以放心了，我聽到你鬆一口氣。"],
    },
    {
      lead: ["（一張晚餐的照片）"],
      incoming: { kind: "message", text: "我今天吃這個。你呢？" },
      replies: ["泡麵。但我加了蛋", "還沒吃。我在等妳傳照片給我參考"],
      answers: ["加蛋算有進步。", "那你現在去吃。吃完傳照片給我，這是作業。"],
    },
    {
      incoming: { kind: "message", text: "週六早上十點，新北投站。帶毛巾。" },
      replies: ["好。我不問為什麼要毛巾", "毛巾是要擦汗還是擦眼淚"],
      answers: ["你今天特別乖。", "到了你就知道。兩種都有可能。"],
    },
    dateStep(1, IRIS_ENDING_ID),
  ],
};

/** 計分不夠：她很直接，連拒絕都先講 */
export const IRIS_ALMOST_STORY: Story = {
  id: IRIS_ALMOST_STORY_ID,
  dexName: "她先講了",
  dexQuip: "她什麼都先講，包括再見。",
  category: "fade",
  steps: [
    ...IRIS_CHAT_STEPS,
    {
      incoming: { kind: "message", text: "我想了一下，我們好像不太合。我先講，免得你等。謝謝你陪我聊天。" },
      ending: { narration: "她連拒絕都沒有讓我等。這是我收過最有禮貌的已讀。" },
    },
  ],
};

/** 連續兩晚沒回她：睡一覺起來就是這個結局 */
export const IRIS_LEFT_STORY: Story = {
  id: IRIS_LEFT_STORY_ID,
  dexName: "換她已讀不回",
  dexQuip: "原來被已讀是這種感覺。我以前讓多少人等過。",
  category: "ghost",
  steps: [
    {
      incoming: { kind: "message", text: "你已讀我兩天了。沒關係，我懂。我們就到這裡吧。" },
      ending: { narration: "我打了一段很長的解釋。送出的時候，她已經把我刪了。這次是我被已讀不回。" },
    },
  ],
};
