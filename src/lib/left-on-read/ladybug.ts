/**
 * 瓢蟲結局的腳本：答應了 1h2s 之後，從此沉溺於風俗店。
 * 門一關就切黑，只寫他的日子怎麼變了。畫面在 screens/LadybugScreen.tsx。
 */

export type LadybugScene = "alley" | "door" | "black" | "commute" | "ledger" | "bed" | "title";

export const LADYBUG_BEATS: readonly { scene: LadybugScene; text: string }[] = [
  {
    scene: "alley",
    text: "那天下班，我沒有回租屋處。地圖帶我走進一條沒走過的巷子，導航說：「您已抵達目的地。」這句話我等了兩年。",
  },
  {
    scene: "door",
    text: "鐵門開了。她跟照片不太一樣，我也跟我的自介不太一樣。她問我要不要喝水。來台北之後，這是第一次有人在門口等我。",
  },
  { scene: "black", text: "（門關上了。）" },
  {
    scene: "commute",
    text: "一個半小時後，我站在同一班捷運上，同一批人，同樣在滑手機。沒有人看得出來。我一直以為會有什麼不一樣。",
  },
  {
    scene: "ledger",
    text: "從那天起，我開始往風俗店跑。我開了一個 Excel，欄位有店名、日期、評分、備註。出社會兩年，我的專業終於被用上了。",
  },
  {
    scene: "commute",
    text: "同事揪聚餐，我說有事。版上的心得文我都看，縮寫我都懂了。媽打來問我有沒有好好吃飯，我說有。五號領薪水，八號就沒了。",
  },
  {
    scene: "bed",
    text: "Swipy 我刪了，反正不用滑了。這裡的人都會回我訊息，回得很快，還會叫我哥哥。有一次我問她今天過得好不好。她愣了一下，看了手機：「哥哥，時間快到了喔。」",
  },
  {
    scene: "title",
    text: "瓢蟲結局\n每天都在等一個回覆。\n他等到了。NT$3,000 一次。",
  },
];
