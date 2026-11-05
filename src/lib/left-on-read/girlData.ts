/**
 * 女角的變因資料表。全部是虛構資料：所有人都是成年人，穿日常服裝，
 * 身材只改身高和輪廓寬度；學校只有類型，公司不寫名字。
 */

export const HAIRS = [
  { id: "long", label: "長直髮" },
  { id: "wavy", label: "大波浪" },
  { id: "bob", label: "鮑伯頭" },
  { id: "pixie", label: "俐落短髮" },
  { id: "ponytail", label: "馬尾" },
  { id: "bun", label: "丸子頭" },
  { id: "braid", label: "側編髮" },
  { id: "bangs", label: "齊瀏海" },
  { id: "wolf", label: "層次狼尾" },
] as const;

export const HAIR_COLORS = [
  { id: "black", base: "#22202b", shade: "#14121c", shine: "#46425a" },
  { id: "brown", base: "#4a2f24", shade: "#301c16", shine: "#745040" },
  { id: "chestnut", base: "#7a4a2a", shade: "#54301a", shine: "#a8703f" },
  { id: "ash", base: "#77727f", shade: "#55515e", shine: "#a3a0aa" },
  { id: "wine", base: "#7c2c44", shade: "#551a2e", shine: "#ab4f6a" },
  { id: "honey", base: "#b58a3e", shade: "#8a6426", shine: "#e0bb6b" },
] as const;

export const SKINS = [
  { id: "fair", base: "#fbe2cf", shade: "#ecc2a8", blush: "#f6b5ab" },
  { id: "light", base: "#f4cfae", shade: "#dcaa86", blush: "#ee9e8e" },
  { id: "tan", base: "#dba97d", shade: "#bb8558", blush: "#d58068" },
  { id: "deep", base: "#a97449", shade: "#855632", blush: "#b05c44" },
] as const;

export const EYES = [
  { id: "round" },
  { id: "almond" },
  { id: "sleepy" },
  { id: "smile" },
  { id: "lash" },
] as const;

export const MOUTHS = [{ id: "smile" }, { id: "small" }, { id: "grin" }, { id: "flat" }] as const;

export const ACCESSORIES = [
  { id: "none", label: "無" },
  { id: "glasses", label: "眼鏡" },
  { id: "earrings", label: "耳環" },
  { id: "headband", label: "髮帶" },
  { id: "cap", label: "帽子" },
  { id: "mask", label: "口罩自拍" },
] as const;

/** 全部是日常服裝 */
export const OUTFITS = [
  { id: "tee", label: "T 恤", base: "#e8e4d8", trim: "#b9b4a4" },
  { id: "shirt", label: "襯衫", base: "#8fb4d9", trim: "#f2f2ea" },
  { id: "sweater", label: "毛衣", base: "#c9694f", trim: "#a34c36" },
  { id: "hoodie", label: "連帽衫", base: "#6d7f6b", trim: "#4f5f4e" },
  { id: "jacket", label: "外套", base: "#3d4a66", trim: "#f0ece0" },
  { id: "cardigan", label: "開襟衫", base: "#d9b45f", trim: "#f5f0e4" },
  { id: "overalls", label: "吊帶褲", base: "#5a7fa8", trim: "#f0e8d8" },
  { id: "blazer", label: "西裝外套", base: "#2f2f3a", trim: "#dfe3e8" },
] as const;

/** 身材只影響剪影：身高、肩寬、輪廓寬度（像素），不做其他差異 */
export const BODY_TYPES = [
  { id: "petite", label: "嬌小", lift: -10, shoulder: 32, torso: 26 },
  { id: "slim", label: "纖細", lift: 0, shoulder: 34, torso: 26 },
  { id: "average", label: "勻稱", lift: 0, shoulder: 40, torso: 34 },
  { id: "tall", label: "高挑", lift: 10, shoulder: 38, torso: 30 },
  { id: "plump", label: "肉肉", lift: 0, shoulder: 50, torso: 48 },
] as const;

export const PHOTO_BGS = [
  { id: "cafe", label: "咖啡廳" },
  { id: "beach", label: "海邊" },
  { id: "mountain", label: "山上" },
  { id: "market", label: "夜市" },
  { id: "cat", label: "跟貓合照" },
  { id: "gym", label: "健身房" },
  { id: "books", label: "書店" },
  { id: "ferris", label: "摩天輪" },
] as const;

/**
 * 興趣決定第四句開場白和自介。
 * openerLine 是冠宇努力回應她自介的那一句，用力過猛是正常的。
 */
export const INTERESTS = [
  {
    id: "hiking",
    label: "爬山",
    openerLine: "看到妳喜歡爬山！我最近也想開始，目前進度是買了一雙鞋",
    bios: ["週末不在山上，就是在去山上的路上", "下山之後最想吃的是雞排", "目標是把百岳走完，現在第 11 座"],
  },
  {
    id: "cats",
    label: "養貓",
    openerLine: "妳的貓好可愛，牠叫什麼名字？我可以先跟牠認識嗎",
    bios: ["我跟貓住，貓的租金是我付的", "想認識我要先過貓這關", "手機相簿九成是同一隻貓"],
  },
  {
    id: "coffee",
    label: "喝咖啡",
    openerLine: "妳也喝咖啡喔！我都喝公司的，一包三合一可以撐到下午三點",
    bios: ["沒喝咖啡不要跟我講話", "在找台北最好喝的拿鐵，還沒找到", "早上第一杯是我的人格"],
  },
  {
    id: "drama",
    label: "追劇",
    openerLine: "妳最近在追什麼劇？我想看看能不能先補完再來跟妳聊",
    bios: ["週末的計畫是把一季看完", "男主角的事我比他媽還關心", "想找人一起罵結局"],
  },
  {
    id: "fitness",
    label: "健身",
    openerLine: "妳有在健身好厲害，我也有在動，每天都在動滑鼠",
    bios: ["腿日不聊天", "硬舉比前任可靠", "下班直接去健身房，不用約"],
  },
  {
    id: "travel",
    label: "旅行",
    openerLine: "妳去過好多地方喔！我最遠去過高雄，還是出差",
    bios: ["存到錢就出國，存不到就去花蓮", "下一站還沒決定，機票很貴", "只想找人一起看行李"],
  },
  {
    id: "baking",
    label: "烘焙",
    openerLine: "妳會做甜點喔！我也會用微波爐，微波爐有一個按鍵叫解凍",
    bios: ["週末會烤東西，烤焦的我自己吃", "戚風蛋糕塌了也算我的", "辦公室的人都因為我變胖了"],
  },
  {
    id: "livemusic",
    label: "聽團",
    openerLine: "妳也聽現場喔！我上次聽現場是尾牙，主管唱了兩首",
    bios: ["一個月至少去一場 Live", "耳鳴是我的紀念品", "最後一排也是搖得很認真"],
  },
  {
    id: "photo",
    label: "拍照",
    openerLine: "妳的照片拍得好好，光圈多少？我不是要幹嘛，我只是想知道參數",
    bios: ["底片很貴，所以我拍得很少", "不用幫我拍，謝謝", "走路都在看光"],
  },
  {
    id: "boardgame",
    label: "桌遊",
    openerLine: "妳玩桌遊喔！我可以一個人玩四個角色，而且我都讓自己贏",
    bios: ["缺一，隨時缺一", "規則我來講，輸了不要怪我", "週五晚上都在桌遊店"],
  },
  {
    id: "food",
    label: "吃美食",
    openerLine: "妳喜歡吃美食喔！我有一張 Excel 記錄公司附近所有便當的 CP 值",
    bios: ["排隊排兩小時我也可以", "人生目標是吃遍全台灣的肉圓", "不吃香菜，其他都可以談"],
  },
  {
    id: "reading",
    label: "看書",
    openerLine: "妳也喜歡看書喔！我最近看的是一本五百頁的技術文件，妳想聽嗎",
    bios: ["包包裡一定有一本書", "最近在讀的那本，已經讀三個月了", "喜歡書店勝過喜歡大部分的人"],
  },
] as const;

/** 學經歷的權重最低：matchMod 只差 ±1% */
export const EDUCATIONS = [
  { id: "highschool", label: "高中職畢", matchMod: 1 },
  { id: "college", label: "專科畢", matchMod: 1 },
  { id: "tech", label: "科大畢", matchMod: 0 },
  { id: "private", label: "私立大學畢", matchMod: 0 },
  { id: "national", label: "國立大學畢", matchMod: -1 },
  { id: "master", label: "碩士畢", matchMod: -1 },
  { id: "abroad", label: "國外念書回來", matchMod: -1 },
] as const;

export const NICKNAMES = [
  "小魚", "米粒", "阿布", "Momo", "Rita", "小安", "芋圓", "豆花", "Vivi", "Hana",
  "小羽", "Ting", "阿蓁", "Yuna", "湯圓", "小綠", "Joyce", "Mia", "Kiki", "Cindy",
  "小鹿", "泡芙", "阿晴", "Nana", "橘子", "小葵", "海苔", "布丁", "小涵", "阿芝",
  "Eve", "Lulu", "皮蛋", "小樹", "阿寧", "Ruby", "小滿", "薄荷", "Amber", "阿沐",
] as const;

/** 個工的自介：冠宇會以為是做設計的 */
export const STUDIO_JOB = "個人工作室";
export const STUDIO_BIOS = [
  "個人工作室，環境乾淨舒適，歡迎預約",
  "平日午後都在，想聊聊可以私訊",
  "不玩遊戲，有誠意的哥哥再來",
] as const;

export const JOBS = [
  "行政助理", "護理師", "客服專員", "UI 設計師", "會計", "門市店長", "藥師", "行銷企劃",
  "銀行櫃員", "業務助理", "翻譯", "記者", "社工", "牙醫助理", "瑜珈老師", "咖啡師",
  "品管工程師", "人資", "研究助理", "自由接案", "幼教老師", "專案經理", "物理治療師", "花藝師",
] as const;

export type HairId = (typeof HAIRS)[number]["id"];
export type HairColorId = (typeof HAIR_COLORS)[number]["id"];
export type SkinId = (typeof SKINS)[number]["id"];
export type EyesId = (typeof EYES)[number]["id"];
export type MouthId = (typeof MOUTHS)[number]["id"];
export type AccessoryId = (typeof ACCESSORIES)[number]["id"];
export type OutfitId = (typeof OUTFITS)[number]["id"];
export type BodyType = (typeof BODY_TYPES)[number]["id"];
export type PhotoBgId = (typeof PHOTO_BGS)[number]["id"];
export type InterestId = (typeof INTERESTS)[number]["id"];
export type EducationId = (typeof EDUCATIONS)[number]["id"];
