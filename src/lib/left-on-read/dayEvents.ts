/**
 * 白天的小事件：同事揪唱歌、主管叫加班、颱風假、發票對獎……
 * 每一天有沒有事件、是哪一個、發票中不中，全部由 runSeed 和 dayIndex 決定，重新載入不能重擲。
 */

import { calendarOf, isWorkday } from "./calendar.ts";
import { DAY_EVENT_RATE, INVOICE_PRIZE, INVOICE_WIN_P, OVERTIME_PAY, TYPHOON_REPLY_BONUS } from "./constants.ts";
import { holidayOf } from "./holidays.ts";
import { createRng, mixSeed, pick } from "./rng.ts";

export interface DayEventChoice {
  label: string;
  /** 選完之後的那句 */
  line: string;
  /** 正數是收入，負數是花費；錢不夠就不能選 */
  money?: number;
  /** 加班：今晚不能滑 Swipy，晚餐公司出 */
  overtime?: boolean;
  /** 下班跟同事出去：晚餐在外面吃過了，回到家直接是深夜 */
  outing?: boolean;
}

export interface DayEvent {
  id: string;
  text: string;
  choices: readonly DayEventChoice[];
  /** 今天白天多回幾則 */
  replyBonus?: number;
  /** 只在平日或只在週末出現 */
  when: "workday" | "weekend" | "any";
}

/** 隨機抽到的事件 */
export const DAY_EVENTS: readonly DayEvent[] = [
  {
    id: "karaoke",
    when: "workday",
    text: "同事說今晚下班要去唱歌。這次揪的時候，有算到我。",
    choices: [
      {
        label: "去（NT$600）",
        money: -600,
        outing: true,
        line: "我點了一首，唱到副歌才發現大家在聊天。但走的時候，有人說下次再一起來。回到家已經十一點，晚餐在包廂吃過了。",
      },
      { label: "說我有事", line: "我說我有事。我沒有事。回家的路上，我一直在想他們唱到哪一首了。" },
    ],
  },
  {
    id: "overtime",
    when: "workday",
    text: "主管走過來：「今天可以留晚一點嗎？」",
    choices: [
      {
        label: `好（加班費 +${OVERTIME_PAY.toLocaleString("en-US")}）`,
        money: OVERTIME_PAY,
        overtime: true,
        line: "加班到十點。公司便當是排骨的，比我平常自己買的好吃。今晚沒力氣滑卡了。",
      },
      { label: "「我今天有約。」", line: "主管說好。我約的是 Swipy。" },
    ],
  },
  {
    id: "typhoon",
    when: "workday",
    text: "颱風假。半夜宣布的，我醒來才看到。",
    replyBonus: TYPHOON_REPLY_BONUS,
    choices: [{ label: "好耶", line: "整天在家，手機一直拿在手上。今天可以多回幾則。" }],
  },
  {
    id: "guava",
    when: "any",
    text: "媽寄了一箱芭樂來。紙條上寫：「要分給同事。」",
    choices: [
      { label: "分給同事", line: "同事說謝謝，問我是不是嘉義人。這是我們第一次聊超過三句。" },
      { label: "自己吃", line: "我一天吃四顆。第三天開始，我覺得芭樂在看我。" },
    ],
  },
  {
    id: "wedding",
    when: "weekend",
    text: "大學同學結婚，喜帖寄到公司。",
    choices: [
      {
        label: "包 2,000 去",
        money: -2_000,
        line: "新郎是以前跟我一起打電動的。他拍拍我：「你也快了啦。」我說對。我們都知道不對。",
      },
      { label: "包 1,600 不去", money: -1_600, line: "禮到人不到。他回了一張貼圖。我們的友情很有效率。" },
    ],
  },
  {
    id: "lost-umbrella",
    when: "workday",
    text: "下午下大雨。我的傘不見了。隔壁座位的同事說她多帶一把。",
    choices: [
      { label: "「謝謝，我明天還妳。」", line: "她說不用急。我把傘擦乾，放在桌上，看了一整個下午。她已婚。" },
      { label: "「沒關係，我淋回去。」", line: "我淋回去了。感冒了兩天。沒有人知道我拒絕過一把傘。" },
    ],
  },
];

/** 統一發票：單數月 25 號開獎，那天一定有 */
function invoiceEvent(win: boolean): DayEvent {
  return {
    id: win ? "invoice-win" : "invoice-lose",
    when: "any",
    text: "今天統一發票開獎。我把皮夾裡的發票全部拿出來。",
    choices: [
      win
        ? {
            label: "對獎",
            money: INVOICE_PRIZE,
            line: `中了 ${INVOICE_PRIZE} 元。是一張便利商店的泡麵發票。泡麵終於回報我了。`,
          }
        : { label: "對獎", line: "一張都沒中。我對了兩次。第二次比較認真。" },
    ],
  };
}

export function isInvoiceDay(dayIndex: number): boolean {
  const c = calendarOf(dayIndex);
  return c.day === 25 && c.month % 2 === 1;
}

/** 今天白天的事件；沒有就是 null。節日當天不會有隨機事件，台詞已經夠多了 */
export function dayEventOf(runSeed: number, dayIndex: number): DayEvent | null {
  const rng = createRng(mixSeed(runSeed, dayIndex, 0xe7e));
  if (isInvoiceDay(dayIndex)) return invoiceEvent(rng() < INVOICE_WIN_P);
  if (holidayOf(dayIndex)) return null;
  if (rng() >= DAY_EVENT_RATE) return null;
  const workday = isWorkday(calendarOf(dayIndex));
  const pool = DAY_EVENTS.filter((e) => e.when === "any" || (e.when === "workday") === workday);
  return pick(rng, pool);
}
