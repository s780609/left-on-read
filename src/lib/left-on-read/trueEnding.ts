/**
 * 真結局的腳本：第三次約會告白、開始交往之後，照時間順序一段一段按著看。畫面在 screens/TrueEndingScreen.tsx。
 * 靠在床上的那段是交往滿兩個月的事，要排在回嘉義、求婚和婚禮之前。
 * 溫柔靠著之後接一段露骨的，再接到 NSFW 插圖，然後才是回嘉義。
 */

import type { Beat } from "./beats.ts";

export type TrueEndingScene =
  | "noodles"
  | "intimate"
  | "intimateSex"
  | "chiayi"
  | "proposal"
  | "wedding"
  | "baby"
  | "title";

export const TRUE_ENDING_BEATS: readonly Beat<TrueEndingScene>[] = [
  { scene: "noodles", fade: "slow", text: "泡麵要等三分鐘。以前這是一天裡最確定會有結果的事。現在她在旁邊，一直問好了沒。" },
  {
    scene: "intimate",
    fade: "slow",
    text: "交往滿兩個月的那天晚上。這張床以前只有我跟手機。現在她靠過來，眼鏡撞到我的眼鏡，喀一聲。我說：「妳的頭有點重。」她說：「嗯。」沒有要移開的意思。我也沒有要她移開。",
  },
  {
    scene: "intimate",
    text: "她先親過來。牙齒磕了一下，兩個人都小聲說抱歉。黑 T 從下襬往上捲，卡在胸口；我幫她拉，指節擦過乳側，她吸了一口氣，乳頭已經硬了。",
  },
  {
    scene: "intimate",
    text: "裙子褪到膝彎的時候她轉身趴下去，回過頭，眼鏡還掛著：「……你能不能不要用那種寫報告的表情。」我說好。其實我什麼表情都不知道自己在用。",
  },
  {
    scene: "intimateSex",
    fade: "slow",
    text: "我從後面進去。她很濕，還是咬著枕頭悶哼。床板響了一聲，我停住；她用氣音說：「沒關係，繼續。」腰往後送，把我吞更深。",
  },
  {
    scene: "intimateSex",
    text: "一下一下撞進去的時候，她的乳房在床單上擠出弧度，黑髮貼在汗濕的頸側。我抓住她的腰，聽到自己的呼吸比預期的吵。她叫我的名字，叫得很輕，像怕鄰居聽見，又像故意要我聽見。",
  },
  {
    scene: "intimateSex",
    text: "快射的時候我還是問了：「可以嗎。」她點頭，手指揪緊枕頭套。我射在裡面，抽動了兩下才停。她趴著沒動，過了很久才側過臉，聲音啞的：「下次……不要先問那麼多。」",
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
