import type { TechInterviewStateType, TechPhaseFeedback } from "../state";
import { logger } from "../../../utils/logger";

const PHASE_LABEL: Record<string, string> = {
  warm_up: "Warm-Up",
  core_concepts: "Core Concepts",
  design_coding: "Design & Coding",
  deep_dive: "Deep Dive",
};

const CATEGORY_LABEL: Record<string, string> = {
  languageProficiency: "Language Proficiency",
  csFundamentals: "CS Fundamentals",
  problemSolving: "Problem Solving",
  codeQuality: "Code Quality",
  designThinking: "Design Thinking",
  communication: "Communication",
};

function scoreBar(score: number, max = 5): string {
  const filled = Math.round(score);
  return "█".repeat(filled) + "░".repeat(max - filled) + ` ${score}/${max}`;
}

function formatPhaseFeedback(fb: TechPhaseFeedback): string {
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

export async function techReportGeneratorNode(
  state: TechInterviewStateType,
): Promise<Partial<TechInterviewStateType>> {
  const { scores, phaseFeedback, question, targetRole, targetCompany } = state;

  const log = logger.child({ node: "tech_report_generator" });

  if (!scores || !question) {
    log.error("Cannot generate tech report — missing scores or question", {
      hasScores: !!scores,
      hasQuestion: !!question,
    });
    throw new Error("techReportGeneratorNode: scores and question must be set before this node runs");
  }

  const lines: string[] = [];

  lines.push(`# Technical Interview Report`);
  lines.push(`\n**Topic**: ${question.title}  \n**Role**: ${targetRole} at ${targetCompany}  \n**Difficulty**: ${question.difficulty}`);

  lines.push(`\n---\n`);
  lines.push(`## Overall Score: ${scores.overall}/100`);
  lines.push(`**Level Assessment**: ${scores.levelAssessment}`);
  lines.push(`\n**Role Readiness**: ${scores.roleReadiness}`);

  lines.push(`\n---\n`);
  lines.push(`## Rubric Breakdown`);
  lines.push("```");
  Object.entries(CATEGORY_LABEL).forEach(([key, label]) => {
    const score = scores[key as keyof typeof scores] as number;
    if (typeof score === "number") {
      lines.push(`${label.padEnd(24)} ${scoreBar(score)}`);
    }
  });
  lines.push("```");

  lines.push(`\n---\n`);
  lines.push(`## Gap Analysis`);
  lines.push(scores.gapAnalysis);

  lines.push(`\n---\n`);
  lines.push(`## Resume Advice`);
  lines.push(scores.resumeAdvice);

  lines.push(`\n---\n`);
  lines.push(`## Phase-by-Phase Feedback`);
  if (phaseFeedback && phaseFeedback.length > 0) {
    phaseFeedback.forEach((fb) => {
      lines.push(`\n${formatPhaseFeedback(fb)}`);
    });
  } else {
    lines.push("_No phase feedback available._");
  }

  lines.push(`\n---\n`);
  lines.push(`## Why This Question Was Chosen`);
  lines.push(question.whyThisQuestion);

  const reportMarkdown = lines.join("\n");

  log.info("Tech report generated", {
    totalChars: reportMarkdown.length,
    questionTitle: question.title,
  });

  return { reportMarkdown };
}
