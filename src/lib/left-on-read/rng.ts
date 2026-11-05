/**
 * 《已讀不回》的可重現亂數。tank/rng.ts 是 LCG，相鄰 seed 輸出太像，這裡自己寫 mulberry32 加雜湊。
 */

/** 回傳 [0,1) 的亂數函式，一律由外部注入，測試才能重現 */
export type Rng = () => number;

const rotl = (x: number, r: number) => (x << r) | (x >>> (32 - r));

/** 任意數字（含 NaN、負數、小數）轉成 uint32 */
const toUint32 = (x: number) => x >>> 0;

/** mulberry32 */
export function createRng(seed: number): Rng {
  let a = toUint32(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 把多個數字雜湊成 uint32（murmur3 的混合步驟），參數個數不同結果也不同 */
export function mixSeed(...parts: number[]): number {
  let h = 0x9747b28c;
  for (const part of parts) {
    let k = Math.imul(toUint32(part), 0xcc9e2d51);
    k = Math.imul(rotl(k, 15), 0x1b873593);
    h = rotl(h ^ k, 13);
    h = (Math.imul(h, 5) + 0xe6546b64) | 0;
  }
  h ^= parts.length;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

export function pick<T>(rng: Rng, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)];
}

/** [min, max] 整數 */
export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** 權重 0 的項目不會被選到 */
export function weightedPick<T>(rng: Rng, items: readonly { item: T; weight: number }[]): T {
  const usable = items.filter((x) => x.weight > 0);
  const total = usable.reduce((sum, x) => sum + x.weight, 0);
  let r = rng() * total;
  for (const x of usable) {
    if (r < x.weight) return x.item;
    r -= x.weight;
  }
  // 浮點誤差才會走到這裡
  return usable[usable.length - 1].item;
}
