/**
 * 真結局的腳本：第三次約會告白、開始交往之後，照時間順序一段一段按著看。畫面在 screens/TrueEndingScreen.tsx。
 * 靠在床上的那段是交往滿兩個月的事，要排在回嘉義、求婚和婚禮之前。
 */

import type { Beat } from "./beats.ts";

export type TrueEndingScene = "noodles" | "intimate" | "chiayi" | "proposal" | "wedding" | "baby" | "title";

export const TRUE_ENDING_BEATS: readonly Beat<TrueEndingScene>[] = [
  { scene: "noodles", fade: "slow", text: "泡麵要等三分鐘。以前這是一天裡最確定會有結果的事。現在她在旁邊，一直問好了沒。" },
  {
    scene: "intimate",
    fade: "slow",
    text: "交往滿兩個月的那天晚上。這張床以前只有我跟手機。現在她靠過來，眼鏡撞到我的眼鏡，喀一聲。我說：「妳的頭有點重。」她說：「嗯。」沒有要移開的意思。我也沒有要她移開。",
  },
  { scene: "chiayi", text: "媽塞了一袋橘子給她，叫她到台北要記得吃飯。媽沒有塞給我。" },
  { scene: "proposal", text: "我把求婚詞寫了十九版，最後一版只有一句。她說：「你今天很緊張耶。」然後說好。" },
  { scene: "wedding", text: "同事都來了，這次揪團我沒有剛好額滿。西裝有點緊，她說沒關係。" },
  {
    scene: "baby",
    text: "凌晨三點，他哭，我抱著他在房間走來走去。手機亮了，是她從隔壁傳來的：「換我嗎？」我回：「不用，妳睡。」",
  },
  { scene: "title", fade: "slow", text: "真結局\n已讀。\n然後她回了。" },
];
