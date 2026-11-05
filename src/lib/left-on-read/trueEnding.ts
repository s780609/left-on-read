/**
 * 真結局的腳本：第三次約會之後，一段一段按著看。畫面在 screens/TrueEndingScreen.tsx。
 */

export type TrueEndingScene = "noodles" | "chiayi" | "proposal" | "wedding" | "baby" | "title";

export const TRUE_ENDING_BEATS: readonly { scene: TrueEndingScene; text: string }[] = [
  { scene: "noodles", text: "泡麵要等三分鐘。以前這是一天裡最確定會有結果的事。現在她在旁邊，一直問好了沒。" },
  { scene: "chiayi", text: "媽塞了一袋橘子給她，叫她到台北要記得吃飯。媽沒有塞給我。" },
  { scene: "proposal", text: "我把求婚詞寫了十九版，最後一版只有一句。她說：「你今天很緊張耶。」然後說好。" },
  { scene: "wedding", text: "同事都來了，這次揪團我沒有剛好額滿。西裝有點緊，她說沒關係。" },
  {
    scene: "baby",
    text: "凌晨三點，他哭，我抱著他在房間走來走去。手機亮了，是她從隔壁傳來的：「換我嗎？」我回：「不用，妳睡。」",
  },
  { scene: "title", text: "真結局\n已讀。\n然後她回了。" },
];
