/**
 * 隱藏路線：只有配對到個工（個人工作室）或小晴才會走，不會被隨機抽到，也不算進 27 種失敗。
 */

import { LADYBUG_COST, LADYBUG_ENDING_ID } from "../constants.ts";
import type { Story } from "../storyTypes.ts";
import { HEROINE_ALMOST_STORY, HEROINE_STORY } from "./heroine.ts";

export const STUDIO_STORY_ID = "studio";

export const SPECIAL_STORIES: readonly Story[] = [
  {
    id: STUDIO_STORY_ID,
    dexName: "認真聊天的客人",
    dexQuip: "她回訊息最快，也最有耐心。因為這是她的工作，不是因為我。",
    category: "quick",
    steps: [
      {
        incoming: { kind: "message", text: "嗨嗨～哥哥下班了嗎 今天辛苦了" },
        replies: [
          "還沒 但謝謝妳問 很少人問這個",
          "妳怎麼知道我很辛苦",
          "看到妳寫個人工作室 是做設計的嗎？我也算科技業",
        ],
      },
      {
        incoming: { kind: "message", text: "哈哈哥哥好可愛 算是服務業啦 你平常下班都在幹嘛" },
        replies: [
          "回家吃泡麵 滑手機 然後睡覺",
          "我有在追新番 要我列一份給妳嗎 有分類",
          "服務業很辛苦吧 客人是不是都很難搞",
        ],
      },
      {
        incoming: { kind: "message", text: "聽起來有點孤單耶 你上次交女朋友是什麼時候呀" },
        replies: [
          "……這題可以跳過嗎",
          "國小有人傳過紙條給我 這樣算嗎",
          "我在等對的人 目前還在 loading",
        ],
      },
      {
        incoming: {
          kind: "message",
          text: "哥哥，你該不會……完全沒有經驗吧？沒關係啦，第一次的都特別有禮貌，我看得出來",
        },
        replies: [
          "……很明顯嗎",
          "我看過很多文章 理論上是懂的",
          "妳怎麼知道 是我打字的方式嗎",
        ],
      },
      {
        incoming: { kind: "message", text: "跟你聊天很開心耶。那你要不要來？1h2s 3000，現金喔" },
        replies: [
          "……好。地址傳給我。",
          "1h2s 是什麼規格？1 小時 2 秒嗎？這 SLA 也太短",
          "我覺得我們可以先從朋友開始",
        ],
        decision: { choice: 0, cost: LADYBUG_COST, endingId: LADYBUG_ENDING_ID },
      },
      {
        incoming: { kind: "message", text: "哈哈哥哥真的好可愛。那不打擾你囉，想來再找我～" },
        ending: {
          narration:
            "我後來查了 1h2s 是什麼意思，查完把搜尋紀錄刪了。她是第一個跟我聊超過五天的人。我原本以為這代表什麼。",
        },
      },
    ],
  },
  HEROINE_STORY,
  HEROINE_ALMOST_STORY,
];
