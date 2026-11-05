/**
 * 卡片拖曳的判定：放開時的距離和速度，決定飛出去還是彈回來。
 */

/** 距離門檻：卡片寬度的比例 */
export const SWIPE_THRESHOLD_RATIO = 0.3;
/** 甩動的速度門檻（px/ms，與 vx 同單位） */
export const SWIPE_FLICK_VELOCITY = 0.6;

export function resolveSwipe(dx: number, vx: number, cardWidth: number): "left" | "right" | null {
  if (dx === 0) return null;
  const dir = dx > 0 ? "right" : "left";
  if (Math.abs(dx) > SWIPE_THRESHOLD_RATIO * cardWidth) return dir;
  // 速度夠快而且方向一致才算甩
  if (Math.abs(vx) > SWIPE_FLICK_VELOCITY && Math.sign(vx) === Math.sign(dx)) return dir;
  return null;
}
