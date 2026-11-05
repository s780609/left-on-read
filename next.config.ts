import { randomUUID } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import withSerwistInit from "@serwist/next";

/** 掃描 src/app 底下所有頁面的路徑（略過動態路由，route group 不算進網址） */
function appRoutes(dir = "src/app", base = ""): string[] {
  const routes = existsSync(join(dir, "page.tsx")) ? [base || "/"] : [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith("[") || entry.name.startsWith("_")) continue;
    const segment = entry.name.startsWith("(") ? "" : `/${entry.name}`;
    routes.push(...appRoutes(join(dir, entry.name), base + segment));
  }
  return routes;
}

/** 每次 build 換一個版本號，頁面更新後 Service Worker 會重新下載 */
const pageRevision = randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  register: true,
  reloadOnOnline: true,
  // 安裝時就預先快取所有遊戲頁面，飛機上等沒網路的地方，沒打開過的遊戲也能玩。
  // 用追加的方式：若改傳 additionalPrecacheEntries，Serwist 就不會再快取 public/ 底下的音效與圖示。
  manifestTransforms: [
    (entries) => ({
      manifest: [
        ...entries,
        ...appRoutes().map((url) => ({ url, revision: pageRevision, size: 0 })),
      ],
      warnings: [],
    }),
  ],
});

export default withSerwist({
  /* config options here */
});
