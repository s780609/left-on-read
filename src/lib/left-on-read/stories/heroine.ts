/**
 * 真結局：小晴的路線。第一條選項會影響結果的路線，只有右滑她才會走。
 * 聊天計分 → 三次約會，約會之間有日常聊天，第二次之後有假失敗 → 第三次約會走向真結局（腳本在 ../trueEnding.ts）。
 */

import { HEROINE_DATE_COSTS, HEROINE_PASS_SCORE, TRUE_ENDING_ID } from "../constants.ts";
import type { ReplyStep, Story } from "../storyTypes.ts";

/** 步驟數變過，id 跟著換：讀到舊 id 就遷移 stepIndex，見 upgradeLegacyHeroineChat / upgradeHeroineV2Chat */
export const HEROINE_STORY_ID = "heroine-v3";
/** 中間插過約會閒聊與威秀場次確認的版本；讀檔時升到 v3 */
export const HEROINE_V2_STORY_ID = "heroine-v2";
export const LEGACY_HEROINE_STORY_ID = "heroine";
export const HEROINE_ALMOST_STORY_ID = "heroine-almost";

/** 假失敗之後她消失幾天才主動回來 */
export const COMEBACK_DAYS = 4;

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
  /** 錢不夠、跟她借了錢才來的時候，收尾前多的那一句 */
  brokeNote?: string;
  /**
   * 選擇之前的幾段曖昧，一段一段按著看。scene 是這一段要用的插圖 id（pixel/heroineScenes.ts 的 DATE_MOMENT_SCENES），
   * 沒寫就用這次約會的主圖
   */
  moments?: readonly { text: string; scene?: string }[];
}

export const HEROINE_DATES: readonly HeroineDate[] = [
  {
    place: "信義威秀",
    activity: "看電影，然後吃美食街。",
    cost: HEROINE_DATE_COSTS[0],
    moments: [
      {
        scene: "movieHands",
        text: "爆米花放在我們中間的扶手上。電影演到一半，我們的手在桶子裡碰到兩次。第二次她沒有縮回去，是我先縮的。",
      },
      { text: "片尾字幕跑完，燈亮了，她還沒站起來。我也沒有。我們好像都在等對方先說「走吧」。" },
    ],
    opening: "結帳的時候，她拿出錢包。",
    options: [
      { text: "「我請妳，妳請我喝飲料就好。」", response: "她笑了：「好啊。」" },
      { text: "「那我們 AA？我有準備零錢。」", response: "她愣了一下，也笑了：「你真的準備了。」" },
    ],
    closing: "我第一次沒有在散場後查回家最快的路線。",
    brokeNote: "說完我才想到，我要請的錢，是剛剛跟她借的。她好像也想到了，沒有說破。",
  },
  {
    place: "大稻埕",
    activity: "逛夜市、看煙火。",
    cost: HEROINE_DATE_COSTS[1],
    moments: [
      {
        scene: "nightMarket",
        text: "夜市人太多。她說：「你走前面，我拉著你的衣服。」我走得很慢，比平常慢很多。",
      },
      { text: "她的手機沒電了，借我的拍照。我的相簿從那天起，第一次有一張照片裡有別人。" },
    ],
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
    place: "板橋耶誕城",
    activity: "看燈、擠人潮。",
    cost: HEROINE_DATE_COSTS[2],
    moments: [
      {
        scene: "treePhoto",
        text: "排隊在聖誕樹前拍照，後面的阿姨說：「你們兩個靠近一點啦。」她沒有反駁，往我這邊靠了一點。",
      },
    ],
    opening: "聖誕樹上的燈一層一層亮起來。人潮把我們擠得很近，她的手很冰，我想了三分鐘要不要講這件事。",
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

function dateStep(index: number, endingId?: string, wait?: ReplyStep["wait"]): ReplyStep {
  const date = HEROINE_DATES[index];
  return {
    // 約會完才會出現在對話紀錄
    incoming: { kind: "narration", text: `（${date.place}）` },
    replies: date.options.map((o) => o.text),
    date: { index, cost: date.cost, endingId },
    ...(wait ? { wait } : {}),
  };
}

/*
 * 約會之間的聊天：這些回覆不計分，也不會改變結局。
 * 她不知道冠宇在約會裡選了哪一句，對白要兩個選項都接得上；
 * 訊息可能隔好幾天才被回，不要寫「昨天」「明天」這種綁定日子的詞。
 */

/** 威秀散場、回到家當晚：先收住這次約會，不要直接跳下一個話題 */
const AFTER_FIRST_DATE_HOME: ReplyStep = {
  wait: { days: 0 },
  lead: ["我到家了。"],
  incoming: { kind: "message", text: "今天謝謝你。剛洗完澡，有點想睡覺了。" },
  replies: ["我也是。安全到家就好。晚安。", "嗯。那部片我還在回味。妳先睡。"],
  answers: ["嗯，晚安。做個好夢。", "好，那明天再吵你。晚安。"],
};

/** 威秀之後、大稻埕邀約之前（隔天起） */
const AFTER_FIRST_DATE: readonly ReplyStep[] = [
  {
    lead: ["那天謝謝你，我很開心。", "我把票根夾在書裡了。不要問為什麼。"],
    incoming: { kind: "message", text: "欸，那部片的結局你看懂了嗎？我回家想了好久" },
    replies: ["老實說沒有。但當場不敢講，怕妳覺得我很笨", "我查了三篇影評，現在懂了。要我解釋嗎"],
    answers: ["我也沒看懂啦！我還以為只有我這樣", "不用，我想繼續不懂。不過你真的去查了三篇喔，好認真。"],
  },
  {
    // 這次換冠宇先開口
    incoming: { kind: "none" },
    replies: ["今天主管還有念妳嗎？", "我今天午休突然想到妳。就這樣，沒有別的事"],
    answers: ["有。但我今天頂嘴了，在心裡。", "……你這樣講我要怎麼回啦。好啦，我也是。"],
  },
];

/** 大稻埕煙火後、回到家當晚 */
const AFTER_SECOND_DATE_HOME: ReplyStep = {
  wait: { days: 0 },
  lead: ["外套還有一點煙火的味道。"],
  incoming: { kind: "message", text: "到家了嗎？今天人好多，我腳快斷了。" },
  replies: ["到了。今天很開心。妳早點休息。", "到了。煙火超好看，尤其是最後那一波。"],
  answers: ["嗯，你也是。晚安。", "對吧！我還在存照片。你先睡。"],
};

/** 大稻埕隔天：最後一次這麼自然，假失敗才會痛 */
const AFTER_SECOND_DATE: ReplyStep = {
  lead: ["我的外套現在還有雞排味。", "你手機裡那張我拍的煙火，傳給我好不好。我想設成桌布。"],
  incoming: { kind: "message", text: "明年要記得早點去占位子，這次差點看不到" },
  replies: ["好，我記下來了。明年。", "我開個行事曆提醒，提前三百六十天通知妳"],
  answers: ["嗯，明年。", "三百六十天也太早了吧。好啦，你提醒我。"],
};

/** 她回來之後、板橋耶誕城之前：把假失敗那段講開，不要讓它不了了之 */
const AFTER_COMEBACK: readonly ReplyStep[] = [
  {
    lead: ["前陣子對不起。加班是真的，但我回得很敷衍。"],
    incoming: { kind: "message", text: "你是不是以為我不想理你了" },
    replies: ["有一點。我還幫這件事取了名字，叫「下次吧」", "沒有啊。好啦，有。"],
    answers: ["這名字也太慘了吧。對不起啦。這次是我約的，不會是下次。", "你真的很不會說謊。加班那幾天，我一直在想煙火的事。"],
  },
  {
    lead: ["上次在大稻埕，你走得好慢。這次換我走前面。"],
    incoming: { kind: "message", text: "那天多穿一件，耶誕城人很多又很冷。" },
    replies: ["好。我查了點燈時間，提早半小時到，留一點誤差", "好。那妳也穿厚一點"],
    answers: ["你是要發射火箭嗎。好啦，聽你的。", "我才不要，我要穿好看的。冷再說。"],
  },
];

/** 第一階段：分數順序刻意打散，不能每題都選同一個位置 */
const CHAT_STEPS: readonly ReplyStep[] = [
  {
    // 開場白不一定有提到電影，「你也喜歡」只接得上興趣句；改成她先講自己
    incoming: { kind: "message", text: "我很愛看電影欸！你呢？最近看了什麼" },
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

/**
 * 過了門檻之後她當場回的那句：冠宇可能已經約了，也可能沒約，下一句才接得上。
 * 只放在她的路線；走回「差一點」的那份沒有，不然她會先說好、再說先這樣。
 */
const PASSED_GATE_STEP: ReplyStep = {
  ...CHAT_STEPS[3],
  answers: [
    "……你可以直接問要不要出來就好。好啦，我們去看電影。",
    "好啊！我剛好有一部想看。",
    "哈哈。那週末換你陪我去看電影，就這樣說定了。",
  ],
};

export const HEROINE_STORY: Story = {
  id: HEROINE_STORY_ID,
  dexName: "小晴",
  dexQuip: "這一筆不會被記進失敗圖鑑。",
  category: "fade",
  steps: [
    ...CHAT_STEPS.slice(0, 3),
    PASSED_GATE_STEP,
    {
      // 上一句已經講好要去看電影，她馬上接著講哪一部，不要隔天才來
      wait: { days: 0 },
      incoming: { kind: "message", text: "信義威秀那部新上的，我一直想看。就那部？" },
      replies: ["好，我查一下場次", "好。我把那天空下來了，雖然本來就是空的"],
      // 冠宇說要查，她就等他回場次，不要自己先講好了
      answers: ["好～你查完跟我說要哪一場", "嗯，你定時間就好。我都可以。"],
    },
    {
      // 同一輪就把場次講死，赴約前狀態列「約好了」才接得上
      wait: { days: 0 },
      incoming: { kind: "none" },
      // 兩句都講清楚票是冠宇訂的
      replies: ["週六下午 14:30 那場評價不錯，票我來訂，可以嗎？", "我看了，週六 14:30。票我來訂"],
      answers: ["可以！那週六 14:30 信義威秀見。票交給你，別遲到喔。", "收到～週六下午見。謝謝你訂。"],
    },
    dateStep(0),
    AFTER_FIRST_DATE_HOME,
    ...AFTER_FIRST_DATE,
    {
      // 至少隔兩天，第二次約會一定是另一個週末
      wait: { days: 2 },
      incoming: { kind: "message", text: "下週末大稻埕有煙火，要不要去？" },
      replies: ["好啊，週六傍晚六點半那邊見", "煙火七點半開始？我六點半到，順便查末班車"],
      answers: [
        "嗯，六點半大稻埕碼頭集合。我穿比較好認的顏色。",
        "對，七點半開始。那六點半見，別為了末班車跑太兇。",
      ],
    },
    dateStep(1),
    AFTER_SECOND_DATE_HOME,
    AFTER_SECOND_DATE,
    /*
     * 假失敗：同一段對話一口氣聊完（冠宇的每一句都是在接她剛回的那句，隔天才接很怪），
     * 聊完當下就按「……就這樣了」，然後她消失 COMEBACK_DAYS 天才回來
     */
    { incoming: { kind: "none" }, replies: ["最近有空嗎？想約妳"], answer: "這週專案爆了，天天加班" },
    { wait: { days: 0 }, incoming: { kind: "none" }, replies: ["好，那妳先忙"], answer: "這陣子大概都會很忙" },
    { wait: { days: 0 }, incoming: { kind: "none" }, replies: ["好，那妳有空再說"], answer: "嗯，忙完第一個找你" },
    {
      // 她回完，當下就可以按「……就這樣了」
      wait: { days: 0 },
      incoming: { kind: "none" },
      os: [
        "還是 GG 了嗎？",
        "約了兩次都被打槍。",
        "我看還是別約了，免得變成性騷擾。",
      ],
      replies: ["……就這樣了"],
      fakeEnding: { storyId: FAKE_ENDING_STORY_ID, narration: "下次是一個地名，很遠，沒有車到。" },
    },
    {
      // 消失幾天才回來，玩家才會真的以為斷了；她說「這陣子」，幾天後忙完說得通
      wait: { days: COMEBACK_DAYS },
      incoming: { kind: "message", text: "對不住讓你等。這幾天終於忙完了。再下個週末，板橋耶誕城一起去看燈？這次換我約。" },
      // 中間還有兩天聊天；約的是「再下個週末」，不要講成這個週六
      replies: ["好。就再下週六晚上七點。", "可以。再下週六七點，我記行事曆。"],
      answers: ["好，再下週六七點板橋車站見。記得穿厚一點。", "再下週六七點見。我等你。"],
      comeback: { stamp: "下次吧", aside: "這是第二個主動找我的人。第一個要我加 LINE 看盤。" },
    },
    ...AFTER_COMEBACK,
    dateStep(2, TRUE_ENDING_ID, { days: 5 }),
  ],
};

/** 最初 14 步路線，每一步在 v3 的位置；空出來的是場次確認、當晚收尾、約會之間聊天 */
const LEGACY_STEP_POSITIONS: readonly number[] = [0, 1, 2, 3, 4, 6, 10, 11, 14, 15, 16, 17, 18, 21];

/**
 * 舊存檔還沒走到這一步時，改從哪裡接：新聊天排在這一步之前，舊存檔也玩得到。
 * 已經約好的約會、演到一半的假失敗不往後推；當晚收尾略過（舊存檔通常已隔天）。
 */
const LEGACY_RESUME_AT: Readonly<Record<number, number>> = { 6: 8, 8: 13 };

/** v2（20 步）→ v3：在兩次約會後各插入一則當晚收尾 */
const V2_STEP_POSITIONS: readonly number[] = [
  0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21,
];

function remapHeroineSteps(stepIndex: number, replies: readonly unknown[], positions: readonly number[], resumeAt: Readonly<Record<number, number>> = {}) {
  const oldStep = Math.min(stepIndex, positions.length - 1);
  const newStep = resumeAt[oldStep] ?? positions[oldStep];
  const upgraded: unknown[] = new Array<unknown>(newStep).fill(0);
  for (let i = 0; i < oldStep; i++) upgraded[positions[i]] = replies[i];
  return { stepIndex: newStep, replies: upgraded };
}

/**
 * 舊存檔的 stepIndex、replies 換成新路線的位置。
 * 已經跳過的新聊天補第 0 句，對話紀錄才接得起來；這幾步不計分，不影響總分。
 */
export function upgradeLegacyHeroineChat(stepIndex: number, replies: readonly unknown[]) {
  return remapHeroineSteps(stepIndex, replies, LEGACY_STEP_POSITIONS, LEGACY_RESUME_AT);
}

/** heroine-v2 存檔升到 v3：補上兩次約會的當晚收尾 */
export function upgradeHeroineV2Chat(stepIndex: number, replies: readonly unknown[]) {
  return remapHeroineSteps(stepIndex, replies, V2_STEP_POSITIONS);
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
