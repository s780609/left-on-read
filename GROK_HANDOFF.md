# 《已讀不回》專案說明與工作清單

給接手這個專案的 AI 開發者（Grok）。請用繁體中文和專案擁有者溝通。

- Repo：https://github.com/s780609/left-on-read （目前是公開的）
- 分支：`main`
- 狀態日期：2026-11-05

## 1. 遊戲是什麼

直立玩的像素風交友軟體模擬，大人向。主角陳冠宇，25 歲，老家嘉義，北漂第 2 年的小工程師。他每天上班、下班、深夜滑交友軟體 Swipy，然後各種失敗。

目前的遊戲只會失敗，笑點主要打在他自己的直男行為和交友軟體的荒謬上，不醜化女性。接下來要加一條能真的走到結婚生小孩的真結局（見第 5 節）。

## 2. 技術

- Next.js 16（App Router）、React 19、Tailwind CSS v4、TypeScript
- PWA：Serwist，所有頁面和 `public/` 檔案都會預先快取，可完全離線
- 音效：Web Audio 即時合成，沒有音檔
- 存檔：localStorage（`left-on-read-run`、`left-on-read-meta`）

**這版 Next.js 有破壞性變更，寫程式前先讀 `node_modules/next/dist/docs/` 的相關指南**（`AGENTS.md` 的規定）。

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

```bash
npm run lint
```

```bash
npm run build
```

目前狀態：217 個測試全過，型別檢查和 build 都過，lint 只有一個既有警告（`save.test.ts` 的 `_ignored`）。

## 3. 程式結構

```
src/app/page.tsx                    首頁就是遊戲
src/components/original/
  LeftOnReadGame.tsx                主元件：畫面切換、dispatch、事件轉音效
  saveStore.ts                      localStorage + useSyncExternalStore
  PortraitFrame.tsx                 直立置中的外框
  PixelCanvas.tsx                   低解析 canvas，effect 裡繪製
  ui.tsx                            按鈕、對話框、狀態列、Scene
  screens/                          各畫面
  pixel/scenes.ts                   遊戲內場景（插圖 + 小動畫）
  pixel/introScenes.ts              開場分鏡
  pixel/girlSprite.ts               女角分層繪製
src/lib/left-on-read/               純邏輯，不依賴 React 或 DOM
  game.ts                           狀態機：advance、legalActions、checkInvariants
  story.ts                          開場白、抽劇情權重、聊天推進、對話紀錄、資料驗證
  stories/                          ghost、fade、pitch、quick 共 27 種，special.ts 是隱藏路線
  storyTypes.ts                     劇情型別
  girl.ts、girlData.ts              女角產生器（seed 決定一切）
  match.ts、swipe.ts、calendar.ts、meals.ts、flavor.ts、dex.ts、save.ts、intro.ts、ladybug.ts
public/left-on-read/                intro/（開場 4 張）、scene/（eatery、weekend 暫代圖）
assets/heroine/                     真結局女角素材 01～11.jpg，還沒用在遊戲裡，不會打包進 App
```

## 4. 目前的規則

**一天的流程**（`Phase`）：`payday → daytime → evening → night → swiping → matched → nightDone`，睡覺後隔天。

- 起始日 2026-03-02（週一），日曆用真實星期
- 每月 5 號入帳 36,000、扣房租水電 12,500，週末也會
- 起始金額 8,200。餐費 100～260，泡麵 30。錢扣到 0 為止，沒有 game over
- 每晚 10 張卡。右滑才可能配對，機率約 2%～29%，連續右滑會下降（`match.ts`）
- 配對後白天可回訊息，每個聊天每天推進一步
- 女角年齡固定 22～38 歲，有測試保證

**劇情引擎的關鍵限制：**

- 一般回覆選項只影響對話紀錄，不會改變結局
- 唯一例外是 `ReplyStep.decision`：選到指定選項就付費並觸發 `gameEnding` 事件，目前只有 1h2s 那題用到
- 走到結局時，畫面會清掉這一局的存檔（`commitSave(null, meta)`），圖鑑留著
- 不合法的動作要回傳同一個 `run` 參考，`events` 為空

**個工路線與瓢蟲結局（已完成）：** 約 5% 的卡片是個工，右滑 90% 配對，聊四輪後被問「1h2s 3000」。去：瓢蟲結局。不去：隱藏失敗「認真聊天的客人」。

## 5. 工作清單

### 優先：真結局（還沒開始）

**設計：**

1. **解鎖**：失敗圖鑑收集滿 10 種後，牌組才會偶爾出現她，右滑一定配對。用專屬路線，不算進 27 種。
2. **她**：黑長直髮、黑框眼鏡，27 歲。Swipy 卡片用固定圖片，不用程式產生的像素圖。
3. **聊天**：這條路線的選項要真的影響結果。要從她的自介找話題、不說教、也要分享自己。選錯太多就走回一般失敗。引擎目前沒有這個機制，要新增計分。
4. **第一次約會・信義威秀**：看電影，然後吃美食街。回收前面的失敗當笑點，例如結帳時有提 AA 的選項，選到扣分。
   - 收尾：「我第一次沒有在散場後查回家最快的路線。」
5. **第二次約會・大稻埕**：逛夜市、看煙火。
   - 收尾：「煙火放完，她說明年還想來。明年。她用了明年這個詞。」
6. **假失敗**（整條路線的高潮）：
   - 之後冠宇連續約她，她都沒空：「這週要加班耶」、「下週要回老家」、「最近真的比較忙」
   - 畫面完全照失敗結局的樣子演，紅色印章蓋下「下次吧」，玩家要以為她也斷聯了
   - 隔天手機一震，印章裂開：「欸，你什麼時候有空？板橋耶誕城我一直想去。這次換我約。」
   - 冠宇：「這是第二個主動找我的人。第一個要我加 LINE 看盤。」（回收劇情「帶看盤的姊姊」）
7. **第三次約會・板橋耶誕城**：看耶誕燈，告白。
8. **交往到結局**：泡麵那一幕變成兩個人吃 → 回嘉義見媽媽，媽媽塞一袋橘子給她 → 求婚 → 婚禮 → 抱著小孩。
9. **結局畫面**：
   ```
   真結局
   已讀。
   然後她回了。
   ```

**要做的事：**

- [ ] 週末多一個「出門約會」段落（新 phase 或 daytime 內的狀態），約會要花錢
- [ ] 專屬路線的資料結構：計分、約會節點、時間跳躍（用「（幾個月後）」帶過，不綁真實月份）
- [ ] 假失敗演出，要跟 `EndingScreen` 的失敗畫面長得一樣，再反轉
- [ ] 真結局畫面，走到後清掉這一局的存檔，可從圖鑑重看
- [ ] 結局收集：真結局和瓢蟲結局一起列在圖鑑
- [ ] `parseMeta`、`parseRun` 要接受新資料，壞資料不能當機
- [ ] 集滿 10 種的門檻、計分、機率都要有單元測試

**待確認：** 解鎖門檻和「結局收集」是暫定的，擁有者還沒明確回覆。

### 插圖（擁有者要自己生成）

擁有者覺得程式畫的像素小人怪怪的，正在用生圖工具做圖，圖來了要換上：

- 6:5 橫圖用在遊戲內場景，2:3 直圖用在開場和結局
- 新增圖片：放進 `public/left-on-read/`，在 `pixel/scenes.ts` 的 `PHOTO_SRC` 加一筆，再用 `photoScene(ctx, id, top, t)` 畫
- 目前要換的：`scene/eatery.jpg`、`scene/weekend.jpg`（合成的暫代圖）、瓢蟲結局的巷子與鐵門、畢業典禮、標題和配對畫面的主角大頭
- 真結局需要：電影院、美食街、大稻埕夜市、看煙火、假失敗（深夜看手機）、收到訊息（早上驚喜）、耶誕城告白、兩人吃泡麵、嘉義車站見媽媽、婚禮、抱小孩、片名背景

### 其他已知問題

- [ ] 沒有音量介面，音量固定 70%（`settings/storage.ts`）
- [ ] 吃飯的圖只有一張，點小火鍋或速食，桌上還是便當
- [ ] 週末房間白天檯燈還亮著
- [ ] 平日上班標示「白天」，窗外是傍晚
- [ ] 開場旋律是舊的，沒有配合現在的分鏡調整
- [ ] 沒有在真實手機上測過拖曳手感和 60fps 動畫，也沒有人確認過音效好不好聽

## 6. 開發規範

- **先寫測試**：`src/lib/` 的純邏輯用 `node --test`，亂數一律可注入
- **lib 的寫法**：Node 用型別剝除執行 `.ts`，不可用 enum、namespace、建構子參數屬性；型別用 `import type`；相對路徑帶 `.ts`；不可用 `@/`
- **避免 hydration 不一致**：`Math.random`、`crypto`、`Date.now` 只放在事件或 effect；canvas 只在 effect 繪製
- **對白**：原創，繁體中文、台灣用語，不抄網友原文。交友 APP 叫 Swipy，不用 Tinder 名稱與商標
- **角色**：所有女角都是成年人
- **改動範圍**：只動需要的地方，配合既有風格，註解用繁體中文
- **Commit**：Conventional Commits，主旨用繁體中文，例如 `feat(left-on-read): 新增真結局路線`
- **Commit 和 push**：擁有者明確要求時才做
- **驗證**：畫面的改動要實際開瀏覽器走過。測試環境的視窗在背景時 `requestAnimationFrame` 可能被節流，動畫看起來會變慢
