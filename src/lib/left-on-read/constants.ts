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
export const HEROINE_UNLOCK_FAILURES = 10;
export const HEROINE_NIGHT_RATE = 0.15;
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
