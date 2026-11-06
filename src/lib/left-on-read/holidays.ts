/**
 * 節日：遊戲用真實日曆，節日當天的台詞會換，晚上的牌組也會跟著變。
 * 國曆節日每年都有；農曆節日只寫到 2027 年，之後就不過了（冠宇大概也沒在過）。
 */

import { calendarOf } from "./calendar.ts";

export interface Holiday {
  id: string;
  name: string;
  /** 取代當天白天或深夜的那句話 */
  line: string;
  /** 當晚 Swipy 的配對率倍率 */
  matchMult: number;
  /** 滑卡畫面上的系統提示 */
  swipeHint?: string;
  /** 情侶的節日：一個人睡覺有成就 */
  couple?: boolean;
}

const SOLAR: readonly (Holiday & { month: number; day: number })[] = [
  {
    month: 2,
    day: 14,
    id: "valentine",
    name: "情人節",
    line: "情人節。巷口的花店排到馬路上。我買了一杯珍奶，店員問要不要兩杯。",
    matchMult: 0.5,
    swipeHint: "系統提示：今晚大家都有約了。",
    couple: true,
  },
  {
    month: 3,
    day: 14,
    id: "white-day",
    name: "白色情人節",
    line: "白色情人節。我上網查了這是什麼節日。查完覺得跟我沒有關係。",
    matchMult: 0.8,
  },
  {
    month: 5,
    day: 20,
    id: "520",
    name: "520",
    line: "520。同事傳了一張「我愛你」的貼圖到群組，十秒後收回，說傳錯了。",
    matchMult: 0.8,
  },
  {
    month: 8,
    day: 8,
    id: "fathers-day",
    name: "父親節",
    line: "父親節。打電話回家，爸說：「好。」然後把電話交給媽。我們父子的感情就是這樣，很穩定。",
    matchMult: 1,
  },
  {
    month: 11,
    day: 11,
    id: "singles-day",
    name: "光棍節",
    line: "雙十一。購物車裡放了一個人份的電鍋。系統問我要不要加購第二件六折。",
    matchMult: 1.5,
    swipeHint: "系統提示：今晚很多人也是一個人。",
  },
  {
    month: 12,
    day: 24,
    id: "christmas-eve",
    name: "平安夜",
    line: "平安夜。公司交換禮物，我抽到一個自己送出去的保溫杯。",
    matchMult: 0.5,
    swipeHint: "系統提示：今晚大家都有約了。",
    couple: true,
  },
  {
    month: 12,
    day: 25,
    id: "christmas",
    name: "耶誕節",
    line: "耶誕節。便利商店的店員戴著麋鹿角。她跟我說聖誕快樂，我說妳也是。這是今天最有節日氣氛的時候。",
    matchMult: 0.7,
  },
  {
    month: 12,
    day: 31,
    id: "new-years-eve",
    name: "跨年",
    line: "跨年夜。101 的煙火我在手機上看。直播延遲三秒，所以我的新年比大家晚三秒。",
    matchMult: 0.6,
    swipeHint: "系統提示：今晚大家都有約了。",
    couple: true,
  },
];

/** 母親節：五月第二個星期日 */
const MOTHERS_DAY: Holiday = {
  id: "mothers-day",
  name: "母親節",
  line: "母親節。打電話回家，媽問我有沒有女朋友。我說有在努力。她說努力不能吃。",
  matchMult: 1,
};

/** 農曆節日：寫死日期 */
const LUNAR: readonly (Holiday & { date: string })[] = [
  {
    date: "2026-06-19",
    id: "dragon-boat",
    name: "端午節",
    line: "端午節。媽寄來十顆粽子，冷凍庫塞不下。我決定一天吃兩顆，這是我這週唯一確定的計畫。",
    matchMult: 1,
  },
  {
    date: "2026-08-19",
    id: "qixi",
    name: "七夕",
    line: "七夕。牛郎織女一年見一次面。我算了一下，他們的見面頻率比我高。",
    matchMult: 0.5,
    swipeHint: "系統提示：今晚大家都有約了。",
    couple: true,
  },
  {
    date: "2026-09-25",
    id: "mid-autumn",
    name: "中秋節",
    line: "中秋節。沒回嘉義。樓下有人在烤肉，香味飄上來，我配泡麵吃完了一整晚的月亮。",
    matchMult: 0.8,
  },
  {
    date: "2027-02-06",
    id: "lunar-new-year",
    name: "春節",
    line: "大年初一。親戚問我交女朋友了沒。我說在努力。表姊說：「你不要太挑。」我沒有挑過任何東西。",
    matchMult: 1.2,
  },
  {
    date: "2027-06-09",
    id: "dragon-boat",
    name: "端午節",
    line: "端午節。今年的粽子媽寄了二十顆，她說去年的太少。去年的我吃到七月。",
    matchMult: 1,
  },
  {
    date: "2027-08-08",
    id: "qixi",
    name: "七夕",
    line: "七夕剛好撞到父親節。爸說他從來不過七夕。我跟爸很像。",
    matchMult: 0.5,
    swipeHint: "系統提示：今晚大家都有約了。",
    couple: true,
  },
  {
    date: "2027-09-15",
    id: "mid-autumn",
    name: "中秋節",
    line: "中秋節。今年有回嘉義。媽切了一個柚子，在我頭上戴柚子皮帽，拍照傳到家族群組。",
    matchMult: 0.8,
  },
];

const pad = (n: number) => String(n).padStart(2, "0");

export function holidayOf(dayIndex: number): Holiday | null {
  const c = calendarOf(dayIndex);
  const iso = `${c.year}-${pad(c.month)}-${pad(c.day)}`;
  const lunar = LUNAR.find((h) => h.date === iso);
  if (lunar) return lunar;
  const solar = SOLAR.find((h) => h.month === c.month && h.day === c.day);
  if (solar) return solar;
  // 母親節：五月第二個星期日，日期落在 8～14 號
  if (c.month === 5 && c.weekday === 0 && c.day >= 8 && c.day <= 14) return MOTHERS_DAY;
  return null;
}

export function holidayMatchMult(dayIndex: number): number {
  return holidayOf(dayIndex)?.matchMult ?? 1;
}
