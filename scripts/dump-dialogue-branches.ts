/**
 * 把每條失敗劇情（含隱藏）的每一步、每個回覆選項與她的當場回話攤平成路徑。
 * 用法：npx tsx scripts/dump-dialogue-branches.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { HEROINE_ALMOST_STORY, HEROINE_STORY } from "../src/lib/left-on-read/stories/heroine.ts";
import { SPECIAL_STORIES, STORIES } from "../src/lib/left-on-read/stories/index.ts";
import type { FinalStep, ReplyStep, Story } from "../src/lib/left-on-read/storyTypes.ts";

const OUT = "/workspace/left-on-read-shots/dialogue-audit/all-branches.txt";

function isFinal(step: ReplyStep | FinalStep): step is FinalStep {
  return "ending" in step;
}

function incomingLabel(step: ReplyStep | FinalStep): string {
  const i = step.incoming;
  if (i.kind === "message") return `她：${i.text}`;
  if (i.kind === "narration") return `旁白：${i.text}`;
  if (i.kind === "read") return "她：〔已讀〕";
  if (i.kind === "unread") return "她：〔未讀〕";
  if (i.kind === "vanished") return "她：〔消失〕";
  if (i.kind === "none") return "〔冠宇先開口〕";
  return JSON.stringify(i);
}

function dumpStory(story: Story): string[] {
  const lines: string[] = [];
  lines.push(`======== ${story.id}｜${story.dexName}｜${story.category} ========`);
  lines.push(`quip: ${story.dexQuip}`);
  story.steps.forEach((step, si) => {
    lines.push("");
    lines.push(`-- step ${si} --`);
    if ("lead" in step && step.lead?.length) {
      for (const L of step.lead) lines.push(`  lead: ${L}`);
    }
    if ("wait" in step && step.wait) lines.push(`  wait: ${JSON.stringify(step.wait)}`);
    lines.push(`  incoming: ${incomingLabel(step)}`);
    if (isFinal(step)) {
      lines.push(`  ENDING: ${step.ending.narration}`);
      return;
    }
    const rs = step as ReplyStep;
    if (rs.date) lines.push(`  [DATE index=${rs.date.index} cost=${rs.date.cost}]`);
    if (rs.fakeEnding) lines.push(`  [FAKE_ENDING → ${rs.fakeEnding.storyId}] ${rs.fakeEnding.narration}`);
    if (rs.comeback) lines.push(`  [COMEBACK stamp=${rs.comeback.stamp}] ${rs.comeback.aside}`);
    if (rs.decision) lines.push(`  [DECISION choice=${rs.decision.choice} cost=${rs.decision.cost} → ${rs.decision.endingId}]`);
    if (rs.gate) lines.push(`  [GATE minScore=${rs.gate.minScore} fail→${rs.gate.failStoryId}]`);
    rs.replies.forEach((reply, ri) => {
      const her =
        rs.answers?.[ri] !== undefined
          ? rs.answers[ri]
          : rs.answer !== undefined
            ? rs.answer
            : "(無當場回覆，等下一步 incoming)";
      const score = rs.scores?.[ri];
      lines.push(`  [${ri}] 冠宇：${reply}`);
      if (score !== undefined) lines.push(`       score=${score}`);
      lines.push(`       → 她當場：${her}`);
    });
  });
  lines.push("");
  return lines;
}

const all: Story[] = [...STORIES, ...SPECIAL_STORIES, HEROINE_STORY, HEROINE_ALMOST_STORY];
const out: string[] = [];
out.push(`# dialogue branch dump — ${all.length} stories — ${new Date().toISOString()}`);
out.push("");
for (const s of all) out.push(...dumpStory(s));

mkdirSync("/workspace/left-on-read-shots/dialogue-audit", { recursive: true });
writeFileSync(OUT, out.join("\n"), "utf8");
console.log(`wrote ${OUT} (${out.length} lines, ${all.length} stories)`);
