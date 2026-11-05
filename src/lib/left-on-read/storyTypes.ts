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

/** 從上一步推進後要等多久，預設 { days: 1 }；等星期時當天不算；days 0 只有假失敗能用 */
export type StepWait = { days: number } | { weekday: number };

export interface ReplyStep {
  incoming: Incoming;
  wait?: StepWait;
  /** 2～3 句；有 answer 或 fakeEnding 的步驟可以只有 1 句 */
  replies: readonly string[];
  /** 選了第 choice 句就付 cost、走向這一局的結局 */
  decision?: { choice: number; cost: number; endingId: string };
  /** 每句回覆的分數（+1、0、-1），和 replies 一一對應 */
  scores?: readonly number[];
  /** 回完這一步時總分低於 minScore，聊天就換到 failStoryId 這條路線 */
  gate?: { minScore: number; failStoryId: string };
  /** 冠宇傳完，她當場回的那一句 */
  answer?: string;
  /** 約會：不能在聊天室回，要週末白天付 cost 赴約，replies 是約會裡的選項；有 endingId 就走向這一局的結局 */
  date?: { index: number; cost: number; endingId?: string };
  /** 假失敗：畫面演得像 storyId 那種失敗，但不記圖鑑，也不結束聊天 */
  fakeEnding?: { storyId: string; narration: string };
  /** 假失敗之後她主動回來：早上一開始就跳出來，stamp 是裂開的印章，aside 是冠宇的旁白 */
  comeback?: { stamp: string; aside: string };
}

export interface FinalStep {
  incoming: Incoming;
  wait?: StepWait;
  ending: { narration: string; cost?: number; antiFraud?: boolean };
}

export interface Story {
  id: string;
  dexName: string;
  dexQuip: string;
  category: StoryCategory;
  steps: readonly (ReplyStep | FinalStep)[];
}

export type OpenerKind = "hi" | "whatsup" | "eaten" | "interest";

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
}
