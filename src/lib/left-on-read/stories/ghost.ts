/**
 * ghost：她其實從來沒有真的出現過。
 */

import type { Story } from "../storyTypes.ts";

export const GHOST_STORIES: readonly Story[] = [
  {
    id: "read-no-reply",
    dexName: "中午十二點零四分",
    dexQuip: "她看過了。這是我們之間最親密的一刻。",
    category: "ghost",
    steps: [
      {
        incoming: { kind: "read" },
        replies: [
          "哈哈妳是不是在忙",
          "抱歉 剛剛那句好像太正式了",
          "對了我叫冠宇，耳東陳，冠軍的冠，宇宙的宇",
        ],
      },
      {
        incoming: { kind: "read" },
        replies: [
          "今天天氣不錯欸",
          "妳今天吃了嗎 我吃雞腿便當",
          "我看了一下 妳都是中午已讀 代表妳有好好休息 很棒",
        ],
      },
      {
        incoming: { kind: "read" },
        ending: { narration: "已讀的時間是 12:04。她那天中午吃什麼，我可能永遠不會知道。" },
        // 另一個結局
        variants: [
          {
            when: { step: 1, choice: 2 },
            incoming: { kind: "message", text: "……你在監控我嗎" },
            ending: { narration: "她終於回我了，第一句也是最後一句。我把記已讀時間的那張表刪了，刪之前又看了一眼：12:04。" },
          },
        ],
      },
    ],
  },
  {
    id: "never-read",
    dexName: "薛丁格的未讀",
    dexQuip: "只要她不點開，我就還有機會。這是量子力學。",
    category: "ghost",
    steps: [
      {
        incoming: { kind: "unread" },
        replies: [
          "應該是通知沒開吧",
          "妳手機是不是壞了 我可以幫妳看",
          "沒關係 我的訊息會一直在這裡",
        ],
      },
      {
        incoming: { kind: "unread" },
        replies: [
          "早安",
          "我查了一下 Swipy 的推播有時候會延遲 不是妳的問題",
          "這是第三天 我沒有在算",
        ],
      },
      {
        incoming: { kind: "narration", text: "（一週後）她的頭像亮起綠燈：上線中。我的訊息，未讀。" },
        wait: { days: 7 },
        ending: { narration: "她上線了，她看了別人的。我把手機放回桌上，它好像比剛才重一點。" },
      },
    ],
  },
  {
    id: "morning-image",
    dexName: "早安圖傳人",
    dexQuip: "我爸每天傳給我的東西，我傳給了她。我終於理解我爸了。",
    category: "ghost",
    steps: [
      {
        incoming: { kind: "message", text: "哈哈 你好" },
        replies: [
          "早安！今天也要加油喔",
          "早安 今天台北 23 度 午後有雨 記得帶傘",
          "早安 我做了一張圖給妳 荷花上面寫平安喜樂",
        ],
      },
      {
        incoming: { kind: "read" },
        replies: [
          "晚安 今天辛苦了",
          "午安 下午容易累 記得起來走走",
          "早安 今天的荷花換成牡丹了",
        ],
      },
      {
        incoming: { kind: "read" },
        replies: [
          "早安 又是新的一天 妳也要撐住",
          "早安！連續第三天 我沒有斷過",
          "早安 這張的字會閃",
        ],
      },
      {
        incoming: { kind: "message", text: "？" },
        ending: { narration: "那個問號我看了很久。彎彎的，很像有人歪著頭，不知道該拿我怎麼辦。" },
        // 另一個結局
        variants: [
          {
            when: { step: 2, choice: 2 },
            incoming: { kind: "message", text: "（圖片：一朵會發光的蓮花，寫著「早安 吉祥如意 天天好心情」）" },
            ending: { narration: "她回了一張長輩圖，比我的還閃。我們好像在某個頻率上相遇了，又好像只是我被打敗了。那之後她沒再傳過字。" },
          },
        ],
      },
    ],
  },
  {
    id: "sticker-only",
    dexName: "兔子外交",
    dexQuip: "一隻兔子對我比讚。我跟那隻兔子聊得比較多。",
    category: "ghost",
    steps: [
      {
        incoming: { kind: "message", text: "（貼圖：一隻兔子比讚）" },
        replies: [
          "哈哈這隻兔子好可愛 哪裡買的",
          "所以這個讚是指我哪一句",
          "（回傳貼圖：一隻柴犬九十度鞠躬）",
        ],
        // 她只用貼圖回，連回應都是兔子
        answers: ["（貼圖：兔子歪頭）", "（貼圖：兔子聳肩）", "（貼圖：兔子往後退三步）"],
      },
      {
        incoming: { kind: "message", text: "（貼圖：兔子躺著睡覺）" },
        replies: [
          "妳要睡了嗎 我們才講三句欸",
          "兔子今天也辛苦了",
          "我查了 這組貼圖一共 24 張 我想全部看過",
        ],
      },
      {
        incoming: { kind: "message", text: "（貼圖：兔子揮手）" },
        replies: [
          "等等 這是再見的意思嗎",
          "牠可能只是在打招呼對吧",
          "我買了同一組 現在我們是兔友了",
        ],
      },
      {
        incoming: { kind: "read" },
        ending: { narration: "後來連兔子都沒有了。我買的那組還有 23 張沒用過，它們不會過期。" },
      },
    ],
  },
  {
    id: "wall-of-text",
    dexName: "三百字的男人",
    dexQuip: "我有附目錄。",
    category: "ghost",
    steps: [
      {
        incoming: { kind: "message", text: "你好～我上班族啦 那你呢 你是做什麼的呀" },
        replies: [
          "我先自我介紹，分成學經歷、興趣、未來規劃三個部分，大約三百字，妳有空再看",
          "軟體工程師。但這樣講不夠精確，我傳完整版給妳",
          "這要從我大二修資料結構那年講起",
        ],
      },
      {
        incoming: { kind: "message", text: "哇好長 我晚點看" },
        replies: [
          "好 不急 重點我有標出來",
          "看完可以給我回饋 哪一段太長都可以講",
          "還是我錄成語音 大概十二分鐘",
        ],
      },
      {
        incoming: { kind: "narration", text: "（三天後）她說的晚點，還在路上。" },
        wait: { days: 3 },
        ending: { narration: "她的晚點到現在還沒到。我後來自己重看了一次，第二段確實可以刪。" },
        // 另一個結局
        variants: [
          {
            when: { step: 1, choice: 2 },
            incoming: { kind: "message", text: "重點？" },
            ending: { narration: "三天後她回了兩個字。我想了一整晚要怎麼濃縮，最後打了「我人不錯」。送出之後，就沒有之後了。" },
          },
        ],
      },
    ],
  },
  {
    id: "friend-photo",
    dexName: "照片僅供參考",
    dexQuip: "我右滑的那個人，並不知道我右滑過她。",
    category: "ghost",
    steps: [
      {
        incoming: { kind: "message", text: "哈哈 跟你說 照片上是我朋友啦" },
        replies: [
          "喔喔 了解 那妳本人呢",
          "沒關係 我照片上的眼鏡也是比較新的時候拍的",
          "所以我現在是在跟誰聊天 我想確認一下資料來源",
        ],
        answers: [
          "幹嘛問這個 本人就比較不上相啊",
          "哈哈哈 眼鏡也算喔 你也太老實了吧",
          "幹嘛問這個 你是在查戶口喔",
        ],
      },
      {
        incoming: { kind: "message", text: "那你本人跟照片差很多嗎" },
        replies: [
          "差不多啦 就是資料有點舊",
          "不知道耶 目前還沒有人看過本人可以比較",
          "那我先說 我本人比照片多五公斤",
        ],
      },
      {
        incoming: { kind: "read" },
        ending: { narration: "照片裡那位朋友笑得很開心。她完全不知道，自己剛剛被我右滑，又替別人拒絕了我。" },
      },
    ],
  },
  {
    id: "loan-help",
    dexName: "急用兩萬",
    dexQuip: "她說下個月發薪就還。下個月到現在還沒來。",
    category: "ghost",
    steps: [
      {
        incoming: { kind: "message", text: "跟你聊得好開心 感覺你可以信任" },
        replies: ["我也是 很少人這樣說", "信任要慢慢累積 但謝謝", "妳這樣講我會當真"],
      },
      {
        incoming: { kind: "message", text: "那個……我這個月房租差一點 能不能先借我兩萬 下個月發薪立刻還" },
        replies: ["兩萬有點多 我算一下", "可以說一下發生什麼事嗎", "抱歉 我自己也剛好緊"],
      },
      {
        incoming: { kind: "message", text: "沒關係啦 那就當我沒說 你人很好" },
        replies: ["真的抱歉", "等我發薪看能不能幫一點", "妳還好嗎"],
      },
      {
        incoming: { kind: "read" },
        wait: { days: 3 },
        ending: { narration: "已讀之後，她的頭像還在。兩萬沒有借出去，對話也沒有下文。原來「人很好」也可以是句點。" },
      },
    ],
  },
];
