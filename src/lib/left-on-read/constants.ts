/** 《已讀不回》的固定數值 */

/** 起始日 2026-03-02（週一），dayIndex 0 */
export const START_DATE_UTC = Date.UTC(2026, 2, 2);

export const DECK_SIZE = 10;

export const START_MONEY = 8_200;
export const MONTHLY_SALARY = 36_000;
export const MONTHLY_RENT = 12_500;
export const NOODLE_PRICE = 30;
export const MEAL_PRICE_MIN = 100;
export const MEAL_PRICE_MAX = 260;
/** 讀檔時的金額上限，正常遊玩賺不到這麼多 */
export const MAX_MONEY = 999_999_999;

export const GUANYU_AGE = 25;

export const RUN_SAVE_KEY = "left-on-read-run";
export const META_SAVE_KEY = "left-on-read-meta";

/** 瓢蟲結局：1h2s 的價格、結局在圖鑑裡的 id */
export const LADYBUG_COST = 3000;
export const LADYBUG_ENDING_ID = "ladybug";
/** 牌組裡有多少是個工，以及她們右滑後配對的機率（幾乎秒配） */
export const STUDIO_RATE = 0.05;
export const STUDIO_MATCH_P = 0.9;

/** 真結局：圖鑑收集滿幾種失敗才解鎖、解鎖後每晚出現的機率 */
export const HEROINE_UNLOCK_FAILURES = 5;
export const HEROINE_NIGHT_RATE = 1;
/** 第一階段聊天總分要到多少才會進入約會；開場白挑興趣句加的分 */
export const HEROINE_PASS_SCORE = 2;
export const HEROINE_INTEREST_OPENER_SCORE = 1;
/** 三次約會的花費：信義威秀、大稻埕、板橋耶誕城 */
export const HEROINE_DATE_COSTS = [800, 500, 300] as const;
/** 她的卡片不靠亂數產生，用這個固定 seed 代表她；牌組的 seed 會避開這個值 */
export const HEROINE_SEED = 0x51a0c1e9;
/** 她的照片：第一張是卡片和聊天頭像，第二張是點卡片看到的第二張照片 */
export const HEROINE_PHOTOS = ["/left-on-read/heroine/08.jpg", "/left-on-read/heroine/09.jpg"] as const;
export const TRUE_ENDING_ID = "true-love";

/** 白天認真回訊息的上限；逼玩家選要養哪幾條線 */
export const DAYTIME_REPLY_LIMIT = 3;
/** 聊天隱性數值：尷尬到這個值會提早結束 */
export const AWKWARD_END = 3;
/** 好感不夠又壓力太高時，也會提早冷掉 */
export const PRESSURE_SOFT_END = 4;
export const AFFECTION_SOFT_MIN = 1;

/** ---------- A：冠宇的 Swipy 個人檔案、付費功能、打理自己 ---------- */
/** Swipy Gold：30 天，曝光度提升（系統是這樣說的） */
export const GOLD_PRICE = 590;
export const GOLD_DAYS = 30;
export const GOLD_MATCH_MULT = 1.25;
/** 超級喜歡：一次付一次，配對率乘上去，上限也比較高 */
export const SUPER_LIKE_PRICE = 99;
export const SUPER_LIKE_MULT = 2.2;
export const SUPER_LIKE_MAX_P = 0.6;
/** 週末出門打理自己 */
export const HAIRCUT_PRICE = 800;
export const HAIRCUT_DAYS = 21;
export const HAIRCUT_MATCH_MULT = 1.15;
export const OUTFIT_PRICE = 1_500;
export const OUTFIT_MATCH_MULT = 1.1;
export const PHOTOSHOOT_PRICE = 2_400;

/** ---------- B：看自介識破業績 ---------- */
/** 牌組裡有多少是「有業績」的卡；個工優先，兩者不重疊 */
export const LURE_RATE = 0.1;
/** 她們誰都喜歡，配對率比較高 */
export const LURE_MATCH_MULT = 1.6;
/** 一般卡抽到業績類劇情的倍率：業績線主要從可疑的卡片來 */
export const NON_LURE_PITCH_MULT = 0.15;

/** ---------- D：同時聊太多人會傳錯 ---------- */
export const MIXUP_MIN_CHATS = 3;
export const MIXUP_P = 0.15;

/** ---------- E：夜間消遣 ---------- */
/** 打電動隔天睡太晚，白天少回一則 */
export const GAMES_TIRED_PENALTY = 1;

/** ---------- F：節日與白天事件 ---------- */
export const DAY_EVENT_RATE = 0.25;
export const TYPHOON_REPLY_BONUS = 2;
export const OVERTIME_PAY = 1_200;
export const INVOICE_PRIZE = 200;
export const INVOICE_WIN_P = 0.3;

/** ---------- 重玩價值 ---------- */
/** 新遊戲＋：冠宇比較知道要回誰，白天多一則 */
export const NG_PLUS_REPLY_BONUS = 1;
/** 第二條真結局：Iris。走到任何一個結局之後才會出現，每晚出現的機率 */
export const IRIS_NIGHT_RATE = 0.5;
export const IRIS_SEED = 0x1a15c0de;
export const IRIS_PASS_SCORE = 2;
/** 她最討厭已讀不回：連續幾晚沒回她，她就走了 */
export const IRIS_PATIENCE = 2;
export const IRIS_DATE_COSTS = [200, 450] as const;
export const IRIS_ENDING_ID = "iris-love";
/** 存款到這裡算「有錢但沒有人可以請」 */
export const RICH_ALONE_MONEY = 100_000;
export const DRY_SPELL_DAYS = 30;
