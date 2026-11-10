# Game Brief: 已讀不回

<!--
導入 Claude Code Game Studios 時（2026-11-10）依照現有遊戲補寫的一頁簡介。
遊戲早於這份文件存在，所以大部分欄位標 *(inferred (strong))*：從程式和 GROK_HANDOFF.md 整理，不是擁有者逐字講的。
「In your words」只收擁有者在對話裡講過的原話。完整規則與進度仍以 GROK_HANDOFF.md 為準。
-->

## In your words
- 「那些會失敗的對話 多一點好笑的回應 但是不能太多 免得太刻意」
- 「真結局多設計一些曖昧橋段」
- 「統一成白天做一個動作 晚上只能做兩個動作」
- 「改成要紀錄約會日期 錯過就是放鳥別人 那會直接被封鎖 另外沒錢也要可以去約會 對話會變成能不能跟小晴借錢 好感下降」
- 「但是還是要保留 PTT 男女版 或是 氧氣版 裡面很多貼文 會有的好笑對話」

**Pitch:** 北漂小工程師冠宇每天上班、下班、深夜滑交友軟體 Swipy，然後用各種直男方式失敗；收集失敗，偶爾走到真的結局。 *(inferred (strong))*

**Genre:** 直立像素風交友軟體模擬、文字選擇、大人向喜劇 *(inferred (strong))*

**Controls:** 觸控或滑鼠：點按鈕、拖曳卡片左右滑（★ 超級喜歡）；結局段落按畫面、空白鍵或 Enter 前進 *(inferred (strong))*

**Question:** 失敗的對話好不好笑、能不能讓人想再滑一晚 *(inferred (strong))*

**Hooks:** 笑點打在冠宇自己的直男行為和交友軟體的荒謬；33 種失敗圖鑑；假失敗之後她主動回來的真結局 *(inferred (strong))*

**Intent:** soft or no failure（錢扣到 0 為止，沒有 game over） *(inferred (strong))*

## Look and references
- Look: 深夜手機介面，方角粗黑框、硬陰影；場景是 6:5 生成插圖，女角卡片是 seed 算出的像素半身像 *(inferred (strong))*
- References: PTT 男女版、Dcard 感情版的交友軟體對話截圖（只借情境，對白原創） *(inferred (strong))*
- View: 2D · Camera: 直立手機畫面，固定 *(inferred (strong))*

## First minute
開場影片後是 9 月 15 日週二白天：上班、回訊息或撐到下班，晚上吃飯，深夜打開 Swipy 滑 10 張卡，第一次配對時選一句開場白。 *(inferred (strong))*

## Challenge
白天只能做一件事、晚上兩件事，訊息一天推進一步；不回會累積已讀壓力，聊天會提早冷掉；約會錯過日期就被封鎖。 *(inferred (strong))*

## Core loop
- 白天回訊息／約會／打理自己 → 晚上滑卡、配對、回訊息 → 睡覺推進聊天 *(inferred (strong))*
- 聊天走到結局 → 記進失敗圖鑑 → 換一條線再試 *(inferred (strong))*

## Goal & fail state
- 收集 33 種失敗（畢業典禮）；走到瓢蟲結局、小晴真結局或 Iris 結局 *(inferred (strong))*
- 一局只有走到結局才會結束；一般失敗只是收掉一段聊天 *(inferred (strong))*

## Features
- [x] 一天循環：領薪、白天一件事、晚上兩件事、週日週一跳過
- [x] Swipy 滑卡、配對、開場白；冠宇自己的檔案與付費
- [x] 33 種失敗劇情與圖鑑、隱藏失敗、成就
- [x] 小晴真結局路線（計分、三次約會、假失敗、片尾）
- [x] 個工路線與瓢蟲結局；Iris 路線
- [x] 節日、白天事件、新遊戲＋

## Your systems
- 聊天隱性數值（好感／尷尬／已讀壓力） · in the slice *(guessed)*
- 約會日期與放鳥 · in the slice *(guessed)*

## Keep
- 失敗對話的笑點，但不刻意 *(you said)*
- 原創對白、繁體中文、台灣用語；交友 App 叫 Swipy *(inferred (strong))*

## Avoid
- 失敗對話每句都加回應（太刻意） *(you said)*
- 抄網友原文、醜化女性 *(inferred (strong))*

## Out of scope
- 多人連線、伺服器存檔（只用 localStorage） *(inferred (strong))*

## Build order
1. 一天循環和滑卡配對（已完成）
2. 失敗劇情與圖鑑（已完成）
3. 真結局路線（已完成），之後繼續打磨對白與插圖

---
**Who it's for / what they feel:** 用過交友軟體的大人，笑冠宇也笑自己 *(inferred (strong))*
