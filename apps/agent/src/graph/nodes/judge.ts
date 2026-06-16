import { extractJson, invokeWithMetrics, stripThinkTags } from "../../../utils";
import { interviewerModel, judgeModel, reasoningModel } from "../../models";
import type {
  InterviewStateType,
  Message,
  Phase,
  PhaseFeedback,
  RubricScores,
} from "../state";

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

/**
 * Formats the full message array into a readable transcript string,
 * prefixed with the phase each message belongs to.
 */
function formatTranscript(messages: Message[]): string {
  return messages
    .map((m) =>
      m.role === "interviewer"
        ? `[${m.phase.toUpperCase()}] Interviewer: ${m.content}`
        : `[${m.phase.toUpperCase()}] Candidate: ${m.content}`
    )
    .join("\n\n");
}

/**
 * Filters the message array to only messages belonging to the given phase.
 */
function getPhaseMessages(messages: Message[], phase: Phase): Message[] {
  return messages.filter((m) => m.phase === phase);
}

/** Rubric calibration strings — what "3/5" means per difficulty level. */
const RUBRIC_CALIBRATION: Record<string, string> = {
  mid: `
A score of 3 means "meets expectations for a mid-level engineer."
A score of 5 means "exceptional — would impress at senior level."
A score of 1-2 means "below mid-level bar."
Mid-level candidates are expected to ask basic clarifying questions,
propose a reasonable architecture with common components, and discuss
one or two tradeoffs when prompted.`,

  senior: `
A score of 3 means "meets expectations for a senior engineer."
A score of 5 means "exceptional — would impress at staff level."
A score of 1-2 means "below senior bar."
Senior candidates are expected to proactively scope the problem,
propose a complete architecture with clear component boundaries,
discuss failure modes unprompted, and estimate at scale.`,

  staff: `
A score of 3 means "meets expectations for a staff engineer."
A score of 5 means "exceptional — principal/distinguished level."
A score of 1-2 means "below staff bar."
Staff candidates are expected to drive scoping, identify what NOT to
build, consider operational and team concerns, and reason about
multi-dimensional tradeoffs.`,
};

// ─────────────────────────────────────────────────────────
// Prompt
// ─────────────────────────────────────────────────────────

/**
 * Builds the full scoring prompt for the judge node.
 * Includes question config, candidate context, rubric calibration,
 * full transcript, and structured JSON output instructions.
 */
function buildJudgePrompt(state: InterviewStateType): string {
  const { question, strategy, targetRole, targetCompany, messages } = state;

  if (!question || !strategy) {
    throw new Error("judgeNode: state.question/strategy must be set");
  }

  const calibration =
    RUBRIC_CALIBRATION[question.difficulty] ?? RUBRIC_CALIBRATION.senior;

  const transcript = formatTranscript(messages);

  // Per-phase message summaries for context
  const reqMessages = getPhaseMessages(messages, "requirements");
  const designMessages = getPhaseMessages(messages, "design");
  const deepMessages = getPhaseMessages(messages, "deep_dive");
  const scaleMessages = getPhaseMessages(messages, "scale");

  return `You are scoring a system design interview for a ${targetRole} position at ${targetCompany}.

═══════════════════════════════════════
QUESTION
═══════════════════════════════════════
Title: ${question.title}
Description: ${question.description}
Difficulty: ${question.difficulty}
Why this question: ${question.whyThisQuestion}

Expected clarifications (requirements phase):
${question.expectedClarifications.map((c, i) => `  ${i + 1}. ${c}`).join("\n")}

Key components (design phase):
${question.keyComponents.map((c, i) => `  ${i + 1}. ${c}`).join("\n")}

Common pitfalls:
${question.commonPitfalls.map((c, i) => `  ${i + 1}. ${c}`).join("\n")}

Deep dive targets:
${question.deepDiveTargets.map((c, i) => `  ${i + 1}. ${c}`).join("\n")}

═══════════════════════════════════════
CANDIDATE CONTEXT
═══════════════════════════════════════
Resume strengths: ${strategy.resumeStrengths.join("; ")}
Resume gaps: ${strategy.resumeGaps.join("; ")}
Probing strategy used: ${strategy.probingStrategy}

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
Score this interview across 7 rubric categories (0-5 each) and provide
per-phase feedback. For every score, cite a SPECIFIC quote from the
transcript as evidence. Be honest — do not inflate scores. A 3 means
"solid, meets the bar for ${targetRole}." A 5 is rare and exceptional.

RUBRIC CATEGORIES:
1. requirementsGathering — Did the candidate ask the right clarifying questions?
   Did they cover scale, SLA, compliance, integration constraints?
2. apiDesign — Did they design clean service interfaces, API contracts,
   data flows?
3. dataModeling — Did they address data storage, schemas, consistency,
   migrations?
4. systemComponents — Did they identify the right building blocks and explain
   how they interact?
5. scalability — Did they reason about load, pod counts, bottlenecks,
   auto-scaling strategy?
6. tradeoffs — Did they discuss WHY they chose specific technologies over
   alternatives? Did they acknowledge limitations?
7. communication — Were explanations clear, structured, and appropriately
   concise?

PHASE TURN COUNTS:
- requirements: ${reqMessages.length} messages
- design: ${designMessages.length} messages
- deep_dive: ${deepMessages.length} messages
- scale: ${scaleMessages.length} messages

OUTPUT FORMAT:
Respond with ONLY valid JSON, no markdown fences, no commentary, no
<think> tags. Match this shape exactly:

{
  "scores": {
    "requirementsGathering": number (0-5),
    "apiDesign": number (0-5),
    "dataModeling": number (0-5),
    "systemComponents": number (0-5),
    "scalability": number (0-5),
    "tradeoffs": number (0-5),
    "communication": number (0-5),
    "overall": number (0-100, weighted average — weight scalability and
               systemComponents most heavily for a deployment architecture
               question),
    "levelAssessment": string (e.g. "Meets senior bar", "Between mid and
                       senior", "Exceeds senior bar — approaches staff level"),
    "roleReadiness": string (1-2 sentences: is this candidate ready for
                    ${targetRole} at ${targetCompany} based on THIS interview?),
    "gapAnalysis": string (2-3 sentences: concrete skills to work on —
                  NOT "improve system design" but specific gaps with examples
                  from the transcript),
    "resumeAdvice": string (1-2 sentences: how should they reframe their
                   experience for this role based on what they demonstrated?)
  },
  "phaseFeedback": [
    {
      "phase": "requirements",
      "score": number (0-5),
      "strengths": string[] (2-3 specific things done well, with transcript evidence),
      "gaps": string[] (1-2 things missed or done poorly),
      "specificQuotes": string[] (1-2 short quotes from the transcript as evidence)
    },
    {
      "phase": "design",
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
    },
    {
      "phase": "scale",
      "score": number (0-5),
      "strengths": string[],
      "gaps": string[],
      "specificQuotes": string[]
    }
  ]
}`;
}

// ─────────────────────────────────────────────────────────
// Judge node
// ─────────────────────────────────────────────────────────

interface JudgeOutput {
  scores: RubricScores;
  phaseFeedback: PhaseFeedback[];
}

/**
 * **Judge node**
 *
 * Runs once after all interview phases complete. Receives the full
 * transcript + question config + strategy and produces structured
 * `RubricScores` and per-phase `PhaseFeedback[]`.
 *
 * Uses `reasoningModel` (V4-Pro) for scoring consistency.
 * Single-stage call — no two-stage split needed since this is
 * evaluation, not invention.
 *
 * @param state - Full interview state after all phases complete
 * @returns Partial state update with `scores` and `phaseFeedback`
 */
export async function judgeNode(
  state: InterviewStateType,
): Promise<Partial<InterviewStateType>> {
  const prompt = buildJudgePrompt(state);

  const { result } = await invokeWithMetrics("judge", judgeModel, prompt);
  const raw = stripThinkTags(result.content as string);

  let parsed: JudgeOutput;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch (err) {
    console.error("JUDGE RAW OUTPUT (failed to parse):");
    console.error(raw);
    throw new Error(`judgeNode: failed to parse JSON — ${err}`);
  }

  if (!parsed.scores || !parsed.phaseFeedback) {
    console.error("JUDGE RAW OUTPUT (missing scores/phaseFeedback):");
    console.error(raw);
    throw new Error("judgeNode: response missing 'scores' or 'phaseFeedback'");
  }

  console.log("\n=== JUDGE SCORES ===");
  console.table(
    Object.entries(parsed.scores)
      .filter(([, v]) => typeof v === "number")
      .map(([k, v]) => ({ category: k, score: v })),
  );
  console.log(`Overall: ${parsed.scores.overall}/100`);
  console.log(`Level: ${parsed.scores.levelAssessment}`);
  console.log(`Role readiness: ${parsed.scores.roleReadiness}`);

  return {
    scores: parsed.scores,
    phaseFeedback: parsed.phaseFeedback,
  };
}