import { test } from "node:test";
import assert from "node:assert/strict";
import {
  INTRO_COMMUTE_TEXT,
  INTRO_MELODY,
  INTRO_SHOTS,
  INTRO_TAGLINE,
  INTRO_TITLE,
  SWIPE_BEATS,
  SWIPE_BEAT_MS,
  INTRO_FADE_MS,
  INTRO_LINES,
  INTRO_SEARCH_QUERY,
  PTT_TITLES,
  SEARCH_BEATS,
  introLineAt,
  easeIn,
  easeInOut,
  easeOut,
  easedRamp,
  introClock,
  introShotAt,
  shotFadeAt,
  swipeBeatAt,
  typewriterCount,
} from "./intro.ts";

const totalMs = () => INTRO_SHOTS.reduce((sum, s) => sum + s.durationMs, 0);
const shot = (id: string) => INTRO_SHOTS.find((s) => s.id === id)!;

test("照分鏡腳本依序播放：下班、回家、提不起勁、孤單、找交友 App、滑卡、片名", () => {
  assert.deepEqual(
    INTRO_SHOTS.map((s) => s.id),
    ["office", "commute", "room", "game", "video", "ptt", "lonely", "search", "swipe", "end"]
  );
  for (const s of INTRO_SHOTS) assert.ok(s.durationMs > 0, `${s.id} 長度 ${s.durationMs}`);
});

test("總長 35～45 秒", () => {
  const total = totalMs();
  assert.ok(total >= 35_000 && total <= 45_000, `總長 ${total}ms`);
});

test("心裡的話：每句都在自己的分鏡裡出現、照時間排、短到一行放得下", () => {
  for (const [id, lines] of Object.entries(INTRO_LINES)) {
    const s = shot(id);
    assert.ok(s, `${id} 不是分鏡`);
    let last = -1;
    for (const line of lines!) {
      assert.ok(line.atMs > last && line.atMs < s.durationMs - 500, `${id}「${line.text}」at ${line.atMs}`);
      assert.ok([...line.text].length <= 16, `${id}「${line.text}」太長`);
      last = line.atMs;
    }
  }
  // 劇情的每一拍都有一句
  for (const id of ["commute", "room", "game", "video", "ptt", "lonely", "search"]) assert.ok(INTRO_LINES[id as "room"]?.length, id);
  assert.ok(INTRO_LINES.lonely!.some((l) => l.text.includes("冷")), "要覺得冷");
});

test("introLineAt：還沒輪到是 null，之後換成最新的一句", () => {
  const room = INTRO_LINES.room!;
  assert.equal(introLineAt("room", room[0].atMs - 1), null);
  assert.deepEqual(introLineAt("room", room[0].atMs), { text: room[0].text, sinceMs: 0 });
  assert.equal(introLineAt("room", room[1].atMs + 10)?.text, room[1].text);
  assert.equal(introLineAt("room", room[1].atMs + 10)?.sinceMs, 10);
  assert.equal(introLineAt("office", 1000), null);
});

test("搜尋那一幕：打完字才出結果，下載完才打開，都在分鏡時間內", () => {
  const b = SEARCH_BEATS;
  assert.ok(b.typedAt <= b.resultsAt && b.resultsAt < b.installAt && b.installAt < b.installedAt && b.installedAt < b.openAt);
  assert.ok(b.openAt + 600 <= shot("search").durationMs);
  assert.ok(INTRO_SEARCH_QUERY.includes("交友"));
  assert.equal(typewriterCount(INTRO_SEARCH_QUERY, b.typedAt - 200, (INTRO_SEARCH_QUERY.length * 1000) / (b.typedAt - 200)), INTRO_SEARCH_QUERY.length);
  // 搜尋接著滑卡，中間不淡黑
  assert.equal(shot("search").continues, true);
});

test("PTT 標題：有好幾條、一行放得下", () => {
  assert.ok(PTT_TITLES.length >= 8);
  for (const title of PTT_TITLES) assert.ok([...title].length <= 20, title);
});

test("腳本指定的文字", () => {
  assert.equal(INTRO_COMMUTE_TEXT, "北漂第 2 年");
  assert.equal(INTRO_TITLE, "已讀不回");
  assert.equal(INTRO_TAGLINE, "每天都在等一個回覆。");
});

test("introClock：17:58 走到 18:00，之後停在 18:00", () => {
  assert.equal(introClock(0), "17:58");
  const seen: string[] = [];
  for (let t = 0; t <= shot("office").durationMs; t += 50) {
    const c = introClock(t);
    if (seen.at(-1) !== c) seen.push(c);
  }
  assert.deepEqual(seen, ["17:58", "17:59", "18:00"]);
  assert.equal(introClock(1e9), "18:00");
});

test("滑卡段落：時間剛好放得下，有左滑也有右滑", () => {
  assert.equal(SWIPE_BEATS.length * SWIPE_BEAT_MS, shot("swipe").durationMs);
  assert.deepEqual(SWIPE_BEATS.slice(0, 3).map((b) => b.dir).filter((d, i, a) => d !== a[i - 1]).slice(0, 2), ["left", "right"]);
  assert.ok(SWIPE_BEATS.some((b) => b.dir === "left") && SWIPE_BEATS.some((b) => b.dir === "right"));
});

test("滑卡段落：表情從無聊到有點期待，再回到空洞，不會倒退", () => {
  const order = ["bored", "hope", "empty"];
  const moods = SWIPE_BEATS.map((b) => b.mood);
  assert.deepEqual([...new Set(moods)], order);
  for (let i = 1; i < moods.length; i++) assert.ok(order.indexOf(moods[i]) >= order.indexOf(moods[i - 1]));
  // 右滑那一下才開始期待
  const firstRight = SWIPE_BEATS.findIndex((b) => b.dir === "right");
  assert.equal(moods[firstRight], "hope");
  assert.equal(moods[firstRight - 1], "bored");
});

test("swipeBeatAt：卡片先停著再飛出去，交界正確，超過時間不會超出範圍", () => {
  assert.deepEqual(swipeBeatAt(0), { index: 0, exit: 0 });
  assert.equal(swipeBeatAt(SWIPE_BEAT_MS).index, 1);
  assert.equal(swipeBeatAt(SWIPE_BEAT_MS).exit, 0);
  const late = swipeBeatAt(SWIPE_BEAT_MS - 1);
  assert.equal(late.index, 0);
  assert.ok(late.exit > 0.9 && late.exit <= 1, `exit ${late.exit}`);
  const end = swipeBeatAt(1e9);
  assert.equal(end.index, SWIPE_BEATS.length - 1);
  assert.equal(end.exit, 1);
});

test("文字不含 Tinder", () => {
  const all = [INTRO_COMMUTE_TEXT, INTRO_TITLE, INTRO_TAGLINE, INTRO_SEARCH_QUERY, ...PTT_TITLES, ...Object.values(INTRO_LINES).flatMap((ls) => ls!.map((l) => l.text))];
  assert.ok(!/tinder/i.test(all.join("")));
});

test("introShotAt：0 毫秒是第一個分鏡", () => {
  assert.deepEqual(introShotAt(0), { index: 0, localMs: 0, done: false });
});

test("introShotAt：分鏡交界落在正確的一側", () => {
  let start = 0;
  INTRO_SHOTS.forEach((shot, i) => {
    assert.deepEqual(introShotAt(start), { index: i, localMs: 0, done: false });
    assert.deepEqual(introShotAt(start + shot.durationMs - 1), {
      index: i,
      localMs: shot.durationMs - 1,
      done: false,
    });
    start += shot.durationMs;
  });
});

test("introShotAt：播完時 done，索引不超出範圍", () => {
  const total = totalMs();
  assert.equal(introShotAt(total - 1).done, false);
  for (const t of [total, total + 1, total * 10]) {
    const r = introShotAt(t);
    assert.equal(r.done, true, `t=${t}`);
    assert.ok(r.index >= 0 && r.index < INTRO_SHOTS.length, `t=${t} index=${r.index}`);
  }
});

test("typewriterCount：從 0 開始依速度增加，不超過字數也不會倒退", () => {
  const text = "一二三四五六七八九十";
  assert.equal(typewriterCount(text, 0, 10), 0);
  assert.equal(typewriterCount(text, 500, 10), 5);
  assert.equal(typewriterCount(text, 200, 5), 1);
  let last = 0;
  for (let t = 0; t <= 5000; t += 137) {
    const n = typewriterCount(text, t, 12);
    assert.ok(Number.isInteger(n) && n >= last && n <= text.length, `t=${t} 字數 ${n}`);
    last = n;
  }
  assert.equal(typewriterCount(text, 1e9, 12), text.length);
});

test("旋律有音符，音高合法，長度為正", () => {
  assert.ok(INTRO_MELODY.length > 0);
  for (const n of INTRO_MELODY) {
    assert.ok(Number.isInteger(n.midi) && n.midi >= 0 && n.midi <= 127, `midi ${n.midi}`);
    assert.ok(n.time >= 0, `time ${n.time}`);
    assert.ok(n.duration > 0, `duration ${n.duration}`);
  }
});

test("音符不超過開場總長，時間遞增（單位是秒，對應 scheduleNote）", () => {
  const totalSec = totalMs() / 1000;
  let last = -Infinity;
  for (const n of INTRO_MELODY) {
    assert.ok(n.time >= last, `時間倒退：${n.time} < ${last}`);
    assert.ok(n.time + n.duration <= totalSec, `音符結束於 ${n.time + n.duration} 秒，超過 ${totalSec} 秒`);
    last = n.time;
  }
  assert.ok(last > 1, "旋律的時間看起來不是以秒為單位");
});

test("緩動：0 到 1 之間、兩端固定、單調不倒退、超出範圍會夾住", () => {
  for (const f of [easeInOut, easeOut, easeIn]) {
    assert.equal(f(0), 0);
    assert.ok(Math.abs(f(1) - 1) < 1e-9);
    assert.equal(f(-3), 0);
    assert.ok(Math.abs(f(7) - 1) < 1e-9);
    let last = 0;
    for (let p = 0; p <= 1.0001; p += 0.01) {
      const v = f(p);
      assert.ok(v >= last - 1e-12 && v <= 1 + 1e-12, `p=${p} v=${v}`);
      last = v;
    }
  }
  assert.ok(Math.abs(easeInOut(0.5) - 0.5) < 1e-9);
  assert.ok(easeInOut(0.1) < 0.1, "開頭要慢");
  assert.ok(easeOut(0.1) > 0.1, "easeOut 開頭快");
  assert.ok(easeIn(0.5) < 0.5, "easeIn 開頭慢");
  assert.equal(easedRamp(100, 200, 400), 0);
  assert.ok(Math.abs(easedRamp(300, 200, 400) - 0.5) < 1e-9);
  assert.ok(Math.abs(easedRamp(500, 200, 400) - 1) < 1e-9);
});

test("shotFadeAt：開頭從全黑淡入，中段不蓋黑，接著演的分鏡之間不淡出", () => {
  assert.equal(shotFadeAt(0, 0), 1);
  assert.equal(shotFadeAt(0, INTRO_FADE_MS), 0);
  assert.equal(shotFadeAt(0, 3000), 0);
  INTRO_SHOTS.forEach((shot, i) => {
    const prev = INTRO_SHOTS[i - 1];
    const end = shotFadeAt(i, shot.durationMs);
    assert.equal(end, shot.continues ? 0 : 1, `${shot.id} 結尾`);
    const start = shotFadeAt(i, 0);
    assert.equal(start, prev?.continues ? 0 : 1, `${shot.id} 開頭`);
    // 淡出過程只會越來越黑，不會忽明忽暗
    let last = 0;
    for (let t = shot.durationMs - INTRO_FADE_MS; t <= shot.durationMs; t += 25) {
      const v = shotFadeAt(i, t);
      assert.ok(v >= last - 1e-12 && v >= 0 && v <= 1, `${shot.id} t=${t} v=${v}`);
      last = v;
    }
  });
  assert.equal(shotFadeAt(99, 0), 0);
});
