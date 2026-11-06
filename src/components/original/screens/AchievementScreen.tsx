"use client";

import { ACHIEVEMENTS, type Achievements } from "@/lib/left-on-read/achievements";
import { calendarOf, formatDate } from "@/lib/left-on-read/calendar";
import { COLOR, PixelButton, TOP_BAR_CLASS } from "../ui";

/** 成就：記的是冠宇這個人的事。沒解鎖的也看得到條件 */
export function AchievementScreen({ achievements, onBack }: { achievements: Achievements; onBack: () => void }) {
  const done = ACHIEVEMENTS.filter((a) => Object.hasOwn(achievements, a.id)).length;
  return (
    <>
      <div className={TOP_BAR_CLASS}>
        <div className="min-w-0 flex-1">
          <div className="text-lg leading-tight text-[#ff9fb4]">成就</div>
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span className="block h-2.5 w-24 border-2 border-black bg-[#191933]">
              <span className="block h-full bg-[#e8b93c]" style={{ width: `${(done / ACHIEVEMENTS.length) * 100}%` }} />
            </span>
            {done} / {ACHIEVEMENTS.length}
          </div>
        </div>
      </div>
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {ACHIEVEMENTS.map((a) => {
          const unlocked = Object.hasOwn(achievements, a.id);
          return (
            <li
              key={a.id}
              className={`border-2 border-black px-2.5 py-2 shadow-[3px_3px_0_#000] ${
                unlocked ? "bg-[#f4efe0] text-[#20203c]" : "bg-[#2a2a4e] text-[#8d92b2]"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span>{unlocked ? a.name : "？？？"}</span>
                {unlocked ? (
                  <span className="shrink-0 text-xs text-[#6a6a84]">{formatDate(calendarOf(achievements[a.id]))}</span>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs">{a.hint}</p>
              {unlocked ? <p className="mt-1 text-sm font-normal leading-snug">{a.quip}</p> : null}
            </li>
          );
        })}
      </ul>
      <div className="shrink-0 border-t-[3px] border-black bg-[#191933] px-4 py-3">
        <PixelButton color={COLOR.blue} onClick={onBack}>
          返回
        </PixelButton>
      </div>
    </>
  );
}
