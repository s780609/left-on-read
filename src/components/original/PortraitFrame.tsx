"use client";

import type { ReactNode } from "react";

const KEYFRAMES = `
.lor-frame * { scrollbar-width: thin; scrollbar-color: #55587a #14132a; }
@keyframes lor-toast { 0% { transform: translateY(8px); opacity: 0; } 8% { transform: translateY(0); opacity: 1; } 85% { opacity: 1; } 100% { opacity: 0; } }
@keyframes lor-stamp { 0% { transform: rotate(-8deg) scale(2.2); opacity: 0; } 60% { transform: rotate(-8deg) scale(0.92); opacity: 1; } 100% { transform: rotate(-8deg) scale(1); opacity: 1; } }
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
