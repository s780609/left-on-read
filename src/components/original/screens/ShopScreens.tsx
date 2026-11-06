"use client";

import { useState } from "react";
import type { RunState } from "@/lib/left-on-read/game";
import {
  PROFILE_BIOS,
  PROFILE_PHOTOS,
  SHOP_ITEMS,
  canBuy,
  canUsePhoto,
  exposureStars,
  isGoldActive,
  profileMatchMult,
  type Profile,
  type ShopItemId,
} from "@/lib/left-on-read/profile";
import { drawWeekendScene } from "../pixel/scenes";
import { COLOR, DialogBox, PixelButton, Scene, ScreenBody, StatusBar, TOP_BAR_CLASS } from "../ui";

const money = (n: number) => `NT$${n.toLocaleString("en-US")}`;

function Stars({ count }: { count: number }) {
  return (
    <span aria-label={`曝光指數 ${count} / 5`} className="tracking-widest text-[#ffe08a]">
      {"★".repeat(count)}
      <span className="text-[#55587a]">{"★".repeat(5 - count)}</span>
    </span>
  );
}

function Choice({
  selected,
  disabled,
  title,
  note,
  onClick,
}: {
  selected: boolean;
  disabled?: boolean;
  title: string;
  note: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onClick}
      className={`block w-full border-2 border-black px-2.5 py-1.5 text-left shadow-[2px_2px_0_#000] enabled:cursor-pointer disabled:opacity-45 ${
        selected ? "bg-[#ffb3c4] text-[#2a1a22]" : "bg-[#f4efe0] text-[#20203c]"
      }`}
    >
      <span className="block text-sm">{title}</span>
      <span className="block text-xs font-normal leading-snug opacity-80">{note}</span>
    </button>
  );
}

interface ProfileScreenProps {
  run: RunState;
  /** 剛買完的那句 */
  note: string | null;
  onSave: (profile: Profile) => void;
  onBuyGold: () => void;
  onBack: () => void;
}

/** 晚上：冠宇自己的 Swipy 檔案。照片和自介會改配對率，也會改她們比較容易怎麼對他 */
export function ProfileScreen({ run, note, onSave, onBuyGold, onBack }: ProfileScreenProps) {
  const [draft, setDraft] = useState<Profile>(run.profile);
  const stars = exposureStars(profileMatchMult(draft, run.grooming, run.dayIndex));
  const changed = draft.photo !== run.profile.photo || draft.bio !== run.profile.bio;
  const gold = SHOP_ITEMS.find((i) => i.id === "gold")!;
  const goldActive = isGoldActive(run.grooming, run.dayIndex);

  return (
    <>
      <div className={TOP_BAR_CLASS}>
        <div className="min-w-0 flex-1">
          <div className="text-lg leading-tight text-[#ff9fb4]">我的 Swipy 檔案</div>
          <div className="mt-0.5 text-xs">
            曝光指數 <Stars count={stars} />
          </div>
        </div>
        <span className="shrink-0 text-xs text-[#f2d675]">{money(run.money)}</span>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3">
        {note ? <DialogBox className="text-sm">{note}</DialogBox> : null}
        <section>
          <h2 className="mb-2 border-b-2 border-[#55587a] pb-1 text-sm text-[#f2d675]">主照片</h2>
          <div className="space-y-2">
            {PROFILE_PHOTOS.map((p) => {
              const locked = !canUsePhoto(p.id, run.grooming);
              return (
                <Choice
                  key={p.id}
                  selected={draft.photo === p.id}
                  disabled={locked}
                  title={locked ? `${p.label}（週末去拍）` : p.label}
                  note={p.note}
                  onClick={() => setDraft({ ...draft, photo: p.id })}
                />
              );
            })}
          </div>
        </section>
        <section>
          <h2 className="mb-2 border-b-2 border-[#55587a] pb-1 text-sm text-[#f2d675]">自我介紹</h2>
          <div className="space-y-2">
            {PROFILE_BIOS.map((b) => (
              <Choice
                key={b.id}
                selected={draft.bio === b.id}
                title={`「${b.text}」`}
                note={b.note}
                onClick={() => setDraft({ ...draft, bio: b.id })}
              />
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-2 border-b-2 border-[#55587a] pb-1 text-sm text-[#f2d675]">付費</h2>
          <PixelButton
            color={COLOR.yellow}
            textColor="#20203c"
            disabled={run.money < gold.price}
            onClick={onBuyGold}
            sub={
              goldActive
                ? `還剩 ${run.grooming.goldUntil - run.dayIndex} 天｜再買延長 ${gold.desc.split("，")[0]}`
                : run.money < gold.price
                  ? "等發薪"
                  : `${money(gold.price)}｜${gold.desc}`
            }
          >
            {goldActive ? "續訂 Swipy Gold" : "升級 Swipy Gold"}
          </PixelButton>
          <p className="mt-2 text-xs leading-relaxed text-[#a9abc9]">
            滑卡時還可以按 ★ 送出超級喜歡，一次 NT$99。
          </p>
        </section>
      </div>
      <div className="flex shrink-0 flex-col gap-2.5 border-t-[3px] border-black bg-[#191933] px-4 py-3">
        {changed ? (
          <PixelButton color={COLOR.pink} onClick={() => onSave(draft)}>
            儲存檔案
          </PixelButton>
        ) : null}
        <PixelButton color={COLOR.blue} onClick={onBack}>
          {changed ? "算了，不改" : "返回"}
        </PixelButton>
      </div>
    </>
  );
}

interface ShopScreenProps {
  run: RunState;
  note: string | null;
  onBuy: (item: ShopItemId) => void;
  onMenu: () => void;
  onBack: () => void;
}

/** 週末白天出門打理自己 */
export function ShopScreen({ run, note, onBuy, onMenu, onBack }: ShopScreenProps) {
  const items = SHOP_ITEMS.filter((i) => i.where === "weekend");
  return (
    <>
      <StatusBar run={run} onMenu={onMenu} />
      <Scene draw={drawWeekendScene} label="週末出門" />
      <ScreenBody
        actions={
          <>
            {items.map((item) => {
              const owned = !canBuy(item.id, run.grooming, run.dayIndex);
              const broke = run.money < item.price;
              const hairDaysLeft = run.grooming.haircutUntil - run.dayIndex;
              return (
                <PixelButton
                  key={item.id}
                  color={COLOR.green}
                  disabled={owned || broke}
                  onClick={() => onBuy(item.id)}
                  sub={
                    owned
                      ? item.id === "haircut"
                        ? `髮型還很新，${hairDaysLeft} 天後再來剪`
                        : "已經有了"
                      : broke
                        ? "等發薪"
                        : `${money(item.price)}｜${item.desc}`
                  }
                >
                  {item.name}
                </PixelButton>
              );
            })}
            <PixelButton color={COLOR.blue} onClick={onBack}>
              回家
            </PixelButton>
          </>
        }
      >
        <DialogBox>
          {note ?? "難得的週末。我決定出門，讓自己看起來像一個有在過日子的人。"}
        </DialogBox>
      </ScreenBody>
    </>
  );
}
