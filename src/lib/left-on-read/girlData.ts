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
  { id: "halfup", label: "公主頭" },
  { id: "lob", label: "水波鎖骨髮" },
] as const;

export const HAIR_COLORS = [
  { id: "black", base: "#2b2833", shade: "#191720", shine: "#5a5670" },
  { id: "brown", base: "#4f3429", shade: "#32201a", shine: "#86604c" },
  { id: "chestnut", base: "#7f4e2d", shade: "#57331c", shine: "#b57d4a" },
  { id: "ash", base: "#77727f", shade: "#55515e", shine: "#aeabb6" },
  { id: "wine", base: "#7c2c44", shade: "#551a2e", shine: "#b5597a" },
  { id: "honey", base: "#b58a3e", shade: "#8a6426", shine: "#e8c67a" },
  { id: "milktea", base: "#a98a72", shade: "#7d6250", shine: "#d8bda6" },
  { id: "mocha", base: "#5e4034", shade: "#3f2a23", shine: "#9a7362" },
] as const;

export const SKINS = [
  { id: "fair", base: "#fce6d6", shade: "#efc8b0", blush: "#f6a9a0", line: "#a8614e" },
  { id: "light", base: "#f7d6b8", shade: "#e2b08e", blush: "#ee9686", line: "#9c5a42" },
  { id: "tan", base: "#e3b48a", shade: "#c28d62", blush: "#d67c62", line: "#814b30" },
  { id: "deep", base: "#b5805a", shade: "#8e5e3c", blush: "#b85c44", line: "#5a3420" },
] as const;

/** 臉型：[離頭頂幾列, 半寬]，下巴高度也在裡面。不做幼態比例，全部是成年人的長度 */
export const FACE_SHAPES = [
  {
    id: "oval",
    label: "鵝蛋臉",
    profile: [[0, 11], [3, 17], [9, 21], [18, 23], [30, 23], [38, 20], [45, 15], [50, 9], [53, 4], [54, 0]],
  },
  {
    id: "round",
    label: "圓臉",
    profile: [[0, 12], [3, 18], [9, 22], [18, 24], [31, 24], [39, 22], [45, 17], [49, 11], [51, 6], [52, 0]],
  },
  {
    id: "heart",
    label: "瓜子臉",
    profile: [[0, 11], [3, 18], [9, 22], [18, 24], [28, 23], [36, 19], [43, 13], [49, 7], [53, 3], [54, 0]],
  },
  {
    id: "square",
    label: "方圓臉",
    profile: [[0, 12], [3, 18], [9, 22], [18, 23], [33, 23], [41, 21], [47, 16], [51, 9], [53, 5], [54, 0]],
  },
] as const;

export const EYES = [
  { id: "round" },
  { id: "almond" },
  { id: "sleepy" },
  { id: "smile" },
  { id: "lash" },
  { id: "droopy" },
] as const;

export const EYE_COLORS = [
  { id: "darkbrown", deep: "#2c1a18", mid: "#4f2f26", light: "#8c5a3e" },
  { id: "brown", deep: "#3a2118", mid: "#6e4128", light: "#b57d48" },
  { id: "hazel", deep: "#3e2c16", mid: "#7a5c24", light: "#c49a48" },
  { id: "gray", deep: "#2c2e3a", mid: "#555b6e", light: "#98a2b4" },
] as const;

/** 眉毛和嘴巴一起決定表情 */
export const BROWS = [{ id: "soft" }, { id: "arched" }, { id: "flat" }, { id: "worried" }] as const;

export const MOUTHS = [
  { id: "smile" },
  { id: "small" },
  { id: "grin" },
  { id: "flat" },
  { id: "pout" },
  { id: "laugh" },
  { id: "smirk" },
] as const;

export const LIP_COLORS = [
  { id: "coral", color: "#d9634f" },
  { id: "rose", color: "#c94f66" },
  { id: "nude", color: "#b9635a" },
] as const;

/** 臉上的小特徵 */
export const FACE_MARKS = [
  { id: "none", weight: 6 },
  { id: "mole", weight: 2 },
  { id: "freckles", weight: 1 },
] as const;

/** 非對稱的髮型（旁分、馬尾、側編髮）甩向哪一邊 */
export const HAIR_SIDES = [{ id: "left" }, { id: "right" }] as const;

/** weight：沒有配件的人要占多數，不然每個人都像在拍配件型錄 */
export const ACCESSORIES = [
  { id: "none", label: "無", weight: 8 },
  { id: "glasses", label: "眼鏡", weight: 3 },
  { id: "roundGlasses", label: "圓框眼鏡", weight: 2 },
  { id: "earrings", label: "耳環", weight: 3 },
  { id: "necklace", label: "項鍊", weight: 2 },
  { id: "headband", label: "髮帶", weight: 2 },
  { id: "ribbon", label: "緞帶", weight: 2 },
  { id: "hairclip", label: "髮夾", weight: 2 },
  { id: "cap", label: "帽子", weight: 2 },
  { id: "beanie", label: "毛帽", weight: 2 },
  { id: "mask", label: "口罩自拍", weight: 1 },
] as const;

/**
 * 全部是日常服裝。colors 只列這件衣服配得起來的顏色：
 * base 是主色，trim 是領口、內搭這類第二個顏色，stripe 是選用的條紋色。
 */
export const OUTFITS = [
  {
    id: "tee",
    label: "T 恤",
    colors: [
      { id: "cream", base: "#ece6d8", trim: "#bdb6a4" },
      { id: "breton", base: "#f0ece0", trim: "#3d4f78", stripe: "#3d4f78" },
      { id: "sage", base: "#a8bfa0", trim: "#7f9a78" },
      { id: "coral", base: "#ef9a86", trim: "#c9705e" },
    ],
  },
  {
    id: "shirt",
    label: "襯衫",
    colors: [
      { id: "skyblue", base: "#a7c6e4", trim: "#f2f2ea" },
      { id: "white", base: "#f0efe8", trim: "#ffffff" },
      { id: "pinstripe", base: "#e6ecf2", trim: "#ffffff", stripe: "#a2b6d0" },
      { id: "butter", base: "#f2dfa6", trim: "#fff6dc" },
    ],
  },
  {
    id: "sweater",
    label: "毛衣",
    colors: [
      { id: "terracotta", base: "#c9694f", trim: "#a34c36" },
      { id: "oatmeal", base: "#dccdb4", trim: "#b8a68a" },
      { id: "lilac", base: "#b6a4d4", trim: "#8e7cb0" },
      { id: "forest", base: "#55785f", trim: "#3c5a46" },
    ],
  },
  {
    id: "hoodie",
    label: "連帽衫",
    colors: [
      { id: "moss", base: "#7d8f7a", trim: "#5e6f5c" },
      { id: "gray", base: "#a9abb2", trim: "#84868e" },
      { id: "navy", base: "#3f4d6e", trim: "#2c3852" },
      { id: "peach", base: "#f0b8a0", trim: "#cf907a" },
    ],
  },
  {
    id: "jacket",
    label: "牛仔外套",
    colors: [
      { id: "denim", base: "#5d7fa8", trim: "#f0ece0" },
      { id: "darkdenim", base: "#3d4a66", trim: "#e8dfcf" },
      { id: "khaki", base: "#b39d74", trim: "#f4efe2" },
    ],
  },
  {
    id: "cardigan",
    label: "開襟衫",
    colors: [
      { id: "mustard", base: "#d9b45f", trim: "#f5f0e4" },
      { id: "dustypink", base: "#d9a3a8", trim: "#f8f2ea" },
      { id: "mint", base: "#a6cfc0", trim: "#f6f3ea" },
      { id: "charcoal", base: "#54535e", trim: "#ece7da" },
    ],
  },
  {
    id: "overalls",
    label: "吊帶褲",
    colors: [
      { id: "denim", base: "#5a7fa8", trim: "#f0e8d8" },
      { id: "olive", base: "#7c8254", trim: "#f4efe0" },
      { id: "corduroy", base: "#a9744a", trim: "#f6f0e0" },
    ],
  },
  {
    id: "blazer",
    label: "西裝外套",
    colors: [
      { id: "ink", base: "#34343f", trim: "#e6e9ee" },
      { id: "beige", base: "#c8b596", trim: "#f6f2e8" },
      { id: "navy", base: "#2f3d5c", trim: "#eef0f2" },
    ],
  },
  {
    id: "turtleneck",
    label: "高領上衣",
    colors: [
      { id: "black", base: "#32313a", trim: "#23222a" },
      { id: "camel", base: "#bb9264", trim: "#997448" },
      { id: "ivory", base: "#ece4d2", trim: "#c6bca6" },
    ],
  },
  {
    id: "dress",
    label: "小圓領洋裝",
    colors: [
      { id: "navy", base: "#3e4c70", trim: "#f6f2e6" },
      { id: "wine", base: "#8a3f50", trim: "#f6efe4" },
      { id: "sagegreen", base: "#8ea78c", trim: "#faf6ea" },
    ],
  },
] as const;

/**
 * 身材只影響剪影：身高、肩寬、輪廓寬度（像素），不做其他差異。
 * lift 是頭往上移幾像素；shoulder、torso 是整個寬度。
 */
export const BODY_TYPES = [
  { id: "petite", label: "嬌小", lift: -5, shoulder: 62, torso: 46 },
  { id: "slim", label: "纖細", lift: 0, shoulder: 66, torso: 46 },
  { id: "average", label: "勻稱", lift: 0, shoulder: 72, torso: 52 },
  { id: "tall", label: "高挑", lift: 5, shoulder: 70, torso: 50 },
  { id: "plump", label: "肉肉", lift: 0, shoulder: 88, torso: 68 },
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

/** 小晴專用，不放進 INTERESTS，一般女角的抽選結果才不會變 */
export const HEROINE_INTEREST = {
  id: "movies",
  label: "看電影",
  openerLine: "妳也喜歡看電影喔！我最近在找人一起看，一個人吃一桶爆米花有點多",
} as const;

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

/**
 * 有業績的卡：自介和職業看得出端倪。看得懂就左滑，想收集業績學程就右滑。
 * 這些都是常見的投資、直銷、感情詐騙話術，不是在說這些職業的人。
 */
export const LURE_BIOS = [
  "財務自由中，想認識有上進心的人",
  "相信正能量，努力讓家人過更好的生活",
  "最近在學投資理財，想找人一起成長",
  "平常研究虛擬貨幣跟紅酒，喜歡有想法的男生",
  "在國外工作，很少回台灣，想找真心的人",
] as const;
export const LURE_JOBS = ["理財顧問", "投資講師", "創業中", "電商老闆", "海外工程師"] as const;

/**
 * 住哪裡要跟「幾公里外」對得上：冠宇住在雙北，所以近的是台北，遠的才到桃園基隆。
 * 依序找第一個 maxKm 不小於距離的那一組。
 */
export const CITY_BANDS = [
  {
    maxKm: 8,
    cities: ["台北市大安區", "台北市中山區", "台北市信義區", "台北市松山區", "台北市萬華區", "台北市大同區", "台北市中正區", "台北市文山區"],
  },
  {
    maxKm: 18,
    cities: ["新北市板橋區", "新北市三重區", "新北市新店區", "新北市永和區", "新北市中和區", "新北市蘆洲區", "新北市汐止區", "台北市內湖區", "台北市北投區"],
  },
  {
    maxKm: 35,
    cities: ["新北市淡水區", "新北市林口區", "新北市三峽區", "新北市鶯歌區", "桃園市桃園區", "桃園市中壢區", "基隆市仁愛區", "基隆市七堵區"],
  },
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
export type FaceShapeId = (typeof FACE_SHAPES)[number]["id"];
export type EyeColorId = (typeof EYE_COLORS)[number]["id"];
export type BrowId = (typeof BROWS)[number]["id"];
export type LipColorId = (typeof LIP_COLORS)[number]["id"];
export type FaceMarkId = (typeof FACE_MARKS)[number]["id"];
export type HairSideId = (typeof HAIR_SIDES)[number]["id"];
export type AccessoryId = (typeof ACCESSORIES)[number]["id"];
export type OutfitId = (typeof OUTFITS)[number]["id"];
export type BodyType = (typeof BODY_TYPES)[number]["id"];
export type OutfitColorId = (typeof OUTFITS)[number]["colors"][number]["id"];
export type PhotoBgId = (typeof PHOTO_BGS)[number]["id"];
export type InterestId = (typeof INTERESTS)[number]["id"] | typeof HEROINE_INTEREST.id;
export type EducationId = (typeof EDUCATIONS)[number]["id"];
