/**
 * 瓢蟲結局的腳本：答應了 1h2s 之後，從此沉溺於風俗店。
 * 門一關就切黑，只寫他的日子怎麼變了；後半飛去大阪飛田新地與曼谷牛仔街，並走進店裡。
 * 台灣段是老電梯大樓走廊 → 普通房門後的小夜燈房間。
 * 畫面在 screens/LadybugScreen.tsx。
 *
 * 前兩段就是聊天室最後那兩句（1h2s 那題和「好」），畫面接得上才不會硬切。
 * 這段對話不寫露骨內容，兩個人講的都是見面前後的尷尬。
 */

import { CHAT_SCENE, type Beat } from "./beats.ts";

export type LadybugScene =
  | typeof CHAT_SCENE
  | "hallway"
  | "taiwanShop"
  | "black"
  | "commute"
  | "ledger"
  | "bed"
  | "yoshiwara"
  | "yoshiwaraShop"
  | "bangkok"
  | "bangkokShop"
  | "title";

/** 從聊天室進來時已經顯示到這一段，也就是冠宇的「好」 */
export const LADYBUG_START_INDEX = 1;

const CHAT = CHAT_SCENE;

export const LADYBUG_BEATS: readonly Beat<LadybugScene>[] = [
  { scene: CHAT, who: "her", text: "想來的話 1h2s 3000，現金喔" },
  { scene: CHAT, who: "me", text: "……好。地址傳給我。" },
  { scene: CHAT, who: "her", text: "好喔 我傳給你" },
  { scene: CHAT, who: "her", text: "老舊電梯大樓 四樓右邊第二間 跟一般住家一樣" },
  { scene: CHAT, who: "me", text: "好。請問需要準備什麼嗎" },
  { scene: CHAT, who: "her", text: "帶錢就好啊 哈哈哈 哥哥你以為是來面試喔" },
  { scene: CHAT, who: "me", text: "沒有 我只是想說第一次 不要造成妳的困擾" },
  { scene: CHAT, who: "her", text: "你真的很有禮貌耶 你幾點下班" },
  { scene: CHAT, who: "me", text: "六點。但我可以等到七點再打卡 比較不會有人問" },
  { scene: CHAT, who: "her", text: "沒有人會問啦 那七點半可以嗎" },
  { scene: CHAT, who: "me", text: "可以。七點半。收到。" },
  { scene: CHAT, who: "her", text: "「收到」哈哈哈 你是在回主管喔" },
  { scene: CHAT, who: "me", text: "抱歉 習慣了" },
  { scene: CHAT, who: "her", text: "不用抱歉啦 到了傳訊息跟我說 不要按電鈴喔" },
  {
    scene: "hallway",
    fade: "slow",
    text: "那天下班，我沒有回租屋處。地址帶我走進一棟老舊電梯大樓。走廊兩邊都是房門，日光燈嗡嗡響，聞得到久沒清的地板味。",
  },
  { scene: "hallway", who: "me", text: "我到了 四樓右邊第二間" },
  { scene: "hallway", who: "her", text: "看到你了 你站那邊好像在等鄰居開門" },
  { scene: "hallway", who: "me", text: "這扇門看起來跟別間沒差耶" },
  { scene: "hallway", who: "her", text: "就是啊 等一下喔 我開門" },
  {
    scene: "taiwanShop",
    text: "門開了。外面看是普通住家，裡面卻黑黑的，只有幾盞小夜燈。沙發上坐著穿得很少的女生，跟照片不太一樣。",
  },
  { scene: "taiwanShop", who: "her", text: "你就是哥哥喔？比你自介寫的矮一點耶。" },
  { scene: "taiwanShop", who: "me", text: "……自介有多寫兩公分。" },
  { scene: "taiwanShop", who: "her", text: "哈哈哈，你還真的講。要不要喝水？" },
  { scene: "taiwanShop", text: "來台北之後，這是第一次有人在這種房間裡等我。" },
  { scene: "taiwanShop", who: "me", text: "好，謝謝。鞋子要放哪裡？" },
  { scene: "taiwanShop", who: "her", text: "放那邊就好。你在緊張喔？" },
  { scene: "taiwanShop", who: "me", text: "……很明顯嗎？" },
  { scene: "taiwanShop", who: "her", text: "有一點。沒關係，進來吧。" },
  { scene: "black", fade: "slow", text: "（門關上了。）" },
  {
    scene: "commute",
    fade: "slow",
    text: "一個半小時後，我站在同一班捷運上，同一批人，同樣在滑手機。沒有人看得出來。我一直以為會有什麼不一樣。",
  },
  { scene: CHAT, who: "her", text: "哥哥到家跟我說一聲喔" },
  { scene: CHAT, who: "me", text: "好。今天謝謝妳" },
  { scene: CHAT, who: "her", text: "謝什麼啦 你是我今天最客氣的" },
  { scene: CHAT, who: "me", text: "那我們之後還可以聊天嗎" },
  { scene: CHAT, who: "her", text: "可以呀 想來再找我～" },
  { scene: CHAT, text: "這句話我看了三站。她有回我，我知道。我也知道她回的是什麼。" },
  {
    scene: "ledger",
    text: "從那天起，我開始往風俗店跑。我開了一個 Excel，欄位有店名、日期、評分、備註。出社會兩年，我的專業終於被用上了。",
  },
  {
    scene: "commute",
    text: "同事揪聚餐，我說有事。版上的心得文我都看，縮寫我都懂了。媽打來問我有沒有好好吃飯，我說有。五號領薪水，八號就沒了。",
  },
  { scene: "bed", text: "Swipy 我刪了，反正不用滑了。這裡的人都會回我訊息，回得很快，還會叫我哥哥。" },
  { scene: "bed", who: "me", text: "妳今天過得好不好？" },
  { scene: "bed", who: "her", text: "……哥哥怎麼突然問這個？" },
  { scene: "bed", who: "me", text: "沒有啦，就想知道。好像很少有人問。" },
  { scene: "bed", who: "her", text: "有喔，你上次也有問。" },
  { scene: "bed", who: "me", text: "那妳上次怎麼回答？" },
  { scene: "bed", text: "她愣了一下，看了手機。" },
  { scene: "bed", who: "her", text: "哥哥，時間快到了喔。" },
  {
    scene: "black",
    fade: "slow",
    text: "台灣那些看起來像住家的門，我推膩了。年假我買了便宜機票。護照蓋上第一個章那天，我對自己說：這次是去玩。",
  },
  {
    scene: "yoshiwara",
    fade: "slow",
    text: "大阪。飛田新地一整排低矮木造店屋，門口掛著紙燈籠。店名、時段、價目，我記在同一個 Excel，只是幣別換成日圓。",
  },
  {
    scene: "yoshiwaraShop",
    fade: "slow",
    text: "格子門開著，穿得很少的女人坐在玄關裡朝外看。有人朝我笑，有人叫我進來，紙燈籠照在她們臉上，比台北那些小夜燈更亮。",
  },
  {
    scene: "yoshiwaraShop",
    text: "回訊一樣快。價錢標好。我忽然覺得自己很輕，輕到可以一直坐下去。",
  },
  {
    scene: "bangkok",
    fade: "slow",
    text: "下一站曼谷。牛仔街的霓虹一整排往下燒，熱風裡都是煙味和香水。Nana 的招牌亮得像不會關。",
  },
  {
    scene: "bangkokShop",
    fade: "slow",
    text: "店裡比街上更熱。鏡子、高跟鞋、短洋裝，幾個女孩坐在吧台邊朝門口看。沒有人問我來自哪裡。",
  },
  {
    scene: "bangkokShop",
    text: "風俗店的門一開一關，有人過來牽我的手。我知道自己回不去了。",
  },
  {
    scene: "title",
    fade: "slow",
    text: "瓢蟲結局\n他飛去飛田新地，也去了牛仔街。\n回訊很快。價錢標好。每天都有人等他。",
  },
];
