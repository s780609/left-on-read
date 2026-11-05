/**
 * fade：有來有往了幾天，然後慢慢地，就沒有然後了。
 */

import type { Story } from "../storyTypes.ts";

export const FADE_STORIES: readonly Story[] = [
  {
    id: "match-vanished",
    dexName: "對方已離開",
    dexQuip: "聊得正好的定義，可能只有我知道。",
    category: "fade",
    steps: [
      {
        incoming: { kind: "message", text: "哈哈哈你好好笑" },
        replies: [
          "真假 我同事都說我講話很像說明文件",
          "我還有更好笑的 妳聽過 UDP 的笑話嗎 不一定聽得到",
          "謝謝 我可以整理一份清單給妳",
        ],
      },
      {
        incoming: { kind: "message", text: "那你週末都在幹嘛" },
        replies: [
          "在家重灌電腦 很紓壓",
          "妳想去光華商場嗎 那邊我很熟",
          "看妳 我接下來十二個週末都有空",
        ],
      },
      {
        incoming: { kind: "vanished" },
        ending: { narration: "我把最後那句又看了一次，想找出是哪個字出了 bug。這種錯誤沒有 log。" },
      },
    ],
  },
  {
    id: "what-do-you-do",
    dexName: "我們都會睡覺",
    dexQuip: "兩個人交換了彼此最無聊的一面，然後發現真的很無聊。",
    category: "fade",
    steps: [
      {
        incoming: { kind: "message", text: "哈哈 那你平常都在幹嘛" },
        replies: ["上班 妳呢", "上班。然後回家。有時候先吃飯", "寫程式 修電腦 妳呢"],
      },
      {
        incoming: { kind: "message", text: "我也上班啊 那你下班呢" },
        replies: ["下班回家 看影片", "下班就下班啊 妳呢", "寫 side project 但都寫不完"],
      },
      {
        incoming: { kind: "message", text: "我喔 追劇 然後睡覺" },
        replies: ["我也會睡覺", "哇 睡覺很好欸", "睡覺好 研究說要睡滿七小時"],
      },
      {
        incoming: { kind: "message", text: "哈哈對啊" },
        ending: { narration: "我們確認了彼此都會睡覺。在那之後，就再也沒有人開口了。" },
      },
    ],
  },
  {
    id: "hot-water",
    dexName: "多喝熱水",
    dexQuip: "水是我唯一確定對身體有益的東西。",
    category: "fade",
    steps: [
      {
        incoming: { kind: "message", text: "今天好累喔 頭好痛" },
        replies: [
          "多喝熱水",
          "要不要我傳一篇睡眠科學的文章給妳",
          "我也好累 我今天寫 bug 寫到三點",
        ],
      },
      {
        incoming: { kind: "message", text: "嗯 可能感冒了吧" },
        replies: [
          "感冒更要多喝熱水",
          "妳這是病毒性還是細菌性 差很多喔",
          "我有一張表記錄每次感冒的天數 平均七天 妳還有六天",
        ],
      },
      {
        incoming: { kind: "message", text: "嗯" },
        replies: [
          "熱水喝了嗎",
          "嗯是有好一點的意思嗎",
          "我幫妳訂一箱水 啊我沒有妳地址",
        ],
      },
      {
        incoming: { kind: "message", text: "嗯" },
        ending: { narration: "她回了嗯。我起身去倒了一杯熱水，站在窗邊喝完。確實有好一點。" },
      },
    ],
  },
  {
    id: "half-year",
    dexName: "半年老友",
    dexQuip: "我們從春天聊到秋天，話題從天氣聊到天氣。",
    category: "fade",
    steps: [
      {
        incoming: { kind: "message", text: "欸你週末都在幹嘛" },
        replies: ["在家 妳呢", "沒幹嘛 妳要不要出來吃個飯", "我剛好也想問妳這題"],
      },
      {
        incoming: { kind: "narration", text: "（三個月後）話題還在。她問我週末都在幹嘛。" },
        replies: [
          "在家 我上次好像講過了",
          "沒幹嘛 所以妳這週末有空嗎",
          "我可以做一份週末摘要給妳 就不用一直問了",
        ],
      },
      {
        incoming: { kind: "message", text: "這週要回老家欸 下次吧" },
        replies: ["好 那下下週", "老家在哪 我可以順路 我住台北", "沒問題 下次是幾號 我記一下"],
      },
      {
        incoming: { kind: "narration", text: "（又三個月後）她問我週末都在幹嘛。" },
        replies: [
          "在家",
          "在家。跟半年前一樣。妳要不要來確認一下",
          "我想問一下 我們是不是見過 我有點混亂了",
        ],
      },
      {
        incoming: { kind: "message", text: "哈哈你好好笑 下次約啦" },
        ending: { narration: "半年了。我知道她貓的名字、她主管的綽號、她討厭香菜。我不知道她的聲音。" },
      },
    ],
  },
  {
    id: "rain-check",
    dexName: "下次吧",
    dexQuip: "下次是一個地名，很遠，沒有車到。",
    category: "fade",
    steps: [
      {
        incoming: { kind: "message", text: "嗨嗨 你看起來人滿好的" },
        replies: ["謝謝 那要不要找時間吃個飯", "要吃飯嗎 我這個月都可以 下個月也可以", "我做了一張候選餐廳的比較表 共 14 間 妳要看嗎"],
      },
      {
        incoming: { kind: "message", text: "好啊 找時間吃個飯" },
        replies: ["好！那週五？", "週五可以嗎 還是妳排 我都配合", "我把週五的訂位先佔起來 不行再取消"],
      },
      {
        incoming: { kind: "message", text: "週五要加班欸 下次吧" },
        replies: [
          "好 那下週五",
          "工作要緊 那下次是什麼時候",
          "加班很辛苦 要不要我幫妳看那份工作",
        ],
      },
      {
        incoming: { kind: "message", text: "那週可能要回家 再看看喔" },
        replies: ["好 我都可以", "那再下週呢 我可以一直往後排", "這個再看看大概是多久的再看看"],
      },
      {
        incoming: { kind: "message", text: "好 再約喔" },
        ending: { narration: "她的行事曆沒有這一格，我的有。它寫著「吃飯？」，每週五自動重複。" },
      },
    ],
  },
  {
    id: "stood-up",
    dexName: "那杯拿鐵",
    dexQuip: "拿鐵 150，等待免費。我等了很多。",
    category: "fade",
    steps: [
      {
        incoming: { kind: "message", text: "你好 你的自介滿好笑的" },
        replies: [
          "謝謝 那妳週六有空嗎 要不要喝咖啡",
          "週六要不要喝咖啡 路線我查好了",
          "我不太會聊天 可以直接約咖啡嗎",
        ],
      },
      {
        incoming: { kind: "message", text: "好啊 週六下午兩點 約在那間咖啡廳？" },
        replies: [
          "好！我會提早到",
          "我查了 從 2 號出口最近 我畫地圖給妳",
          "我會戴黑框眼鏡 穿 T 恤 很好認",
        ],
      },
      {
        incoming: { kind: "message", text: "OK 週六見～" },
        replies: ["週六見！", "週六見 降雨機率 20% 不用帶傘", "要我再提醒妳一次嗎 鬧鐘已經設了"],
      },
      {
        incoming: {
          kind: "narration",
          text: "（週六）兩點整我就坐好了。三點換到看得見門的位子。四點店員來幫我加水。",
        },
        wait: { weekday: 6 },
        ending: {
          narration: "拿鐵一百五，看門兩小時。她沒傳訊息，我也沒問。回程的捷運上才想起來，我那天有洗頭。",
          cost: 150,
        },
      },
    ],
  },
  {
    id: "good-guy-card",
    dexName: "好人卡（不可折抵）",
    dexQuip: "目前持有三張，不知道能不能換什麼。",
    category: "fade",
    steps: [
      {
        incoming: { kind: "message", text: "跟你聊天滿舒服的欸" },
        replies: ["真的嗎 我也覺得", "謝謝 我有做過功課", "那我可以追妳嗎 想先確認一下流程"],
      },
      {
        incoming: { kind: "message", text: "你真的人很好" },
        replies: [
          "哪有啦 我只是比較閒",
          "所以這是好的意思嗎",
          "我同事也這樣說 然後請我幫他 debug",
        ],
      },
      {
        incoming: { kind: "message", text: "你人很好 但我現在不想談感情" },
        ending: { narration: "她說我人很好。我查過了，這張卡沒有期限，也不能折抵任何東西。" },
      },
    ],
  },
  {
    id: "fading-replies",
    dexName: "1、3、7",
    dexQuip: "我把間隔畫成圖表。趨勢很明顯，模型很準。",
    category: "fade",
    steps: [
      {
        incoming: { kind: "message", text: "哈哈對啊 你今天上班還好嗎" },
        replies: [
          "還好 今天修了三個 bug 生出四個",
          "妳回得好快 我好開心",
          "普通 妳呢 今天還好嗎",
        ],
      },
      {
        incoming: { kind: "message", text: "抱歉剛看到 還好啊" },
        wait: { days: 3 },
        replies: [
          "沒事啦 我也在忙（我沒有）",
          "三天欸 妳還好嗎 我有點擔心",
          "我發現訊息間隔變長了 沒有要怎樣 只是觀察",
        ],
      },
      {
        incoming: { kind: "message", text: "抱歉最近比較忙" },
        wait: { days: 7 },
        ending: {
          narration: "間隔 1、3、7。我在試算表拉了趨勢線，下一次是 15 天。工程師的直覺告訴我，不用等了。",
        },
      },
    ],
  },
  {
    id: "otaku-monologue",
    dexName: "三十分鐘的嗯嗯",
    dexQuip: "她問我一句，我答了一部編年史。",
    category: "fade",
    steps: [
      {
        incoming: { kind: "message", text: "你有在看動畫嗎" },
        replies: [
          "有！妳問對人了 我先從鋼彈的宇宙世紀開始講",
          "有 但我要先確認妳是哪一派",
          "一點點（接著連傳十一則）",
        ],
      },
      {
        incoming: { kind: "message", text: "嗯嗯" },
        replies: [
          "所以剛剛說到那場戰役 其實背景是這樣",
          "妳有在聽嗎 沒關係我可以傳時間軸",
          "還有 VTuber 也很深 我也可以講",
        ],
      },
      {
        incoming: { kind: "message", text: "嗯嗯 好厲害" },
        replies: [
          "對吧！那我繼續 下一段更精彩",
          "妳也覺得厲害 我就知道",
          "我可以借妳模型 但不能碰肩甲",
        ],
      },
      {
        incoming: { kind: "message", text: "嗯嗯" },
        ending: { narration: "我講了三十分鐘，她回了三次嗯嗯。到最後，我都沒有問她喜歡看什麼。" },
      },
    ],
  },
];
