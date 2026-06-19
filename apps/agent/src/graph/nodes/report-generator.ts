import type { InterviewStateType, PhaseFeedback } from "../state";
import { logger } from "../../utils/logger";

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

const PHASE_LABEL: Record<string, string> = {
  requirements: "Requirements Gathering",
  design: "High-Level Design",
  deep_dive: "Deep Dive",
  scale: "Scale & Tradeoffs",
};

const CATEGORY_LABEL: Record<string, string> = {
  requirementsGathering: "Requirements Gathering",
  apiDesign: "API Design",
  dataModeling: "Data Modeling",
  systemComponents: "System Components",
  scalability: "Scalability",
  tradeoffs: "Tradeoffs",
  communication: "Communication",
};

function scoreBar(score: number, max = 5): string {
  const filled = Math.round(score);
  return "█".repeat(filled) + "░".repeat(max - filled) + ` ${score}/${max}`;
}

function formatPhaseFeedback(fb: PhaseFeedback): string {
  const label = PHASE_LABEL[fb.phase] ?? fb.phase;
  const lines: string[] = [];

  lines.push(`### ${label} — ${fb.score}/5`);

  if (fb.strengths.length > 0) {
    lines.push("\n**Strengths**");
    fb.strengths.forEach((s) => lines.push(`- ${s}`));
  }

  if (fb.gaps.length > 0) {
    lines.push("\n**Gaps**");
    fb.gaps.forEach((g) => lines.push(`- ${g}`));
  }

  if (fb.specificQuotes.length > 0) {
    lines.push("\n**Evidence from transcript**");
    fb.specificQuotes.forEach((q) => lines.push(`> "${q}"`));
  }

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────
// Report generator node
// ─────────────────────────────────────────────────────────

/**
 * **Report generator node**
 *
 * Pure formatting — no LLM call. Takes `scores` and `phaseFeedback`
 * from the judge node and produces a human-readable markdown report.
 *
 * @param state - Full interview state after judge has run
 * @returns Partial state update with `reportMarkdown`
 */
export async function reportGeneratorNode(
  state: InterviewStateType,
): Promise<Partial<InterviewStateType>> {
  const { scores, phaseFeedback, question, targetRole, targetCompany } = state;

  const log = logger.child({ node: "report_generator" });

  if (!scores || !question) {
    log.error("Cannot generate report — missing scores or question", {
      hasScores: !!scores,
      hasQuestion: !!question,
    });
    throw new Error(
      "reportGeneratorNode: scores and question must be set before this node runs",
    );
  }

  const lines: string[] = [];

  // ── Header ──
  lines.push(`# Interview Report`);
  lines.push(
    `\n**Question**: ${question.title}  \n**Role**: ${targetRole} at ${targetCompany}  \n**Difficulty**: ${question.difficulty}`,
  );

  // ── Overall score ──
  lines.push(`\n---\n`);
  lines.push(`## Overall Score: ${scores.overall}/100`);
  lines.push(`**Level Assessment**: ${scores.levelAssessment}`);
  lines.push(`\n**Role Readiness**: ${scores.roleReadiness}`);

  // ── Rubric breakdown ──
  lines.push(`\n---\n`);
  lines.push(`## Rubric Breakdown`);
  lines.push("```");
  Object.entries(CATEGORY_LABEL).forEach(([key, label]) => {
    const score = scores[key as keyof typeof scores] as number;
    if (typeof score === "number") {
      lines.push(`${label.padEnd(26)} ${scoreBar(score)}`);
    }
  });
  lines.push("```");

  // ── Gap analysis ──
  lines.push(`\n---\n`);
  lines.push(`## Gap Analysis`);
  lines.push(scores.gapAnalysis);

  // ── Resume advice ──
  lines.push(`\n---\n`);
  lines.push(`## Resume Advice`);
  lines.push(scores.resumeAdvice);

  // ── Per-phase feedback ──
  lines.push(`\n---\n`);
  lines.push(`## Phase-by-Phase Feedback`);
  if (phaseFeedback && phaseFeedback.length > 0) {
    phaseFeedback.forEach((fb) => {
      lines.push(`\n${formatPhaseFeedback(fb)}`);
    });
  } else {
    lines.push("_No phase feedback available._");
  }

  // ── Why this question ──
  lines.push(`\n---\n`);
  lines.push(`## Why This Question Was Chosen`);
  lines.push(question.whyThisQuestion);

  const reportMarkdown = lines.join("\n");

  log.info("Report generated", {
    previewChars: 500,
    totalChars: reportMarkdown.length,
    questionTitle: question.title,
  });

  return { reportMarkdown };
}
