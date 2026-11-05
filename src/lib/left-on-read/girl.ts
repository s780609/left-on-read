/**
 * 女角產生器：全部由一個 seed 決定，同一個 seed 一定得到同一個人。
 */

import {
  ACCESSORIES,
  BODY_TYPES,
  BROWS,
  CITY_BANDS,
  EDUCATIONS,
  EYES,
  EYE_COLORS,
  FACE_MARKS,
  FACE_SHAPES,
  HAIRS,
  HAIR_COLORS,
  HAIR_SIDES,
  HEROINE_INTEREST,
  INTERESTS,
  JOBS,
  LIP_COLORS,
  MOUTHS,
  NICKNAMES,
  OUTFITS,
  PHOTO_BGS,
  SKINS,
  STUDIO_BIOS,
  STUDIO_JOB,
} from "./girlData.ts";
import type {
  AccessoryId,
  BodyType,
  BrowId,
  EducationId,
  EyeColorId,
  EyesId,
  FaceMarkId,
  FaceShapeId,
  HairColorId,
  HairId,
  HairSideId,
  InterestId,
  LipColorId,
  MouthId,
  OutfitColorId,
  OutfitId,
  PhotoBgId,
  SkinId,
} from "./girlData.ts";
import { HEROINE_PHOTOS, HEROINE_SEED, STUDIO_RATE } from "./constants.ts";
import { createRng, mixSeed, pick, randInt, weightedPick } from "./rng.ts";

export type { BodyType } from "./girlData.ts";

export interface GirlFace {
  shape: FaceShapeId;
  hair: HairId;
  hairColor: HairColorId;
  /** 旁分、馬尾、側編髮甩向哪邊 */
  hairSide: HairSideId;
  skin: SkinId;
  eyes: EyesId;
  eyeColor: EyeColorId;
  brow: BrowId;
  mouth: MouthId;
  lip: LipColorId;
  mark: FaceMarkId;
  accessory: AccessoryId;
}

export interface Girl {
  seed: number;
  nickname: string;
  age: number;
  distanceKm: number;
  /** 住哪裡，跟 distanceKm 對得上 */
  city: string;
  bio: string;
  interest: InterestId;
  education: EducationId;
  job: string;
  photoBg: PhotoBgId;
  pickiness: number;
  /** 個工（個人工作室）：走隱藏路線 */
  studio: boolean;
  face: GirlFace;
  body: BodyType;
  outfit: OutfitId;
  outfitColor: OutfitColorId;
  /** 有照片就用照片，不畫像素小人 */
  photos?: readonly string[];
}

/** 真結局的小晴：卡片固定，不看亂數 */
const HEROINE: Girl = {
  seed: HEROINE_SEED,
  nickname: "小晴",
  age: 27,
  distanceKm: 6,
  city: "台北市",
  bio: "週末喜歡去沒去過的地方，也喜歡待在家。",
  interest: HEROINE_INTEREST.id,
  education: "national",
  job: "研究助理",
  photoBg: "books",
  pickiness: 0,
  studio: false,
  face: {
    shape: "oval",
    hair: "long",
    hairColor: "black",
    hairSide: "left",
    skin: "fair",
    eyes: "almond",
    eyeColor: "darkbrown",
    brow: "soft",
    mouth: "small",
    lip: "nude",
    mark: "none",
    accessory: "glasses",
  },
  body: "average",
  outfit: "shirt",
  outfitColor: "white",
  photos: HEROINE_PHOTOS,
};

/** 每個變因用自己的亂數，調整某個資料表不會連帶改變其他變因 */
const ROLL = {
  nickname: 1,
  age: 2,
  distance: 3,
  bio: 4,
  interest: 5,
  education: 6,
  job: 7,
  photoBg: 8,
  pickiness: 9,
  hair: 10,
  hairColor: 11,
  skin: 12,
  eyes: 13,
  mouth: 14,
  accessory: 15,
  body: 16,
  outfit: 17,
  studio: 18,
  city: 19,
  shape: 20,
  hairSide: 21,
  eyeColor: 22,
  brow: 23,
  lip: 24,
  mark: 25,
  outfitColor: 26,
} as const;

const MIN_AGE = 22;
const MAX_AGE = 38;

/**
 * 不合理的圖層組合。其他圖層都獨立，只有配件會被髮型或服裝擋住：
 * 帽子壓不住頭頂的丸子，頭上的配件也放不上去；項鍊會被高領和帽 T 蓋掉。
 */
const ACCESSORY_BLOCKED_BY_HAIR: Partial<Record<HairId, readonly AccessoryId[]>> = {
  bun: ["cap", "beanie", "headband"],
};
const ACCESSORY_BLOCKED_BY_OUTFIT: Partial<Record<OutfitId, readonly AccessoryId[]>> = {
  turtleneck: ["necklace"],
  hoodie: ["necklace"],
};

export function isAccessoryAllowed(accessory: AccessoryId, hair: HairId, outfit: OutfitId): boolean {
  return (
    !ACCESSORY_BLOCKED_BY_HAIR[hair]?.includes(accessory) && !ACCESSORY_BLOCKED_BY_OUTFIT[outfit]?.includes(accessory)
  );
}

export function outfitColorsOf(outfit: OutfitId): readonly { id: OutfitColorId }[] {
  return (OUTFITS.find((o) => o.id === outfit) ?? OUTFITS[0]).colors;
}

/** 距離落在哪一組就從哪一組抽，超出範圍算最遠那組 */
export function citiesWithin(distanceKm: number): readonly string[] {
  return (CITY_BANDS.find((b) => distanceKm <= b.maxKm) ?? CITY_BANDS[CITY_BANDS.length - 1]).cities;
}

export function generateGirl(seed: number): Girl {
  const s = seed >>> 0;
  if (s === HEROINE_SEED) return HEROINE;
  const roll = (key: keyof typeof ROLL) => createRng(mixSeed(s, ROLL[key]));
  const interest = pick(roll("interest"), INTERESTS);
  const studio = roll("studio")() < STUDIO_RATE;
  const distanceKm = randInt(roll("distance"), 1, 35);
  const hair = pick(roll("hair"), HAIRS).id;
  const outfit = pick(roll("outfit"), OUTFITS).id;
  const accessories = ACCESSORIES.filter((a) => isAccessoryAllowed(a.id, hair, outfit));
  return {
    seed: s,
    nickname: pick(roll("nickname"), NICKNAMES),
    age: randInt(roll("age"), MIN_AGE, MAX_AGE),
    distanceKm,
    city: pick(roll("city"), citiesWithin(distanceKm)),
    bio: studio ? pick(roll("bio"), STUDIO_BIOS) : pick(roll("bio"), interest.bios),
    interest: interest.id,
    education: pick(roll("education"), EDUCATIONS).id,
    job: studio ? STUDIO_JOB : pick(roll("job"), JOBS),
    photoBg: pick(roll("photoBg"), PHOTO_BGS).id,
    pickiness: roll("pickiness")(),
    studio,
    face: {
      shape: pick(roll("shape"), FACE_SHAPES).id,
      hair,
      hairColor: pick(roll("hairColor"), HAIR_COLORS).id,
      hairSide: pick(roll("hairSide"), HAIR_SIDES).id,
      skin: pick(roll("skin"), SKINS).id,
      eyes: pick(roll("eyes"), EYES).id,
      eyeColor: pick(roll("eyeColor"), EYE_COLORS).id,
      brow: pick(roll("brow"), BROWS).id,
      mouth: pick(roll("mouth"), MOUTHS).id,
      lip: pick(roll("lip"), LIP_COLORS).id,
      mark: weightedPick(roll("mark"), FACE_MARKS.map((m) => ({ item: m.id, weight: m.weight }))),
      accessory: weightedPick(roll("accessory"), accessories.map((a) => ({ item: a.id, weight: a.weight }))),
    },
    body: pick(roll("body"), BODY_TYPES).id,
    outfit,
    outfitColor: pick(roll("outfitColor"), outfitColorsOf(outfit)).id,
  };
}

/** 每晚牌組：不存游標，由局、天、第幾張決定 */
export function deckSeed(runSeed: number, dayIndex: number, cardIndex: number): number {
  const seed = mixSeed(runSeed, dayIndex, cardIndex, 0xca4d);
  // 一般的牌不可以剛好撞到她的 seed
  return seed === HEROINE_SEED ? seed ^ 1 : seed;
}

/** 只顯示一行的學經歷：「學校類型｜工作」 */
export function educationLine(girl: Girl): string {
  const edu = EDUCATIONS.find((e) => e.id === girl.education);
  return `${edu?.label ?? ""}｜${girl.job}`;
}
