/**
 * 真結局：小晴的路線。第一條選項會影響結果的路線，只有右滑她才會走。
 * 聊天計分 → 三次約會，約會之間有日常聊天，第二次之後有假失敗 → 第三次約會走向真結局（腳本在 ../trueEnding.ts）。
 */

import { HEROINE_DATE_COSTS, HEROINE_PASS_SCORE, TRUE_ENDING_ID } from "../constants.ts";
import type { ReplyStep, Story } from "../storyTypes.ts";

/** 步驟數變過一次，id 也跟著換：讀到舊 id 就知道是舊存檔的 stepIndex，見 upgradeLegacyHeroineChat */
export const HEROINE_STORY_ID = "heroine-v2";
export const LEGACY_HEROINE_STORY_ID = "heroine";
export const HEROINE_ALMOST_STORY_ID = "heroine-almost";

/** 假失敗要演成這一種失敗的樣子 */
const FAKE_ENDING_STORY_ID = "rain-check";

export interface HeroineDate {
  place: string;
  /** 這次約會做了什麼，第三次沒有 */
  activity?: string;
  cost: number;
  opening: string;
  options: readonly { text: string; response: string }[];
  closing: string;
}

export const HEROINE_DATES: readonly HeroineDate[] = [
  {
    place: "信義威秀",
    activity: "看電影，然後吃美食街。",
    cost: HEROINE_DATE_COSTS[0],
    opening: "結帳的時候，她拿出錢包。",
    options: [
      { text: "「我請妳，妳請我喝飲料就好。」", response: "她笑了：「好啊。」" },
      { text: "「那我們 AA？我有準備零錢。」", response: "她愣了一下，也笑了：「你真的準備了。」" },
    ],
    closing: "我第一次沒有在散場後查回家最快的路線。",
  },
  {
    place: "大稻埕",
    activity: "逛夜市、看煙火。",
    cost: HEROINE_DATE_COSTS[1],
    opening: "她把最後一口雞排推給我。煙火開始的時候，四周都在拍照。",
    options: [
      {
        text: "我把手機收起來。",
        response: "她轉頭看我：「你不拍喔？」「我想用眼睛看。」說完我很後悔，她笑了很久。",
      },
      { text: "我拍了十二張，還調了 ISO。", response: "她湊過來看：「這張不錯耶。」" },
    ],
    closing: "煙火放完，她說明年還想來。明年。她用了明年這個詞。",
  },
  {
    place: "淡水漁人碼頭",
    cost: HEROINE_DATE_COSTS[2],
    opening: "情人橋的燈一盞一盞亮起來。海風很大，她的手很冰，我想了三分鐘要不要講這件事。",
    options: [
      {
        text: "「我喜歡妳。我想了很久要怎麼講，最後還是只有這句。」",
        response: "她：「嗯，我知道。我等你講很久了。」",
      },
      {
        text: "「依據這幾個月的數據，我認為我們可以進入下一階段。」",
        response: "她：「……可以講人話嗎。」我重講了一次：「我喜歡妳。」她笑著說：「嗯，我知道。」",
      },
    ],
    closing: "這是我第一次知道，已讀之後還有這一頁。",
  },
];

function dateStep(index: number, endingId?: string): ReplyStep {
  const date = HEROINE_DATES[index];
  return {
    // 約會完才會出現在對話紀錄
    incoming: { kind: "narration", text: `（${date.place}）` },
    replies: date.options.map((o) => o.text),
    date: { index, cost: date.cost, endingId },
  };
}

/*
 * 約會之間的聊天：這些回覆不計分，也不會改變結局。
 * 她不知道冠宇在約會裡選了哪一句，對白要兩個選項都接得上；
 * 訊息可能隔好幾天才被回，不要寫「昨天」「明天」這種綁定日子的詞。
 */

/** 威秀之後、大稻埕邀約之前 */
const AFTER_FIRST_DATE: readonly ReplyStep[] = [
  {
    lead: ["那天謝謝你，我很開心。"],
    incoming: { kind: "message", text: "欸，那部片的結局你看懂了嗎？我回家想了好久" },
    replies: ["老實說沒有。但當場不敢講，怕妳覺得我很笨", "我查了三篇影評，現在懂了。要我解釋嗎"],
    answers: ["我也沒看懂啦！我還以為只有我這樣", "不用，我想繼續不懂。不過你真的去查了三篇喔"],
  },
  {
    // 這次換冠宇先開口
    incoming: { kind: "none" },
    replies: ["今天主管還有念妳嗎？", "我今天午休突然想到妳。就這樣，沒有別的事"],
    answers: ["有。但我今天頂嘴了，在心裡。", "……你這樣講我要怎麼回啦。好啦，我也是。"],
  },
];

/** 大稻埕隔天：最後一次這麼自然，假失敗才會痛 */
const AFTER_SECOND_DATE: ReplyStep = {
  lead: ["我的外套現在還有雞排味。"],
  incoming: { kind: "message", text: "明年要記得早點去占位子，這次差點看不到" },
  replies: ["好，我記下來了。明年。", "我開個行事曆提醒，提前三百六十天通知妳"],
  answers: ["嗯，明年。", "三百六十天也太早了吧。好啦，你提醒我。"],
};

/** 她回來之後、淡水之前：把假失敗那段講開，不要讓它不了了之 */
const AFTER_COMEBACK: readonly ReplyStep[] = [
  {
    lead: ["前陣子對不起。加班和回老家都是真的，但我回得很敷衍。"],
    incoming: { kind: "message", text: "你是不是以為我不想理你了" },
    replies: ["有一點。我還幫這件事取了名字，叫「下次吧」", "沒有啊。好啦，有。"],
    answers: ["這名字也太慘了吧。對不起啦。這次是我約的，不會是下次。", "你真的很不會說謊。我回老家那幾天，一直在想煙火的事。"],
  },
  {
    incoming: { kind: "message", text: "那天穿厚一點，淡水海風很大。" },
    replies: ["好。我查了日落時間，提早一小時到，留一點誤差", "好。那妳也穿厚一點"],
    answers: ["你是要發射火箭嗎。好啦，聽你的。", "我才不要，我要穿好看的。冷再說。"],
  },
];

/** 第一階段：分數順序刻意打散，不能每題都選同一個位置 */
const CHAT_STEPS: readonly ReplyStep[] = [
  {
    incoming: { kind: "message", text: "你也喜歡看電影喔？最近看了什麼" },
    replies: [
      "我都在家看，戲院太貴了",
      "上次那部我看到哭，一個人在戲院有點丟臉。妳呢？",
      "我整理了一份近十年高分片單 共 212 部 要嗎",
    ],
    scores: [0, 1, -1],
  },
  {
    incoming: { kind: "message", text: "我今天被主管念了，有點煩" },
    replies: ["多喝熱水", "主管都這樣啦", "辛苦了，發生什麼事？想講的話我聽"],
    scores: [-1, 0, 1],
  },
  {
    incoming: { kind: "message", text: "你假日通常都在幹嘛？" },
    replies: [
      "老實說都在家。但我有點想改變，妳有推薦的地方嗎",
      "我把假日行程做成甘特圖了",
      "上班太累了都在睡",
    ],
    scores: [1, -1, 0],
  },
  {
    incoming: { kind: "message", text: "跟你聊天滿舒服的耶" },
    replies: [
      "根據我們的訊息頻率，我認為時機成熟了",
      "我也是。那個，週末要不要一起看場電影？",
      "哈哈謝謝",
    ],
    scores: [-1, 1, 0],
    gate: { minScore: HEROINE_PASS_SCORE, failStoryId: HEROINE_ALMOST_STORY_ID },
  },
];

export const HEROINE_STORY: Story = {
  id: HEROINE_STORY_ID,
  dexName: "小晴",
  dexQuip: "這一筆不會被記進失敗圖鑑。",
  category: "fade",
  steps: [
    ...CHAT_STEPS,
    {
      incoming: { kind: "message", text: "週末信義威秀有一部我想看。一起去？" },
      replies: ["好，我查一下場次", "好。我把那天空下來了，雖然本來就是空的"],
    },
    dateStep(0),
    ...AFTER_FIRST_DATE,
    {
      // 至少隔兩天，第二次約會一定是另一個週末
      wait: { days: 2 },
      incoming: { kind: "message", text: "下週末大稻埕有煙火，要不要去？" },
      replies: ["好啊，我去", "煙火幾點？我先查捷運末班車"],
    },
    dateStep(1),
    AFTER_SECOND_DATE,
    // 假失敗：連續三天，冠宇先傳、她當場回
    { incoming: { kind: "none" }, replies: ["下週末有空嗎？想約妳"], answer: "這週要加班耶" },
    { incoming: { kind: "none" }, replies: ["那再下週呢"], answer: "下週要回老家" },
    { incoming: { kind: "none" }, replies: ["好，那妳有空再說"], answer: "最近真的比較忙" },
    {
      // 第三天她回完，當天就可以按「……就這樣了」
      wait: { days: 0 },
      incoming: { kind: "none" },
      replies: ["……就這樣了"],
      fakeEnding: { storyId: FAKE_ENDING_STORY_ID, narration: "下次是一個地名，很遠，沒有車到。" },
    },
    {
      incoming: { kind: "message", text: "欸，你什麼時候有空？淡水漁人碼頭我一直想去看夕陽。這次換我約。" },
      // 中間還有兩天的聊天，赴約不一定趕得上這個週末，不要寫「這週末」
      replies: ["週末。我週末有空。", "我看一下行事曆……週末有空。"],
      comeback: { stamp: "下次吧", aside: "這是第二個主動找我的人。第一個要我加 LINE 看盤。" },
    },
    ...AFTER_COMEBACK,
    dateStep(2, TRUE_ENDING_ID),
  ],
};

/** 舊路線 14 步，每一步在新路線的位置；中間空出來的 6、7、10、16、17 是約會之間的聊天 */
const LEGACY_STEP_POSITIONS: readonly number[] = [0, 1, 2, 3, 4, 5, 8, 9, 11, 12, 13, 14, 15, 18];

/**
 * 舊存檔還沒走到這一步時，改從哪裡接：新聊天排在這一步之前，舊存檔也玩得到。
 * 其他情況原地不動，已經約好的約會和演到一半的假失敗不會被往後推。
 */
const LEGACY_RESUME_AT: Readonly<Record<number, number>> = { 6: 6, 8: 10 };

/**
 * 舊存檔的 stepIndex、replies 換成新路線的位置。
 * 已經跳過的新聊天補第 0 句，對話紀錄才接得起來；這幾步不計分，不影響總分。
 */
export function upgradeLegacyHeroineChat(stepIndex: number, replies: readonly unknown[]) {
  const oldStep = Math.min(stepIndex, LEGACY_STEP_POSITIONS.length - 1);
  const newStep = LEGACY_RESUME_AT[oldStep] ?? LEGACY_STEP_POSITIONS[oldStep];
  const upgraded: unknown[] = new Array<unknown>(newStep).fill(0);
  for (let i = 0; i < oldStep; i++) upgraded[LEGACY_STEP_POSITIONS[i]] = replies[i];
  return { stepIndex: newStep, replies: upgraded };
}

/** 總分不夠就換到這條：前面的對話一樣，只多一句客氣的告別 */
export const HEROINE_ALMOST_STORY: Story = {
  id: HEROINE_ALMOST_STORY_ID,
  dexName: "差一點",
  dexQuip: "她很客氣。客氣是一種很完整的拒絕。",
  category: "fade",
  steps: [
    ...CHAT_STEPS,
    {
      incoming: { kind: "message", text: "謝謝你陪我聊天。最近比較忙，先這樣喔。" },
      ending: { narration: "這次我什麼都沒做錯，也什麼都沒做對。" },
    },
  ],
};
