"use client";

import type { ReactNode } from "react";

const KEYFRAMES = `
.lor-frame * { scrollbar-width: thin; scrollbar-color: #55587a #14132a; }
@keyframes lor-toast { 0% { transform: translateY(8px); opacity: 0; } 8% { transform: translateY(0); opacity: 1; } 85% { opacity: 1; } 100% { opacity: 0; } }
@keyframes lor-stamp { 0% { transform: rotate(-8deg) scale(2.2); opacity: 0; } 60% { transform: rotate(-8deg) scale(0.92); opacity: 1; } 100% { transform: rotate(-8deg) scale(1); opacity: 1; } }
@keyframes lor-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 50% { transform: translateX(4px); } 75% { transform: translateX(-3px); } }
@keyframes lor-crack-left { to { transform: translate(-10px, 6px) rotate(-7deg); opacity: 0.45; } }
@keyframes lor-crack-right { to { transform: translate(10px, -3px) rotate(6deg); opacity: 0.45; } }
@keyframes lor-appear { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes lor-panel-settle { from { min-height: var(--lor-panel-from, 0); } to { min-height: 0; } }
@keyframes lor-ed-drift { from { transform: scale(1); } to { transform: scale(1.05); } }
@keyframes lor-ed-glow { from { opacity: 0.35; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  @keyframes lor-appear { from { opacity: 0; } to { opacity: 1; } }
  @keyframes lor-panel-settle { from { min-height: 0; } to { min-height: 0; } }
}
`;

/**
 * 直立置中直欄：比 9:16 窄的螢幕吃滿寬高；橫拿或電腦上高度最多 764px，兩旁黑邊。
 */
export default function PortraitFrame({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-0 flex items-center justify-center bg-black">
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      <div
        className="lor-frame relative flex h-dvh w-[min(100vw,430px)] flex-col overflow-hidden bg-[#14132a] font-bold text-[#f6f1de] [@media(min-aspect-ratio:9/16)]:h-[min(100dvh,764px)] [@media(min-aspect-ratio:9/16)]:w-[min(100vw,430px,max(320px,calc(min(100dvh,764px)*9/16)))]"
        style={{
          fontFamily:
            'ui-monospace, "Cascadia Mono", Menlo, Consolas, "Microsoft JhengHei", "PingFang TC", monospace',
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
