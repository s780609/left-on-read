/**
 * 女角產生器：全部由一個 seed 決定，同一個 seed 一定得到同一個人。
 */

import {
  ACCESSORIES,
  BODY_TYPES,
  EDUCATIONS,
  EYES,
  HAIRS,
  HAIR_COLORS,
  INTERESTS,
  JOBS,
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
  EducationId,
  EyesId,
  HairColorId,
  HairId,
  InterestId,
  MouthId,
  OutfitId,
  PhotoBgId,
  SkinId,
} from "./girlData.ts";
import { STUDIO_RATE } from "./constants.ts";
import { createRng, mixSeed, pick, randInt } from "./rng.ts";

export type { BodyType } from "./girlData.ts";

export interface GirlFace {
  hair: HairId;
  hairColor: HairColorId;
  skin: SkinId;
  eyes: EyesId;
  mouth: MouthId;
  accessory: AccessoryId;
}

export interface Girl {
  seed: number;
  nickname: string;
  age: number;
  distanceKm: number;
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
}

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
} as const;

const MIN_AGE = 22;
const MAX_AGE = 38;

export function generateGirl(seed: number): Girl {
  const s = seed >>> 0;
  const roll = (key: keyof typeof ROLL) => createRng(mixSeed(s, ROLL[key]));
  const interest = pick(roll("interest"), INTERESTS);
  const studio = roll("studio")() < STUDIO_RATE;
  return {
    seed: s,
    nickname: pick(roll("nickname"), NICKNAMES),
    age: randInt(roll("age"), MIN_AGE, MAX_AGE),
    distanceKm: randInt(roll("distance"), 1, 35),
    bio: studio ? pick(roll("bio"), STUDIO_BIOS) : pick(roll("bio"), interest.bios),
    interest: interest.id,
    education: pick(roll("education"), EDUCATIONS).id,
    job: studio ? STUDIO_JOB : pick(roll("job"), JOBS),
    photoBg: pick(roll("photoBg"), PHOTO_BGS).id,
    pickiness: roll("pickiness")(),
    studio,
    face: {
      hair: pick(roll("hair"), HAIRS).id,
      hairColor: pick(roll("hairColor"), HAIR_COLORS).id,
      skin: pick(roll("skin"), SKINS).id,
      eyes: pick(roll("eyes"), EYES).id,
      mouth: pick(roll("mouth"), MOUTHS).id,
      accessory: pick(roll("accessory"), ACCESSORIES).id,
    },
    body: pick(roll("body"), BODY_TYPES).id,
    outfit: pick(roll("outfit"), OUTFITS).id,
  };
}

/** 每晚牌組：不存游標，由局、天、第幾張決定 */
export function deckSeed(runSeed: number, dayIndex: number, cardIndex: number): number {
  return mixSeed(runSeed, dayIndex, cardIndex, 0xca4d);
}

/** 只顯示一行的學經歷：「學校類型｜工作」 */
export function educationLine(girl: Girl): string {
  const edu = EDUCATIONS.find((e) => e.id === girl.education);
  return `${edu?.label ?? ""}｜${girl.job}`;
}
