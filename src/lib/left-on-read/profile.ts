/**
 * 冠宇自己的 Swipy 個人檔案和打理自己：照片、自介會改配對率，也會改她們比較容易走哪一種失敗。
 * 錢終於有地方花：Swipy Gold、超級喜歡、剪頭髮、買衣服、拍形象照。
 */

import {
  GOLD_DAYS,
  GOLD_MATCH_MULT,
  GOLD_PRICE,
  HAIRCUT_DAYS,
  HAIRCUT_MATCH_MULT,
  HAIRCUT_PRICE,
  OUTFIT_MATCH_MULT,
  OUTFIT_PRICE,
  PHOTOSHOOT_PRICE,
} from "./constants.ts";
import type { StoryCategory } from "./storyTypes.ts";

export type ProfilePhotoId = "selfie" | "mountain" | "cat" | "group" | "pro";
export type ProfileBioId = "honest" | "joke" | "stats" | "template" | "sincere";

export interface Profile {
  photo: ProfilePhotoId;
  bio: ProfileBioId;
}

/** 買過、還有效的東西；Until 是 dayIndex，那一天之前（不含）有效 */
export interface Grooming {
  goldUntil: number;
  haircutUntil: number;
  outfit: boolean;
  proPhoto: boolean;
}

export type CategoryMult = Partial<Record<StoryCategory, number>>;

export interface ProfilePhoto {
  id: ProfilePhotoId;
  label: string;
  /** 冠宇對這張照片的說明 */
  note: string;
  matchMult: number;
  categoryMult: CategoryMult;
  /** 要先拍過形象照 */
  needsProPhoto?: boolean;
}

export interface ProfileBio {
  id: ProfileBioId;
  text: string;
  note: string;
  matchMult: number;
  categoryMult: CategoryMult;
}

export const PROFILE_PHOTOS: readonly ProfilePhoto[] = [
  {
    id: "selfie",
    label: "房間自拍",
    note: "背景有一件晾著的內褲。我截圖前沒看到。",
    matchMult: 1,
    categoryMult: {},
  },
  {
    id: "mountain",
    label: "登山照",
    note: "三年前爬過一次。照片比我的體力年輕。",
    matchMult: 1.05,
    categoryMult: { fade: 1.6 },
  },
  {
    id: "cat",
    label: "抱朋友的貓",
    note: "貓不是我的。配對到的人都先問貓。",
    matchMult: 1.15,
    categoryMult: { ghost: 1.6 },
  },
  {
    id: "group",
    label: "合照裁掉一半",
    note: "左邊還留著同事的肩膀。她們會問哪一個是我。",
    matchMult: 0.9,
    categoryMult: { quick: 1.8 },
  },
  {
    id: "pro",
    label: "攝影師形象照",
    note: "看起來像一個有存款的人。有些人對這點特別有興趣。",
    matchMult: 1.25,
    categoryMult: { pitch: 2 },
    needsProPhoto: true,
  },
];

export const PROFILE_BIOS: readonly ProfileBio[] = [
  {
    id: "honest",
    text: "工程師，喜歡待在家。",
    note: "很誠實。誠實到像一張請假單。",
    matchMult: 1,
    categoryMult: {},
  },
  {
    id: "joke",
    text: "會修電腦，不會修感情。",
    note: "同事說這句很好笑。同事是男的。",
    matchMult: 1.05,
    categoryMult: { quick: 1.4 },
  },
  {
    id: "stats",
    text: "172 公分，年收 47 萬，不菸不酒，有存款。",
    note: "規格寫清楚，比較有效率。有些人看完規格就來推銷了。",
    matchMult: 0.95,
    categoryMult: { pitch: 2.5 },
  },
  {
    id: "template",
    text: "喜歡旅行、美食、看電影，想找能一起成長的人。",
    note: "網路上抄的。看起來跟每個人都一樣，回覆的人也跟每個人都一樣。",
    matchMult: 1,
    categoryMult: { ghost: 1.4, quick: 1.2 },
  },
  {
    id: "sincere",
    text: "想認真認識一個人。週末會煮泡麵，可以分妳一半。",
    note: "寫完刪了三次又貼回來。",
    matchMult: 1.1,
    categoryMult: { ghost: 0.7, fade: 1.3 },
  },
];

export const DEFAULT_PROFILE: Profile = { photo: "selfie", bio: "honest" };
export const DEFAULT_GROOMING: Grooming = { goldUntil: 0, haircutUntil: 0, outfit: false, proPhoto: false };

export type ShopItemId = "gold" | "haircut" | "outfit" | "photoshoot";

export interface ShopItem {
  id: ShopItemId;
  name: string;
  price: number;
  desc: string;
  /** 買完的那一句 */
  line: string;
  /** 在哪裡買：Swipy 裡面，或週末出門 */
  where: "app" | "weekend";
}

export const SHOP_ITEMS: readonly ShopItem[] = [
  {
    id: "gold",
    name: "Swipy Gold",
    price: GOLD_PRICE,
    desc: `${GOLD_DAYS} 天，曝光度提升`,
    line: "付款成功。系統說我的曝光度提升了。它沒有說提升給誰看。",
    where: "app",
  },
  {
    id: "haircut",
    name: "髮廊剪頭髮",
    price: HAIRCUT_PRICE,
    desc: `${HAIRCUT_DAYS} 天內配對率提升`,
    line: "設計師問我想剪什麼感覺。我說：「看起來有人在等我回家的感覺。」她笑了，剪得很認真。",
    where: "weekend",
  },
  {
    id: "outfit",
    name: "買一套新衣服",
    price: OUTFIT_PRICE,
    desc: "永久提升配對率，只能買一次",
    line: "店員說這件很適合我。我第一次穿不是公司發的衣服照鏡子。",
    where: "weekend",
  },
  {
    id: "photoshoot",
    name: "請攝影師拍形象照",
    price: PHOTOSHOOT_PRICE,
    desc: "解鎖照片「攝影師形象照」",
    line: "攝影師叫我放鬆。我放鬆的樣子跟緊張的樣子一樣。他修了很久。",
    where: "weekend",
  },
];

export const SHOP_ITEM_BY_ID: Record<ShopItemId, ShopItem> = Object.fromEntries(
  SHOP_ITEMS.map((item) => [item.id, item])
) as Record<ShopItemId, ShopItem>;

export function photoOf(id: ProfilePhotoId): ProfilePhoto {
  return PROFILE_PHOTOS.find((p) => p.id === id) ?? PROFILE_PHOTOS[0];
}

export function bioOf(id: ProfileBioId): ProfileBio {
  return PROFILE_BIOS.find((b) => b.id === id) ?? PROFILE_BIOS[0];
}

export function isProfilePhotoId(x: unknown): x is ProfilePhotoId {
  return PROFILE_PHOTOS.some((p) => p.id === x);
}

export function isProfileBioId(x: unknown): x is ProfileBioId {
  return PROFILE_BIOS.some((b) => b.id === x);
}

export function isShopItemId(x: unknown): x is ShopItemId {
  return SHOP_ITEMS.some((i) => i.id === x);
}

export function isGoldActive(grooming: Grooming, dayIndex: number): boolean {
  return dayIndex < grooming.goldUntil;
}

export function isHaircutActive(grooming: Grooming, dayIndex: number): boolean {
  return dayIndex < grooming.haircutUntil;
}

/** 這張照片現在能不能用 */
export function canUsePhoto(photo: ProfilePhotoId, grooming: Grooming): boolean {
  return !photoOf(photo).needsProPhoto || grooming.proPhoto;
}

/** 這個東西現在還能不能買（不看錢） */
export function canBuy(item: ShopItemId, grooming: Grooming): boolean {
  if (item === "outfit") return !grooming.outfit;
  if (item === "photoshoot") return !grooming.proPhoto;
  return true;
}

/** 買下去之後 */
export function applyPurchase(grooming: Grooming, item: ShopItemId, dayIndex: number): Grooming {
  switch (item) {
    case "gold":
      return { ...grooming, goldUntil: Math.max(grooming.goldUntil, dayIndex) + GOLD_DAYS };
    case "haircut":
      return { ...grooming, haircutUntil: dayIndex + HAIRCUT_DAYS };
    case "outfit":
      return { ...grooming, outfit: true };
    case "photoshoot":
      return { ...grooming, proPhoto: true };
  }
}

/** 照片、自介、付費、打理加起來的配對率倍率 */
export function profileMatchMult(profile: Profile, grooming: Grooming, dayIndex: number): number {
  return (
    photoOf(profile.photo).matchMult *
    bioOf(profile.bio).matchMult *
    (isGoldActive(grooming, dayIndex) ? GOLD_MATCH_MULT : 1) *
    (isHaircutActive(grooming, dayIndex) ? HAIRCUT_MATCH_MULT : 1) *
    (grooming.outfit ? OUTFIT_MATCH_MULT : 1)
  );
}

/** 照片和自介讓哪一種失敗比較容易發生 */
export function profileCategoryMult(profile: Profile): CategoryMult {
  const photo = photoOf(profile.photo).categoryMult;
  const bio = bioOf(profile.bio).categoryMult;
  const out: CategoryMult = {};
  for (const category of ["ghost", "fade", "pitch", "quick"] as const) {
    const m = (photo[category] ?? 1) * (bio[category] ?? 1);
    if (m !== 1) out[category] = m;
  }
  return out;
}

/** 給畫面看的曝光指數：1～5 顆星 */
export function exposureStars(mult: number): number {
  // 預設檔案（倍率 1）是 2 顆星；換一張好一點的照片就看得出差別
  return Math.max(1, Math.min(5, Math.round((mult - 0.75) / 0.15)));
}
