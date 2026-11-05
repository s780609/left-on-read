/**
 * 失敗劇情的資料型別。回覆選項只影響這一句怎麼說，不會改變結局；只有 decision 那一句例外。
 */

export type StoryCategory = "ghost" | "fade" | "pitch" | "quick";

export type Incoming =
  | { kind: "message"; text: string }
  | { kind: "read" }
  | { kind: "unread" }
  | { kind: "vanished" }
  | { kind: "narration"; text: string };

/** 從上一步推進後要等多久，預設 { days: 1 }；等星期時當天不算 */
export type StepWait = { days: number } | { weekday: number };

export interface ReplyStep {
  incoming: Incoming;
  wait?: StepWait;
  /** 2～3 句 */
  replies: readonly string[];
  /** 選了第 choice 句就付 cost、走向這一局的結局 */
  decision?: { choice: number; cost: number; endingId: string };
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
  /** 每步選了第幾句，只影響對話紀錄 */
  replies: number[];
}
