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
  {
    id: "health-mlm",
    dexName: "酵素改變人生",
    dexQuip: "她關心我的腸道。這是我遇過最深入的關心。",
    category: "pitch",
    steps: [
      {
        incoming: { kind: "message", text: "你看起來好像很累欸 有在保養身體嗎" },
        replies: ["沒有 我保養的是程式碼", "有 我每週運動一次 在心裡", "妳怎麼看得出來 我很明顯嗎"],
      },
      {
        incoming: { kind: "message", text: "我自己有在喝一個酵素 睡眠腸胃都有差 要不要介紹給你" },
        replies: ["聽起來很厲害 成分表可以給我嗎", "多少錢 我先算預算", "好啊 這算約會贈品嗎"],
      },
      {
        incoming: { kind: "message", text: "先買一組體驗就好 我可以幫你申請優惠 順便當我下線也行哈哈" },
        ending: {
          narration: "原來「關心」可以有業績編號。我回了謝謝，沒有下單，也沒有成為任何人的下線。",
        },
      },
    ],
  },
  {
    id: "crypto-course",
    dexName: "財富自由課",
    dexQuip: "她說想帶我去上課。學費比我月薪還像真心話。",
    category: "pitch",
    steps: [
      {
        incoming: { kind: "message", text: "你有在看加密貨幣嗎 最近超準的" },
        replies: ["沒有 我連股票代碼都背不起來", "有一點 但我只用活存", "妳賺多少 方便說區間嗎"],
      },
      {
        incoming: { kind: "message", text: "我有個社團在帶 先上三天體驗營 名額不多" },
        replies: ["體驗營要錢嗎", "可以先看教材大綱嗎", "等一下 我們不是在聊天嗎"],
      },
      {
        incoming: { kind: "message", text: "學費可以分期 你這種工程師最需要被動收入了啦" },
        ending: {
          narration: "被動收入的第一步，是主動匯一筆學費。我沒有匯。對話截圖我存著，165 的號碼也存著。",
          antiFraud: true,
        },
      },
    ],
  },
  {
    id: "romance-wire",
    dexName: "先幫我一個忙",
    dexQuip: "她叫我親愛的。匯款頁面也叫我親愛的。",
    category: "pitch",
    steps: [
      {
        incoming: { kind: "message", text: "終於配到正常人了 你看起來好溫柔" },
        replies: ["謝謝 我很努力在當正常人", "妳也是 自介我看了三遍", "溫柔這兩個字我存起來了"],
      },
      {
        incoming: { kind: "message", text: "其實我在國外出差 這邊訊號不太好 但我想多認識你" },
        replies: ["國外哪裡 時差怎麼算", "好巧 我也想多認識妳", "訊號不好還能秒回 好厲害"],
      },
      {
        incoming: { kind: "message", text: "親愛的 我證件被扣住了 能不能先幫我轉一筆保證金 回來立刻還你" },
        replies: ["多少 我先看帳戶", "這劇情我在新聞看過", "可以 但妳先視訊一下"],
      },
      {
        incoming: { kind: "message", text: "來不及視訊啦 再遲我要被遣返了 求你" },
        ending: {
          narration: "我沒有轉帳。我把對話貼給 165，對方說做得好。這是我第一次因為沒有付錢而被稱讚。",
          antiFraud: true,
        },
      },
    ],
  },
  {
    id: "ba-jia-jiu",
    dexName: "照片裡的她",
    dexQuip: "右滑的是女神。開門的是兄弟。",
    category: "pitch",
    steps: [
      {
        incoming: { kind: "message", text: "嗨～你長得好像我喜歡的類型欸" },
        replies: ["真的嗎 我照三餐被稱讚一次", "妳照片好漂亮 是本人嗎", "類型這兩個字好有篩選器的感覺"],
      },
      {
        incoming: { kind: "message", text: "本人啦笨蛋 週末要不要出來喝一杯 我請你" },
        replies: ["好啊！哪裡", "妳請我 我是不是該準備什麼", "可以 但我不太會喝酒 可以喝無糖茶嗎"],
      },
      {
        incoming: { kind: "message", text: "就那間KTV旁邊的燒烤 你到了傳訊息 我朋友可能也在" },
        replies: ["好 我六點半到", "朋友也在喔 好熱鬧", "地址發我 我設導航"],
      },
      {
        incoming: { kind: "narration", text: "（週末）門口站的不是她。是戴金鍊的男人，旁邊還有兩個兄弟。" },
        ending: {
          narration:
            "他說：「兄弟怎麼不進來坐，我女朋友叫你來的啊。喝茶錢先算三千。」我轉頭就走。回家把 Swipy 刪了又裝回來，只為了把她封鎖得徹底一點。",
        },
      },
    ],
  },
];
