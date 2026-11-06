/**
 * localStorage 存檔的 store，給 useSyncExternalStore 用。
 * 伺服器和第一次水合都拿固定常數，避免畫面不一致；瀏覽器禁用儲存空間時只存在記憶體裡。
 * 其他分頁存檔時要跟著更新，不然舊分頁的下一個動作會把已經結束的一局和舊圖鑑寫回去。
 */

import { META_SAVE_KEY, RUN_SAVE_KEY } from "@/lib/left-on-read/constants";
import type { RunState } from "@/lib/left-on-read/game";
import { blankMeta, parseMeta, parseRun, serializeMeta, serializeRun, type MetaState } from "@/lib/left-on-read/save";

export interface SaveState {
  run: RunState | null;
  meta: MetaState;
  ready: boolean;
}

const SERVER_STATE: SaveState = { run: null, meta: blankMeta(), ready: false };

let state: SaveState = SERVER_STATE;
let loaded = false;
const listeners = new Set<() => void>();

function readKey(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeKey(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // 空間不足或被禁用：這次就不存
  }
}

function loadState() {
  loaded = true;
  state = { run: parseRun(readKey(RUN_SAVE_KEY)), meta: parseMeta(readKey(META_SAVE_KEY)), ready: true };
}

/** key 是 null 代表整個儲存空間被清掉 */
function onStorage(event: StorageEvent) {
  if (event.key !== null && event.key !== RUN_SAVE_KEY && event.key !== META_SAVE_KEY) return;
  loadState();
  listeners.forEach((listener) => listener());
}

export function subscribeSave(listener: () => void): () => void {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function getSaveSnapshot(): SaveState {
  if (!loaded) loadState();
  return state;
}

export function getServerSaveSnapshot(): SaveState {
  return SERVER_STATE;
}

export function commitSave(run: RunState | null, meta: MetaState) {
  loaded = true;
  state = { run, meta, ready: true };
  writeKey(RUN_SAVE_KEY, run ? serializeRun(run) : null);
  writeKey(META_SAVE_KEY, serializeMeta(meta));
  listeners.forEach((listener) => listener());
}
