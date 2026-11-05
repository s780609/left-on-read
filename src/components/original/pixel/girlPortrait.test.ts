import { test } from "node:test";
import assert from "node:assert/strict";
import { deckSeed, generateGirl, isAccessoryAllowed, type Girl } from "../../../lib/left-on-read/girl.ts";
import { HEROINE_SEED } from "../../../lib/left-on-read/constants.ts";
import {
  ACCESSORIES,
  BODY_TYPES,
  BROWS,
  EYES,
  EYE_COLORS,
  FACE_MARKS,
  FACE_SHAPES,
  HAIRS,
  HAIR_COLORS,
  LIP_COLORS,
  MOUTHS,
  OUTFITS,
  PHOTO_BGS,
  SKINS,
} from "../../../lib/left-on-read/girlData.ts";
import { PORTRAIT_H, PORTRAIT_W, headTop, renderPortrait } from "./girlPortrait.ts";
import { PHOTO_H, PHOTO_W, drawGirl, faceCrop } from "./girlSprite.ts";
import { blit, createPicture } from "./raster.ts";
import type { Ctx } from "./draw.ts";

const base = generateGirl(1);
const plain: Girl = {
  ...base,
  face: { ...base.face, accessory: "none", hair: "long", hairSide: "left", eyes: "round", mouth: "smile", mark: "none" },
  body: "average",
  outfit: "tee",
  outfitColor: "cream",
};
const withFace = (face: Partial<Girl["face"]>): Girl => ({ ...plain, face: { ...plain.face, ...face } });
const samePixels = (a: Int32Array, b: Int32Array) => a.length === b.length && a.every((v, i) => v === b[i]);

/** 只記錄顏色和範圍的假 canvas，不需要瀏覽器 */
function fakeCtx() {
  const calls: { color: string; x: number; y: number; w: number; h: number }[] = [];
  const ctx = {
    fillStyle: "",
    fillRect(x: number, y: number, w: number, h: number) {
      calls.push({ color: String(ctx.fillStyle), x, y, w, h });
    },
  };
  return { ctx: ctx as unknown as Ctx, calls };
}

test("同一個 seed 算出來每個像素都一樣", () => {
  for (const seed of [0, 1, 777, 123456789, deckSeed(5, 3, 2)]) {
    assert.ok(samePixels(renderPortrait(generateGirl(seed)).d, renderPortrait(generateGirl(seed)).d), `seed ${seed}`);
    const first = fakeCtx();
    const second = fakeCtx();
    drawGirl(first.ctx, generateGirl(seed));
    drawGirl(second.ctx, generateGirl(seed));
    assert.deepEqual(first.calls, second.calls, `seed ${seed} 的繪製指令不同`);
  }
});

test("不同 seed 的人長得不一樣", () => {
  const looks = new Set<string>();
  for (let seed = 0; seed < 200; seed++) looks.add(renderPortrait(generateGirl(seed)).d.join(","));
  assert.ok(looks.size >= 198, `200 個 seed 只有 ${looks.size} 種長相`);
});

test("每一層的每個選項都畫得出來，而且真的會改變畫面", () => {
  const distinct = <T extends string>(name: string, ids: readonly T[], look: (id: T) => Girl) => {
    const seen = new Set<string>();
    for (const id of ids) seen.add(renderPortrait(look(id)).d.join(","));
    assert.equal(seen.size, ids.length, `${name}有選項畫出來一模一樣`);
  };
  distinct("髮型", HAIRS.map((x) => x.id), (hair) => withFace({ hair }));
  distinct("髮色", HAIR_COLORS.map((x) => x.id), (hairColor) => withFace({ hairColor }));
  distinct("臉型", FACE_SHAPES.map((x) => x.id), (shape) => withFace({ shape }));
  distinct("膚色", SKINS.map((x) => x.id), (skin) => withFace({ skin }));
  distinct("眼睛", EYES.map((x) => x.id), (eyes) => withFace({ eyes }));
  distinct("瞳色", EYE_COLORS.map((x) => x.id), (eyeColor) => withFace({ eyeColor }));
  distinct("眉毛", BROWS.map((x) => x.id), (brow) => withFace({ brow, hair: "ponytail" }));
  distinct("嘴巴", MOUTHS.map((x) => x.id), (mouth) => withFace({ mouth }));
  distinct("唇色", LIP_COLORS.map((x) => x.id), (lip) => withFace({ lip }));
  distinct("臉部特徵", FACE_MARKS.map((x) => x.id), (mark) => withFace({ mark }));
  distinct("配件", ACCESSORIES.map((x) => x.id), (accessory) => withFace({ accessory }));
  distinct("身材", BODY_TYPES.map((x) => x.id), (body) => ({ ...plain, body }));
  for (const o of OUTFITS) {
    distinct(`${o.label}的顏色`, o.colors.map((c) => c.id as Girl["outfitColor"]), (outfitColor) => ({ ...plain, outfit: o.id, outfitColor }));
  }
});

test("圖層互不干擾：換衣服不動到臉，換表情不動到衣服和頭髮", () => {
  const faceBottom = headTop(plain) + 44;
  const top = (p: Int32Array) => p.slice(0, faceBottom * PORTRAIT_W);
  const reference = renderPortrait(withFace({ hair: "ponytail" })).d;
  for (const o of OUTFITS) {
    const dressed = renderPortrait({ ...withFace({ hair: "ponytail" }), outfit: o.id, outfitColor: o.colors[0].id }).d;
    assert.ok(samePixels(top(dressed), top(reference)), `${o.id} 動到了臉`);
  }
  const hy = headTop(plain);
  for (const mouth of MOUTHS) {
    const changed = renderPortrait(withFace({ mouth: mouth.id })).d;
    const base = renderPortrait(plain).d;
    changed.forEach((v, i) => {
      if (v === base[i]) return;
      const y = Math.floor(i / PORTRAIT_W);
      // 開口笑時腮紅會深一點，所以範圍從臉頰算起
      assert.ok(y >= hy + 32 && y < hy + 52, `嘴巴 ${mouth.id} 動到了第 ${y} 列`);
    });
  }
});

test("所有合法的髮型、配件、服裝、身材組合都能畫，臉和衣服都在畫面裡", () => {
  let combos = 0;
  for (const hair of HAIRS) {
    for (const accessory of ACCESSORIES) {
      for (const outfit of OUTFITS) {
        if (!isAccessoryAllowed(accessory.id, hair.id, outfit.id)) continue;
        for (const body of BODY_TYPES) {
          for (const hairSide of ["left", "right"] as const) {
            const look: Girl = {
              ...plain,
              body: body.id,
              outfit: outfit.id,
              outfitColor: outfit.colors[0].id,
              face: { ...plain.face, hair: hair.id, accessory: accessory.id, hairSide },
            };
            const { d } = renderPortrait(look);
            combos++;
            assert.equal(d.length, PORTRAIT_W * PORTRAIT_H);
            const id = `${hair.id}/${accessory.id}/${outfit.id}/${body.id}/${hairSide}`;
            // 眼睛中間、胸口、畫面最底下一定有東西
            assert.notEqual(d[(headTop(look) + 30) * PORTRAIT_W + 60], -1, `${id} 沒有臉`);
            assert.notEqual(d[(PORTRAIT_H - 1) * PORTRAIT_W + 60], -1, `${id} 底部沒有身體`);
            // 所有像素都是合法顏色
            assert.ok(d.every((v) => v === -1 || (v >= 0 && v <= 0xffffff)), `${id} 有不合法的顏色`);
          }
        }
      }
    }
  }
  assert.ok(combos > 3000, `只驗了 ${combos} 種組合`);
});

test("產生器抽出來的人都能畫完整張照片，座標都是有效數字", () => {
  for (let seed = 0; seed < 300; seed++) {
    const { ctx, calls } = fakeCtx();
    drawGirl(ctx, generateGirl(seed * 97 + 3));
    for (const { x, y, w, h } of calls) {
      assert.ok(Number.isFinite(x + y + w + h), `seed ${seed} 有不是數字的座標`);
    }
    assert.ok(calls.length > 100, `seed ${seed} 的畫面太單調`);
  }
  for (const { id } of PHOTO_BGS) {
    const { ctx, calls } = fakeCtx();
    drawGirl(ctx, { ...plain, photoBg: id });
    assert.ok(calls.length > 0, id);
  }
});

test("臉部裁切一定在照片範圍內", () => {
  for (const { id } of BODY_TYPES) {
    const crop = faceCrop({ ...plain, body: id }, 72);
    assert.ok(crop.x >= 0 && crop.y >= 0 && crop.x + 72 <= PHOTO_W && crop.y + 72 <= PHOTO_H, id);
  }
});

test("小晴的資料沒有被產生器動到，而且仍然用照片", () => {
  const heroine = generateGirl(HEROINE_SEED);
  assert.equal(heroine.nickname, "小晴");
  assert.equal(heroine.age, 27);
  assert.ok((heroine.photos?.length ?? 0) > 0);
  assert.equal(heroine.face.accessory, "glasses");
  // 她的欄位也合法：萬一哪天照片載入失敗，要畫得出備用的半身像
  assert.notEqual(renderPortrait(heroine).d[(headTop(heroine) + 30) * PORTRAIT_W + 60], -1);
});

test("blit 會跳過透明像素，同色併成一條", () => {
  const pic = createPicture(4, 2);
  pic.d.set([0xff0000, 0xff0000, -1, 0x00ff00, -1, -1, -1, -1]);
  const { ctx, calls } = fakeCtx();
  blit(ctx, pic);
  assert.deepEqual(calls, [
    { color: "#ff0000", x: 0, y: 0, w: 2, h: 1 },
    { color: "#00ff00", x: 3, y: 0, w: 1, h: 1 },
  ]);
});
