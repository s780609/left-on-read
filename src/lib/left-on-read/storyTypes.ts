/**
 * 劇情的資料型別。一般回覆只影響這一句怎麼說，不會改變結局；decision 和她路線的欄位例外。
 */

export type StoryCategory = "ghost" | "fade" | "pitch" | "quick";

export type Incoming =
  | { kind: "message"; text: string }
  | { kind: "read" }
  | { kind: "unread" }
  | { kind: "vanished" }
  | { kind: "narration"; text: string }
  /** 這一步由冠宇先開口，她沒有先傳東西 */
  | { kind: "none" };

/** 聊天隱性數值：好感／尷尬／已讀壓力 */
export interface ChatStats {
  affection: number;
  awkward: number;
  pressure: number;
}

/** 從上一步推進後要等多久，預設 { days: 1 }；等星期時當天不算；days 0 只有假失敗能用 */
export type StepWait = { days: number } | { weekday: number };

export interface ReplyStep {
  incoming: Incoming;
  /** 她在 incoming 之前先傳的幾則，讓突然的問題有鋪陳；步驟數不變，舊存檔的 stepIndex 不受影響 */
  lead?: readonly string[];
  wait?: StepWait;
  /** 2～3 句；有 answer 或 fakeEnding 的步驟可以只有 1 句 */
  replies: readonly string[];
  /** 選了第 choice 句就付 cost、走向這一局的結局 */
  decision?: { choice: number; cost: number; endingId: string };
  /** 每句回覆的分數（+1、0、-1），和 replies 一一對應 */
  scores?: readonly number[];
  /** 隱性數值變化；沒寫就從 scores 推，再沒有就用預設 */
  deltas?: readonly Partial<ChatStats>[];
  /** 回完這一步時總分低於 minScore，聊天就換到 failStoryId 這條路線 */
  gate?: { minScore: number; failStoryId: string };
  /** 冠宇傳完，她當場回的那一句 */
  answer?: string;
  /** 她依冠宇選的那句當場回，和 replies 一一對應；有寫就優先於 answer */
  answers?: readonly string[];
  /** 約會：不能在聊天室回，要週末白天付 cost 赴約，replies 是約會裡的選項；有 endingId 就走向這一局的結局 */
  date?: { index: number; cost: number; endingId?: string };
  /** 冠宇的內心 OS，出現在回覆選項上方（假失敗那步用） */
  os?: readonly string[];
  /** 假失敗：畫面演得像 storyId 那種失敗，但不記圖鑑，也不結束聊天 */
  fakeEnding?: { storyId: string; narration: string };
  /** 假失敗之後她主動回來：早上一開始就跳出來，stamp 是裂開的印章，aside 是冠宇的旁白 */
  comeback?: { stamp: string; aside: string };
}

/** 結局的內容：旁白、花掉的錢、要不要顯示反詐騙提醒 */
export interface EndingContent {
  narration: string;
  cost?: number;
  antiFraud?: boolean;
}

/**
 * 另一個結局：前面某一步選了某一句，最後她傳的和旁白就換成這個。
 * 只換最後一步的內容，不新增步驟，舊存檔的 stepIndex／replies 照樣對得上。
 */
export interface EndingVariant {
  when: { step: number; choice: number };
  /** 不給就沿用原本最後一步她傳的 */
  incoming?: Incoming;
  ending: EndingContent;
}

export interface FinalStep {
  incoming: Incoming;
  wait?: StepWait;
  ending: EndingContent;
  /** 照順序找第一個符合的；都不符合就是原本的結局（第 1 個） */
  variants?: readonly EndingVariant[];
}

export interface Story {
  id: string;
  dexName: string;
  dexQuip: string;
  category: StoryCategory;
  steps: readonly (ReplyStep | FinalStep)[];
  /** 她最討厭已讀不回：已讀壓力累積到 max，睡一覺起來她就走了，換到 leaveStoryId 的結局 */
  patience?: { max: number; leaveStoryId: string };
}

/** memory 是新遊戲＋才有的開場白 */
export type OpenerKind = "hi" | "whatsup" | "eaten" | "interest" | "memory";

export interface Chat {
  id: number;
  girlSeed: number;
  storyId: string;
  opener: OpenerKind;
  /** 下一個要揭示的步驟 */
  stepIndex: number;
  lastAdvancedDay: number;
  /** 每步選了第幾句，一般劇情只影響對話紀錄，她的路線用來計分 */
  replies: number[];
  /** 小晴：今晚是否已用過「白天回完晚上再回一次」；舊存檔沒有就當 false */
  heroineNightUsed?: boolean;
  /** 一般失敗劇情：今天這一輪她已經接著傳過一次（一輪最多兩步）；舊存檔沒有就當 false */
  roundUsed?: boolean;
  /** 隱性數值；舊存檔沒有就從 0 起算 */
  stats?: ChatStats;
  /** 失敗結局已確認（圖鑑已記）；舊存檔沒有就當 false。玩家可自行刪除 */
  closed?: boolean;
}
