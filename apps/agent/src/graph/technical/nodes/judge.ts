import { extractJson, stripThinkTags } from "../../../utils/text";
import { invokeWithMetrics } from "../../../utils/metrics";
import { judgeModel } from "../../../models";
import { logger } from "../../../utils/logger";
import type { TechInterviewStateType, TechRubricScores, TechPhaseFeedback, Message } from "../state";

function formatTranscript(messages: Message[]): string {
  return messages
    .map((m) =>
      m.role === "interviewer"
        ? `[${String(m.phase).toUpperCase()}] Interviewer: ${m.content}`
        : `[${String(m.phase).toUpperCase()}] Candidate: ${m.content}`
    )
    .join("\n\n");
}

const RUBRIC_CALIBRATION: Record<string, string> = {
  junior: `A score of 3 means "meets junior bar." A score of 5 means "would impress at mid-level."
Junior candidates are expected to know language basics, write simple working code, and explain their reasoning.`,
  mid: `A score of 3 means "meets mid-level bar." A score of 5 means "exceptional — approaches senior level."
Mid-level candidates are expected to reason about tradeoffs, write clean code, and discuss edge cases unprompted.`,
  senior: `A score of 3 means "meets senior bar." A score of 5 means "exceptional — approaches staff level."
Senior candidates are expected to design elegant solutions, discuss performance and concurrency, and justify design decisions.`,
};

function buildJudgePrompt(state: TechInterviewStateType): string {
  const { question, strategy, targetRole, targetCompany, messages } = state;

  if (!question || !strategy) {
    throw new Error("techJudgeNode: state.question/strategy must be set");
  }

  const calibration = RUBRIC_CALIBRATION[question.difficulty] ?? RUBRIC_CALIBRATION.mid;
  const transcript = formatTranscript(messages);

  return `You are scoring a technical interview for a ${targetRole} position at ${targetCompany}.

═══════════════════════════════════════
QUESTION
═══════════════════════════════════════
Title: ${question.title}
Description: ${question.description}
Difficulty: ${question.difficulty}
Why this question: ${question.whyThisQuestion}

Topics to explore: ${question.topicsToExplore.join(", ")}
Expected knowledge areas: ${question.expectedKnowledgeAreas.join(", ")}
${question.optionalCodingPrompt ? `Coding prompt: ${question.optionalCodingPrompt}` : ""}

═══════════════════════════════════════
CANDIDATE CONTEXT
═══════════════════════════════════════
Tech stack: ${strategy.techStack.join(", ")}
Strengths: ${strategy.resumeStrengths.join("; ")}
Gaps: ${strategy.resumeGaps.join("; ")}
Probing strategy: ${strategy.probingStrategy}

═══════════════════════════════════════
RUBRIC CALIBRATION
═══════════════════════════════════════
${calibration}

═══════════════════════════════════════
FULL TRANSCRIPT (${messages.length} messages)
═══════════════════════════════════════
${transcript}

═══════════════════════════════════════
SCORING TASK
═══════════════════════════════════════
Score across 6 rubric categories (0-5 each) and provide per-phase feedback.
For every score, cite a SPECIFIC quote from the transcript. Be honest — do not inflate.

RUBRIC CATEGORIES:
1. languageProficiency — Depth of knowledge about the language/framework's features and internals.
2. csFundamentals — Correctness on data structures, algorithms, complexity, memory.
3. problemSolving — Approach: does the candidate break down problems logically, handle edge cases?
4. codeQuality — Clarity, naming, structure, and correctness of any code written or described.
5. designThinking — OOP design, class hierarchy, interface design, pattern usage.
6. communication — Clarity of explanation, structure of reasoning, conciseness.

OUTPUT FORMAT:
Respond with ONLY valid JSON, no markdown fences, no commentary, no <think> tags.

{
  "scores": {
    "languageProficiency": number (0-5),
    "csFundamentals": number (0-5),
    "problemSolving": number (0-5),
    "codeQuality": number (0-5),
    "designThinking": number (0-5),
    "communication": number (0-5),
    "overall": number (0-100, weighted — weight problemSolving and csFundamentals most heavily),
    "levelAssessment": string (e.g. "Meets senior bar", "Between mid and senior"),
    "roleReadiness": string (1-2 sentences: is this candidate ready for ${targetRole} at ${targetCompany}?),
    "gapAnalysis": string (2-3 sentences: specific skills to improve with transcript evidence),
    "resumeAdvice": string (1-2 sentences: how to reframe experience for this role)
  },
  "phaseFeedback": [
    {
      "phase": "warm_up",
      "score": number (0-5),
      "strengths": string[],
      "gaps": string[],
      "specificQuotes": string[]
    },
    {
      "phase": "core_concepts",
      "score": number (0-5),
      "strengths": string[],
      "gaps": string[],
      "specificQuotes": string[]
    },
    {
      "phase": "design_coding",
      "score": number (0-5),
      "strengths": string[],
      "gaps": string[],
      "specificQuotes": string[]
    },
    {
      "phase": "deep_dive",
      "score": number (0-5),
      "strengths": string[],
      "gaps": string[],
      "specificQuotes": string[]
    }
  ]
}`;
}

interface TechJudgeOutput {
  scores: TechRubricScores;
  phaseFeedback: TechPhaseFeedback[];
}

export async function techJudgeNode(
  state: TechInterviewStateType,
): Promise<Partial<TechInterviewStateType>> {
  const prompt = buildJudgePrompt(state);

  const { result } = await invokeWithMetrics("tech_judge", judgeModel, prompt);
  const raw = stripThinkTags(result.content as string);

  const log = logger.child({ node: "tech_judge" });

  let parsed: TechJudgeOutput;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch (err) {
    log.error("Failed to parse tech judge JSON output", {
      err: err instanceof Error ? err.message : String(err),
      rawOutput: raw.slice(0, 500),
    });
    throw new Error(`techJudgeNode: failed to parse JSON — ${err}`);
  }

  if (!parsed.scores || !parsed.phaseFeedback) {
    log.error("Tech judge response missing required keys", {
      hasScores: !!parsed.scores,
      hasPhaseFeedback: !!parsed.phaseFeedback,
    });
    throw new Error("techJudgeNode: response missing 'scores' or 'phaseFeedback'");
  }

  log.info("Technical interview scored", {
    overall: parsed.scores.overall,
    levelAssessment: parsed.scores.levelAssessment,
  });

  return {
    scores: parsed.scores,
    phaseFeedback: parsed.phaseFeedback,
  };
}
