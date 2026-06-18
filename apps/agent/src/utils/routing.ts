import type { InterviewStateType } from "../graph/state";

/**
 * Conditional edge function for the LangGraph state machine.
 *
 * Called by LangGraph after phaseEvaluatorNode runs. Returns the next node
 * name based on whether all interview phases have been completed.
 *
 * @param state Current interview state
 * @returns "judge" when the interview is complete, "interviewer" to stay in loop
 */
export function routeAfterEvaluator(
  state: InterviewStateType,
): "interviewer" | "judge" {
  return state.interviewComplete ? "judge" : "interviewer";
}
