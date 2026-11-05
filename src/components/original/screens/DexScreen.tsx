"use client";

import { calendarOf, formatDate } from "@/lib/left-on-read/calendar";
import { dexProgress, type Dex } from "@/lib/left-on-read/dex";
import { LADYBUG_ENDING_ID } from "@/lib/left-on-read/constants";
import { SPECIAL_STORIES, STORIES } from "@/lib/left-on-read/stories/index";
import type { StoryCategory } from "@/lib/left-on-read/storyTypes";
import { COLOR, PixelButton, TOP_BAR_CLASS } from "../ui";

const CATEGORY: readonly { id: StoryCategory; label: string }[] = [
  { id: "ghost", label: "已讀學程" },
  { id: "fade", label: "斷聯學程" },
  { id: "pitch", label: "業績學程" },
  { id: "quick", label: "秒殺學程" },
];

export function DexScreen({ dex, onBack, onLadybug }: { dex: Dex; onBack: () => void; onLadybug: () => void }) {
  const { collected, total } = dexProgress(dex);
  return (
    <>
      <div className={TOP_BAR_CLASS}>
        <div className="min-w-0 flex-1">
          <div className="text-lg leading-tight text-[#ff9fb4]">失敗圖鑑</div>
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span className="block h-2.5 w-24 border-2 border-black bg-[#191933]">
              <span className="block h-full bg-[#ff6f91]" style={{ width: `${(collected / total) * 100}%` }} />
            </span>
            {collected} / {total}
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {CATEGORY.map(({ id, label }) => (
          <section key={id} className="mb-4">
            <h2 className="mb-2 border-b-2 border-[#55587a] pb-1 text-sm text-[#f2d675]">{label}</h2>
            <ul className="space-y-2">
              {STORIES.filter((s) => s.category === id).map((story) => {
                const entry = Object.hasOwn(dex, story.id) ? dex[story.id] : null;
                return (
                  <li
                    key={story.id}
                    className={`border-2 border-black px-2.5 py-2 shadow-[3px_3px_0_#000] ${
                      entry ? "bg-[#f4efe0] text-[#20203c]" : "bg-[#2a2a4e] text-[#6d7096]"
                    }`}
                  >
                    {entry ? (
                      <>
                        <div className="flex items-baseline justify-between gap-2">
                          <span>{story.dexName}</span>
                          <span className="shrink-0 text-xs">×{entry.count}</span>
                        </div>
                        <p className="mt-0.5 text-sm font-normal leading-snug">{story.dexQuip}</p>
                        <p className="mt-1 text-xs text-[#6a6a84]">首次：{formatDate(calendarOf(entry.firstDayIndex))}</p>
                      </>
                    ) : (
                      <span>？？？　還沒有人這樣對過我</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        <section className="mb-4">
          <h2 className="mb-2 border-b-2 border-[#55587a] pb-1 text-sm text-[#f2d675]">隱藏路線</h2>
          <ul className="space-y-2">
            {SPECIAL_STORIES.filter((s) => Object.hasOwn(dex, s.id)).map((story) => (
              <li key={story.id} className="border-2 border-black bg-[#f4efe0] px-2.5 py-2 text-[#20203c] shadow-[3px_3px_0_#000]">
                <div className="flex items-baseline justify-between gap-2">
                  <span>{story.dexName}</span>
                  <span className="shrink-0 text-xs">×{dex[story.id].count}</span>
                </div>
                <p className="mt-0.5 text-sm font-normal leading-snug">{story.dexQuip}</p>
              </li>
            ))}
            {Object.hasOwn(dex, LADYBUG_ENDING_ID) ? (
              <li>
                <PixelButton color={COLOR.red} onClick={onLadybug} sub="重看這個結局">
                  瓢蟲結局
                </PixelButton>
              </li>
            ) : (
              <li className="border-2 border-black bg-[#2a2a4e] px-2.5 py-2 text-[#6d7096] shadow-[3px_3px_0_#000]">
                ？？？　這裡有一個結局
              </li>
            )}
          </ul>
        </section>
      </div>
      <div className="shrink-0 border-t-[3px] border-black bg-[#191933] px-4 py-3">
        <PixelButton color={COLOR.blue} onClick={onBack}>
          返回
        </PixelButton>
      </div>
    </>
  );
}
