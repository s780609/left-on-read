import { test } from "node:test";
import assert from "node:assert/strict";
import { citiesWithin, deckSeed, generateGirl, isAccessoryAllowed, outfitColorsOf } from "./girl.ts";
import type { BodyType, Girl } from "./girl.ts";
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
  INTERESTS,
  LIP_COLORS,
  MOUTHS,
  OUTFITS,
  PHOTO_BGS,
  SKINS,
} from "./girlData.ts";

const SWEEP = 20_000;
const SPECIAL_SEEDS = [0, 2 ** 32 - 1, -1, NaN];

/** 掃過的所有女角只產生一次，各測試共用 */
let cached: Girl[] | null = null;
function sweep(): Girl[] {
  if (cached) return cached;
  cached = [];
  for (let i = 0; i < SWEEP; i++) cached.push(generateGirl(i));
  for (const s of SPECIAL_SEEDS) cached.push(generateGirl(s));
  return cached;
}

/** 每個變因：資料表、從女角取值的方法、數量下限 */
const VARIANTS: { name: string; table: readonly { id: string }[]; of: (g: Girl) => string; min: number }[] = [
  { name: "髮型", table: HAIRS, of: (g) => g.face.hair, min: 8 },
  { name: "髮色", table: HAIR_COLORS, of: (g) => g.face.hairColor, min: 6 },
  { name: "髮向", table: HAIR_SIDES, of: (g) => g.face.hairSide, min: 2 },
  { name: "臉型", table: FACE_SHAPES, of: (g) => g.face.shape, min: 3 },
  { name: "膚色", table: SKINS, of: (g) => g.face.skin, min: 4 },
  { name: "眼睛", table: EYES, of: (g) => g.face.eyes, min: 5 },
  { name: "瞳色", table: EYE_COLORS, of: (g) => g.face.eyeColor, min: 2 },
  { name: "眉毛", table: BROWS, of: (g) => g.face.brow, min: 3 },
  { name: "嘴巴", table: MOUTHS, of: (g) => g.face.mouth, min: 4 },
  { name: "唇色", table: LIP_COLORS, of: (g) => g.face.lip, min: 2 },
  { name: "臉部特徵", table: FACE_MARKS, of: (g) => g.face.mark, min: 2 },
  { name: "配件", table: ACCESSORIES, of: (g) => g.face.accessory, min: 6 },
  { name: "身材", table: BODY_TYPES, of: (g) => g.body, min: 5 },
  { name: "服裝", table: OUTFITS, of: (g) => g.outfit, min: 5 },
  { name: "興趣", table: INTERESTS, of: (g) => g.interest, min: 1 },
  { name: "學歷", table: EDUCATIONS, of: (g) => g.education, min: 1 },
  { name: "照片背景", table: PHOTO_BGS, of: (g) => g.photoBg, min: 1 },
];

test("所有女角都是成年人：年齡一定是 22～38 的整數，每個值都出現", () => {
  const seen = new Set<number>();
  for (const g of sweep()) {
    assert.ok(Number.isInteger(g.age) && g.age >= 22 && g.age <= 38, `seed ${g.seed} 年齡 ${g.age}`);
    seen.add(g.age);
  }
  for (let age = 22; age <= 38; age++) assert.ok(seen.has(age), `沒有掃到 ${age} 歲`);
});

test("同一個 seed 一定得到同一個人", () => {
  for (const seed of [...SPECIAL_SEEDS, 1, 2, 12345, 987654321]) {
    assert.deepEqual(generateGirl(seed), generateGirl(seed));
  }
});

test("不同 seed 大多是不同的人，相鄰 seed 不會長得一樣", () => {
  const faces = new Set<string>();
  for (let i = 0; i < 1000; i++) {
    const g = generateGirl(i);
    faces.add(JSON.stringify([g.face, g.body, g.age]));
  }
  assert.ok(faces.size > 950, `1000 個 seed 只有 ${faces.size} 種組合`);
});

test("資料表數量達到下限，id 不重複", () => {
  for (const { name, table, min } of VARIANTS) {
    assert.ok(table.length >= min, `${name}只有 ${table.length} 種`);
    assert.equal(new Set(table.map((x) => x.id)).size, table.length, `${name} id 重複`);
  }
});

test("身材就是規格列的五種", () => {
  const expected: BodyType[] = ["petite", "slim", "average", "tall", "plump"];
  assert.deepEqual(BODY_TYPES.map((b) => b.id).sort(), [...expected].sort());
});

test("每個女角的變因都在資料表內", () => {
  const sets = VARIANTS.map(({ name, table, of }) => ({ name, of, ids: new Set(table.map((x) => x.id)) }));
  for (const g of sweep()) {
    for (const { name, of, ids } of sets) {
      assert.ok(ids.has(of(g)), `seed ${g.seed} 的${name} ${of(g)} 不在資料表內`);
    }
  }
});

test("所有變因值都掃得到", () => {
  for (const { name, table, of } of VARIANTS) {
    const seen = new Set(sweep().map(of));
    for (const { id } of table) assert.ok(seen.has(id), `沒有掃到${name} ${id}`);
  }
});

test("服裝只有日常服裝，資料裡沒有性感化的項目", () => {
  const banned = /比基尼|泳裝|泳衣|內衣|情趣|低胸|爆乳|馬甲|bikini|swim|lingerie|underwear/i;
  assert.ok(!banned.test(JSON.stringify(OUTFITS)));
  assert.ok(!banned.test(JSON.stringify(BODY_TYPES)));
});

test("每件服裝至少兩種顏色，抽到的顏色一定屬於那件衣服，每種都抽得到", () => {
  const seen = new Set<string>();
  for (const o of OUTFITS) assert.ok(o.colors.length >= 2, `${o.id} 只有 ${o.colors.length} 種顏色`);
  for (const g of sweep()) {
    assert.ok(outfitColorsOf(g.outfit).some((c) => c.id === g.outfitColor), `seed ${g.seed}：${g.outfit} 配到 ${g.outfitColor}`);
    seen.add(`${g.outfit}/${g.outfitColor}`);
  }
  for (const o of OUTFITS) for (const c of o.colors) assert.ok(seen.has(`${o.id}/${c.id}`), `沒有掃到 ${o.id}/${c.id}`);
});

test("不會抽到互相衝突的配件：丸子頭不戴帽子，高領和帽 T 不戴項鍊", () => {
  for (const hat of ["cap", "beanie", "headband"] as const) assert.equal(isAccessoryAllowed(hat, "bun", "tee"), false);
  assert.equal(isAccessoryAllowed("necklace", "long", "turtleneck"), false);
  assert.equal(isAccessoryAllowed("necklace", "long", "hoodie"), false);
  assert.equal(isAccessoryAllowed("cap", "long", "tee"), true);
  for (const g of sweep()) {
    assert.ok(isAccessoryAllowed(g.face.accessory, g.face.hair, g.outfit), `seed ${g.seed}：${g.face.hair}、${g.outfit} 配 ${g.face.accessory}`);
  }
});

test("住的地方跟距離對得上：近的在台北，每個地名都抽得到", () => {
  const seen = new Set<string>();
  for (const g of sweep()) {
    assert.ok(citiesWithin(g.distanceKm).includes(g.city), `seed ${g.seed}：${g.distanceKm} 公里住 ${g.city}`);
    seen.add(g.city);
  }
  for (const band of CITY_BANDS) for (const city of band.cities) assert.ok(seen.has(city), `沒有掃到 ${city}`);
  assert.ok(citiesWithin(1).every((c) => c.startsWith("台北市")));
});

test("pickiness 在 0～1，距離是正數", () => {
  for (const g of sweep()) {
    assert.ok(g.pickiness >= 0 && g.pickiness <= 1, `seed ${g.seed} pickiness ${g.pickiness}`);
    assert.ok(Number.isFinite(g.distanceKm) && g.distanceKm > 0, `seed ${g.seed} 距離 ${g.distanceKm}`);
  }
});

test("pickiness 有高有低，不是集中在一個值", () => {
  const list = sweep().map((g) => g.pickiness);
  assert.ok(list.some((p) => p < 0.25));
  assert.ok(list.some((p) => p > 0.75));
});

test("暱稱、自介、工作都有內容", () => {
  for (const g of sweep()) {
    assert.ok(typeof g.nickname === "string" && g.nickname.length > 0, `seed ${g.seed} 沒有暱稱`);
    assert.ok(typeof g.bio === "string" && g.bio.length > 0, `seed ${g.seed} 沒有自介`);
    assert.ok(typeof g.job === "string" && g.job.length > 0, `seed ${g.seed} 沒有工作`);
  }
});

test("興趣帶開場白，學歷帶影響值", () => {
  for (const i of INTERESTS) assert.ok(i.openerLine.length > 0, `${i.id} 沒有 openerLine`);
  for (const e of EDUCATIONS) assert.ok([-1, 0, 1].includes(e.matchMod), `${e.id} matchMod ${e.matchMod}`);
});

test("資料與產生的文字都不含 Tinder", () => {
  const tables = VARIANTS.map((v) => v.table);
  assert.ok(!/tinder/i.test(JSON.stringify(tables)));
  for (const g of sweep()) assert.ok(!/tinder/i.test(JSON.stringify(g)), `seed ${g.seed}`);
});

test("deckSeed：同樣輸入得到同樣結果", () => {
  assert.equal(deckSeed(7, 3, 2), deckSeed(7, 3, 2));
});

test("deckSeed：同一晚 10 張牌都不同，換天或換局也不同", () => {
  const night = Array.from({ length: 10 }, (_, i) => deckSeed(7, 3, i));
  assert.equal(new Set(night).size, 10);
  assert.notEqual(deckSeed(7, 3, 0), deckSeed(7, 4, 0));
  assert.notEqual(deckSeed(7, 3, 0), deckSeed(8, 3, 0));
  assert.notEqual(deckSeed(7, 3, 4), deckSeed(7, 4, 3));
});
