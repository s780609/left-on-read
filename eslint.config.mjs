import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // build 產生的 service worker（已在 .gitignore）
    "public/sw.js",
    "public/swe-worker-*.js",
    // Claude Code Game Studios 範本自己的檔案（agents、skills、hooks、web 範本），不是這個遊戲的程式
    ".claude/**",
    "docs/**",
    "design/**",
    "production/**",
    "prototypes/**",
  ]),
]);

export default eslintConfig;
