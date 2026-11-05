/**
 * 真結局：小晴的路線。第一條選項會影響結果的路線，只有右滑她才會走。
 * 聊天計分 → 三次約會，第二次之後有假失敗 → 第三次約會走向真結局（腳本在 ../trueEnding.ts）。
 */

import { HEROINE_DATE_COSTS, HEROINE_PASS_SCORE, TRUE_ENDING_ID } from "../constants.ts";
import type { ReplyStep, Story } from "../storyTypes.ts";

export const HEROINE_STORY_ID = "heroine";
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
    {
      // 至少隔兩天，第二次約會一定是另一個週末
      wait: { days: 2 },
      incoming: { kind: "message", text: "下週末大稻埕有煙火，要不要去？" },
      replies: ["好啊，我去", "煙火幾點？我先查捷運末班車"],
    },
    dateStep(1),
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
      replies: ["這週末。我這週末有空。", "我看一下行事曆……這週末有空。"],
      comeback: { stamp: "下次吧", aside: "這是第二個主動找我的人。第一個要我加 LINE 看盤。" },
    },
    dateStep(2, TRUE_ENDING_ID),
  ],
};

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
