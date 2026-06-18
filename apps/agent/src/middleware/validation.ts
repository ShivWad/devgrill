import type { InterviewStateType } from "../graph/state";

const MAX_RESUME_CHARS = 50_000;
const MAX_JD_CHARS = 20_000;
const MAX_CANDIDATE_ANSWER_CHARS = 10_000;

/**
 * Returns an error message if any of the required fields are missing or empty,
 * otherwise null.
 */
export function requireFields(
  body: Record<string, unknown>,
  fields: string[],
): string | null {
  const missing = fields.filter((f) => !body[f] || body[f] === "");
  return missing.length ? `Missing required fields: ${missing.join(", ")}` : null;
}

/**
 * Returns an error message if any text field exceeds its maximum allowed length,
 * otherwise null.
 */
export function checkLengths(body: Record<string, unknown>): string | null {
  if (
    typeof body.resumeText === "string" &&
    body.resumeText.length > MAX_RESUME_CHARS
  )
    return `resumeText exceeds ${MAX_RESUME_CHARS} character limit`;
  if (
    typeof body.jdText === "string" &&
    body.jdText.length > MAX_JD_CHARS
  )
    return `jdText exceeds ${MAX_JD_CHARS} character limit`;
  if (
    typeof body.candidateAnswer === "string" &&
    body.candidateAnswer.length > MAX_CANDIDATE_ANSWER_CHARS
  )
    return `candidateAnswer exceeds ${MAX_CANDIDATE_ANSWER_CHARS} character limit`;
  return null;
}

/**
 * Shapes raw graph state into the minimal payload the frontend needs per turn.
 * Intentionally excludes raw resume/JD text and internal checklist state.
 */
export function toTurnResponse(state: InterviewStateType) {
  const firstMsg = state.messages[0];
  const openingMessage =
    firstMsg?.role === "interviewer" ? firstMsg.content : null;

  const lastMsg = state.messages.at(-1);
  const interviewerMessage =
    lastMsg?.role === "interviewer" && lastMsg !== firstMsg
      ? lastMsg.content
      : null;

  const base = {
    phase: state.currentPhase,
    turnCount: state.turnCount,
    openingMessage,
    interviewerMessage,
    interviewComplete: state.interviewComplete,
    questionTitle: state.question?.title ?? null,
  };

  if (!state.interviewComplete) return base;

  return {
    ...base,
    scores: state.scores,
    phaseFeedback: state.phaseFeedback,
    reportMarkdown: state.reportMarkdown,
  };
}
