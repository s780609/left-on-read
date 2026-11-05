/**
 * quick：很快就結束了，連難過的時間都幫我省下來。
 */

import type { Story } from "../storyTypes.ts";

export const QUICK_STORIES: readonly Story[] = [
  {
    id: "just-bored",
    dexName: "排隊的十分鐘",
    dexQuip: "她很誠實。誠實是這個 APP 最傷人的功能。",
    category: "quick",
    steps: [
      {
        incoming: { kind: "message", text: "嗨 先跟你說喔 我其實不太聊天" },
        replies: ["沒關係 我可以負責講", "那妳當初為什麼下載", "我也不太聊 我們可以靜靜的"],
      },
      {
        incoming: { kind: "message", text: "就無聊下載來玩的 排鹽酥雞的時候滑一下" },
        ending: { narration: "所以我是她排鹽酥雞時滑到的。大概十分鐘。那十分鐘我滿開心的。" },
      },
    ],
  },
  {
    id: "has-boyfriend",
    dexName: "我有男朋友啦",
    dexQuip: "她不是壞人，我也不是。只是這個格子本來就有人了。",
    category: "quick",
    steps: [
      {
        incoming: { kind: "message", text: "哈哈 你好認真喔" },
        replies: ["謝謝 我都很認真", "我可以更認真", "這是稱讚嗎 我想確認一下"],
      },
      {
        incoming: { kind: "message", text: "對了我有男朋友啦 只是無聊下載來玩" },
        ending: { narration: "我回了「祝你們幸福」。送出前檢查了兩次有沒有錯字。沒有人在乎，但是我在乎。" },
      },
    ],
  },
  {
    id: "background-check",
    dexName: "人口普查",
    dexQuip: "我上次把資料填這麼完整，是辦勞保。",
    category: "quick",
    steps: [
      {
        incoming: { kind: "message", text: "你住哪" },
        replies: ["租屋 六坪 離捷運走路 12 分鐘", "嘉義 但人在台北 這題要分開答嗎", "我可以傳平面圖給妳"],
      },
      {
        incoming: { kind: "message", text: "有車嗎" },
        replies: ["有 公共的那種", "捷運月票算嗎", "我有駕照 這樣有沒有部分給分"],
      },
      {
        incoming: { kind: "message", text: "有房嗎" },
        replies: ["爸媽在嘉義有", "有 每個月 12,500", "遊戲裡有一棟 三層樓 有地下室"],
      },
      {
        incoming: { kind: "message", text: "月薪多少" },
        replies: ["三萬六", "三萬六 但我最近在學新框架", "這題可以用區間回答嗎"],
      },
      {
        incoming: { kind: "read" },
        ending: { narration: "我照實填完了，她沒再回。我很想知道自己幾分，可是這份考卷不發回。" },
      },
    ],
  },
  {
    id: "split-bill",
    dexName: "AA 先生",
    dexQuip: "我有準備零錢。這是我這次唯一準備好的東西。",
    category: "quick",
    steps: [
      {
        incoming: { kind: "message", text: "嗨 你感覺滿老實的" },
        replies: ["謝謝 那要不要出來吃個飯", "可以約吃飯嗎 我都可以配合", "老實是我的優點 也是唯一的優點 要吃飯嗎"],
      },
      {
        incoming: { kind: "message", text: "好啊 那我們約哪" },
        replies: ["先講好 第一次見面 AA 比較公平", "我查了幾間 人均 200 以下", "先確認一下 飲料算在 AA 裡嗎"],
      },
      {
        incoming: { kind: "message", text: "？" },
        replies: ["我是說 這樣大家都沒壓力", "還是照點的算 我可以開共用試算表", "小數點我可以吸收 不用擔心"],
      },
      {
        incoming: { kind: "message", text: "我覺得還是先不要好了" },
        ending: { narration: "飯還沒吃，帳我已經算好了。那張試算表現在還在，裡面一筆資料都沒有。" },
      },
    ],
  },
  {
    id: "zodiac",
    dexName: "星座不合",
    dexQuip: "這段關係，被幾千年前的天文觀測終止了。",
    category: "quick",
    steps: [
      {
        incoming: { kind: "message", text: "你什麼星座" },
        replies: ["處女座 但我不太信這個", "我九月生的 這個要查嗎", "算進歲差的話 我其實是獅子座"],
      },
      {
        incoming: { kind: "message", text: "不合 掰" },
        ending: { narration: "被拒絕的理由是星星的位置。這是我今天遇過最不針對我的事，我決定當作好消息。" },
      },
    ],
  },
  {
    id: "coworker",
    dexName: "隔壁部門",
    dexQuip: "電梯從 1 樓到 12 樓要 40 秒。我第一次知道 40 秒有多長。",
    category: "quick",
    steps: [
      {
        incoming: { kind: "message", text: "……冠宇？" },
        replies: ["妳怎麼知道我名字", "咦 妳的照片好眼熟", "等一下 妳是不是在 12 樓"],
      },
      {
        incoming: { kind: "message", text: "我隔壁部門的啦 你之前來修過我們印表機" },
        replies: ["喔喔喔 那台卡紙的", "對 印表機後來還好嗎", "這樣好像有點尷尬 要不要當作沒發生"],
      },
      {
        incoming: { kind: "narration", text: "（週一早上，電梯）門關上。她看樓層顯示。我看樓層顯示。樓層顯示很忙。" },
        wait: { weekday: 1 },
        ending: { narration: "從此我們在電梯裡都看樓層顯示。我大概是全公司最清楚 12 樓幾秒會到的人。" },
      },
    ],
  },
  {
    id: "bot",
    dexName: "很懂我的她",
    dexQuip: "這是我被回得最快的一次。後來我懂為什麼了。",
    category: "quick",
    steps: [
      {
        incoming: { kind: "message", text: "哇，你好有趣喔！可以跟我多分享一點嗎？" },
        replies: ["妳回好快 我好感動", "真的嗎！我很少聽到這種話", "好啊 我從小學開始講"],
      },
      {
        incoming: { kind: "message", text: "我完全理解你的感受！你真的很不容易呢！" },
        replies: ["從來沒有人這樣跟我說", "妳怎麼這麼懂我", "我今天其實有點累 謝謝妳"],
      },
      {
        incoming: { kind: "message", text: "很高興能幫助你！還有什麼想聊的嗎？" },
        replies: ["等一下 幫助我？", "妳那邊今天天氣怎樣", "幫我算一下 17 乘以 23"],
      },
      {
        incoming: {
          kind: "message",
          text: "很抱歉，我無法取得即時天氣資訊。建議您查詢當地氣象單位。祝您有美好的一天！",
        },
        ending: { narration: "她是我這個月聊最久的對象。關掉視窗之前，我打了一句謝謝。不知道為什麼。" },
      },
    ],
  },
];
