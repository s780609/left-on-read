/**
 * 第二條真結局：Iris 告白之後，照時間順序一段一段按著看。畫面在 screens/IrisEndingScreen.tsx。
 * 插圖還沒生成，先用純色場景加一行字暫代；之後換圖只要改 pixel/irisScenes.ts。
 */

import type { Beat } from "./beats.ts";

export type IrisEndingScene = "morning" | "mountains" | "fight" | "makeup" | "proposal" | "title";

export const IRIS_ENDING_BEATS: readonly Beat<IrisEndingScene>[] = [
  {
    scene: "morning",
    fade: "slow",
    text: "交往之後，她還是每天先傳早安。我開始設鬧鐘，想比她早一點。到現在還沒搶贏過。",
  },
  {
    scene: "mountains",
    text: "我們爬了七星山、觀音山、合歡山北峰。我的膝蓋有意見。她說膝蓋的意見僅供參考。",
  },
  {
    scene: "fight",
    fade: "slow",
    text: "第一次吵架，她傳了一句「我需要冷靜一下」，然後就沒有再讀。那三個小時，我終於知道自己以前讓多少人等過。",
  },
  { scene: "makeup", text: "她讀了。然後回：「好了，我冷靜完了。晚餐想吃什麼。」我回得比任何時候都快。" },
  {
    scene: "proposal",
    text: "一年後，在北投那間圖書館外面，我先開口。這是我第一次比她先講。她說：「你終於學會了。」然後說好。",
  },
  { scene: "title", fade: "slow", text: "另一個結局\n已讀。\n然後我先回了。" },
];
