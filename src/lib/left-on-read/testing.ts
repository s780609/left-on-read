/**
 * 測試共用：把新玩法的合法動作類型變成可以送出的動作，給各個模糊測試用。
 * 不會被遊戲本身 import。
 */

import { calmChoice, canCalm } from "./chatStats.ts";
import { canShopNow, hasReplyQuota, pendingDayEvent } from "./game.ts";
import type { GameAction, RunState } from "./game.ts";
import { PROFILE_BIOS, PROFILE_PHOTOS, SHOP_ITEMS, canBuy, canUsePhoto } from "./profile.ts";
import { pick } from "./rng.ts";
import type { Rng } from "./rng.ts";
import { STORY_BY_ID } from "./stories/index.ts";
import { isChatReady, isFinal } from "./story.ts";
import type { ReplyStep } from "./storyTypes.ts";

/** buy、editProfile、dayEvent、超級喜歡、賢者模式；其他類型回傳 null，交給原本的測試處理 */
export function newGameplayAction(type: GameAction["type"], run: RunState, rng: Rng): GameAction | null {
  switch (type) {
    case "buy": {
      const items = SHOP_ITEMS.filter(
        (i) => canShopNow(run, i.id) && canBuy(i.id, run.grooming, run.dayIndex) && run.money >= i.price
      );
      return { type, item: pick(rng, items).id };
    }
    case "editProfile": {
      // 跟現在一樣不算動作，只挑不一樣的組合
      const combos = PROFILE_PHOTOS.filter((p) => canUsePhoto(p.id, run.grooming))
        .flatMap((p) => PROFILE_BIOS.map((b) => ({ photo: p.id, bio: b.id })))
        .filter((c) => c.photo !== run.profile.photo || c.bio !== run.profile.bio);
      return { type, ...pick(rng, combos) };
    }
    case "dayEvent": {
      const event = pendingDayEvent(run);
      const choices = (event?.choices ?? [])
        .map((c, i) => ({ c, i }))
        .filter(({ c }) => run.money + (c.money ?? 0) >= 0);
      return { type, choice: pick(rng, choices).i };
    }
    case "swipe":
      return { type, dir: rng() < 0.45 ? "left" : rng() < 0.9 || run.money < 99 ? "right" : "super" };
    case "reply": {
      const stepOf = (c: (typeof run.chats)[number]) => STORY_BY_ID[c.storyId]?.steps[c.stepIndex];
      const ready = run.chats.filter((c) => {
        const step = stepOf(c);
        return !c.closed && step && !isFinal(step) && isChatReady(c, run.dayIndex, run.phase) && hasReplyQuota(run, c);
      });
      const calmChat = run.nightHobby.calm ? ready.find((c) => canCalm(stepOf(c) as ReplyStep)) : undefined;
      if (calmChat && rng() < 0.5) {
        return { type, chatId: calmChat.id, choice: calmChoice(stepOf(calmChat) as ReplyStep), calm: true };
      }
      const chat = pick(rng, ready);
      const step = stepOf(chat) as ReplyStep;
      // 錢不夠的抉擇（1h2s）按鈕是停用的，不會被按到
      const choices = step.replies
        .map((_, i) => i)
        .filter((i) => step.decision?.choice !== i || run.money >= step.decision.cost);
      return { type, chatId: chat.id, choice: pick(rng, choices) };
    }
    default:
      return null;
  }
}
