/**
 * pitch：終於有人主動找我了，然後我發現她有業績。
 */

import type { Story } from "../storyTypes.ts";

export const PITCH_STORIES: readonly Story[] = [
  {
    id: "stock-sister",
    dexName: "帶看盤的姊姊",
    dexQuip: "她是這個 APP 裡第一個主動找我的人。我早該想到的。",
    category: "pitch",
    steps: [
      {
        incoming: { kind: "message", text: "你看起來好認真喔 你都幾點下班呀" },
        replies: ["六點 但都七點才走", "妳是第一個問我這個的人", "為什麼問 是要約我嗎 我可以"],
      },
      {
        incoming: { kind: "message", text: "那平常有在理財嗎？錢放銀行很可惜欸" },
        replies: ["有 我都放活存", "扣完房租剩兩萬多 這樣算有理財嗎", "妳懂好多 我都不懂這些"],
      },
      {
        incoming: { kind: "message", text: "我有一位老師在帶單，上個月賺 30%，加個 LINE 我拉你進群" },
        replies: [
          "30% 欸 回測資料可以給我看嗎",
          "聽起來很厲害 可是我只有兩萬三",
          "等一下 我們不是在聊天嗎",
        ],
      },
      {
        incoming: { kind: "message", text: "群裡很多人都財富自由了喔 名額不多，要快" },
        ending: {
          narration:
            "我沒有加 LINE，也沒有匯款，把對話截圖打了 165 反詐騙專線。對方謝謝我。這個月第一次有人謝謝我。",
          antiFraud: true,
        },
      },
    ],
  },
  {
    id: "insurance",
    dexName: "第三天的保單",
    dexQuip: "她是唯一關心我三十歲以後的人。",
    category: "pitch",
    steps: [
      {
        incoming: { kind: "message", text: "你一個人在台北工作喔 好辛苦" },
        replies: ["還好啦 習慣了", "妳是第一個這樣說的", "對 老家在嘉義 我媽也這樣講"],
      },
      {
        incoming: { kind: "message", text: "那你有沒有想過 萬一生病怎麼辦" },
        replies: ["妳好關心我", "多喝熱水吧", "我算過 存款可以撐 41 天"],
      },
      {
        incoming: { kind: "message", text: "所以你有規劃保單嗎？我幫你看一下，不用錢" },
        ending: {
          narration: "第一次有人幫我把人生算到八十歲，還做成表格。我看得很感動，然後沒有買。",
        },
      },
    ],
  },
  {
    id: "mlm",
    dexName: "人生可以改變",
    dexQuip: "她相信我的人生可以改變。這是我媽以外的第一個。",
    category: "pitch",
    steps: [
      {
        incoming: { kind: "message", text: "你覺得你現在的生活，是你想要的嗎" },
        replies: ["這題範圍好大 可以先給我需求文件嗎", "……妳怎麼知道", "想要啊 我上個月換了機械鍵盤"],
      },
      {
        incoming: { kind: "message", text: "你相信人生可以改變嗎" },
        replies: ["相信 但感覺要改很多 code", "妳這樣問我有點想哭", "要改的話 有回滾機制嗎"],
      },
      {
        incoming: { kind: "message", text: "這週六有一場分享會，有位老師很厲害，我帶你去" },
        replies: ["好啊 這算約會嗎", "要穿什麼 我只有 T 恤", "會場有提供便當嗎"],
      },
      {
        incoming: { kind: "narration", text: "（週六）她說下次帶朋友一起來，效果更好。" },
        ending: { narration: "會場有很多人跟我握手，比我這一年加起來都多。我沒有加入，但回家的捷運上，手還是熱的。" },
      },
    ],
  },
  {
    id: "tech-support",
    dexName: "工具人 Lv.1",
    dexQuip: "重灌電腦的時候，我以為這是一段關係的開始。",
    category: "pitch",
    steps: [
      {
        incoming: { kind: "message", text: "欸你是工程師喔 那你會修電腦嗎" },
        replies: ["會！什麼問題都可以問", "這其實是兩回事 但我會", "妳的電腦幾年了 規格傳給我"],
      },
      {
        incoming: { kind: "message", text: "開機好慢 還一直跳廣告" },
        replies: [
          "拿給我 我幫妳重灌",
          "我寫了一份排除步驟 共十九步 有截圖",
          "沒問題 順便幫妳把桌面整理成七個資料夾",
        ],
        answers: [
          "好啊！那我週六拿過去給你 你住哪",
          "好長喔……我先從第一步試 不行再拿給你",
          "好啊哈哈哈 週末拿去給你整理",
        ],
      },
      {
        // 兩天後才說修好：冠宇只是答應修，不能當場修好
        wait: { days: 2 },
        lead: ["（兩天後。）"],
        incoming: { kind: "message", text: "哇修好了！你超厲害 謝謝你" },
        replies: ["不客氣 以後有問題都可以找我", "那要不要吃個飯 慶祝開機成功", "記得不要再裝那個了 我幫妳列黑名單"],
      },
      {
        incoming: { kind: "read" },
        ending: { narration: "她的電腦現在開機只要 11 秒。我知道，因為我測了三次。她再也沒有打開這個聊天室。" },
      },
    ],
  },
  {
    id: "like-for-me",
    dexName: "一人一票",
    dexQuip: "我是她的第 1,283 票。這是我第一次入圍什麼。",
    category: "pitch",
    steps: [
      {
        incoming: { kind: "message", text: "嗨嗨 可以幫我一個小忙嗎" },
        replies: ["可以！什麼都可以", "先說需求 我評估一下工時", "妳先講 我已經答應了"],
      },
      {
        incoming: { kind: "message", text: "幫我 IG 按個讚＋投票，我朋友的店在比賽" },
        replies: [
          "投好了 我用了三個帳號",
          "投好了 不過我發現投票系統有漏洞 要不要聽",
          "投好了！妳朋友的店在哪 我們可以去吃",
        ],
      },
      {
        incoming: { kind: "message", text: "謝謝你！！" },
        ending: { narration: "比賽結束，她朋友的店得了第二名。我是那個第二名的一部分，這件事我沒跟任何人說。" },
      },
    ],
  },
];
