import { InterviewStateType, Phase } from "../state";
import { logger } from "../../utils/logger";

const PHASE_ORDER: Phase[] = ["requirements", "design", "deep_dive", "scale"];

const MAX_TURNS: Record<Phase, number> = {
  requirements: 5,
  design: 6,
  deep_dive: 5,
  scale: 4,
};

/**
 * Phase evaluator node — pure synchronous logic, no LLM
 * Runs after every candidate turn. Decides:
 * - stay:    increment phaseTurnCount, stay in current phase
 * - advance: move to next phase, reset phaseTurnCount to 0
 * - end:     set interviewComplete = true (conditional edge routes to judge)
 * @param state
 * @returns
 */
export function phaseEvaluatorNode(
  state: InterviewStateType,
): Partial<InterviewStateType> {
  const { currentPhase, phaseTurnCount } = state;
  const newCount = phaseTurnCount + 1;

  // TODO: LLM-based coverage checker

  const log = logger.child({ node: "phase_evaluator", phase: currentPhase });
  log.debug("Evaluating phase transition", { phaseTurnCount, newCount, max: MAX_TURNS[currentPhase] });

  if (newCount >= MAX_TURNS[currentPhase]) {
    if (currentPhase === "scale") {
      log.info("Interview complete — scale phase finished");
      return { phaseTurnCount: newCount, interviewComplete: true };
    }

    const nextPhase = PHASE_ORDER[PHASE_ORDER.indexOf(currentPhase) + 1];
    log.info("Advancing to next phase", { nextPhase });
    return { currentPhase: nextPhase, phaseTurnCount: 0 };
  }

  log.debug("Staying in current phase");
  return { phaseTurnCount: newCount };
}
