import type { TechInterviewStateType, TechPhase } from "../state";
import { logger } from "../../../utils/logger";

const PHASE_ORDER: TechPhase[] = ["warm_up", "core_concepts", "design_coding", "deep_dive"];

const MAX_TURNS: Record<TechPhase, number> = {
  warm_up: 3,
  core_concepts: 5,
  design_coding: 5,
  deep_dive: 4,
};

export function techPhaseEvaluatorNode(
  state: TechInterviewStateType,
): Partial<TechInterviewStateType> {
  const { currentPhase, phaseTurnCount } = state;
  const newCount = phaseTurnCount + 1;

  const log = logger.child({ node: "tech_phase_evaluator", phase: currentPhase });
  log.debug("Evaluating tech phase transition", { phaseTurnCount, newCount, max: MAX_TURNS[currentPhase] });

  if (newCount >= MAX_TURNS[currentPhase]) {
    if (currentPhase === "deep_dive") {
      log.info("Technical interview complete — deep_dive phase finished");
      return { phaseTurnCount: newCount, interviewComplete: true };
    }

    const nextPhase = PHASE_ORDER[PHASE_ORDER.indexOf(currentPhase) + 1];
    log.info("Advancing to next tech phase", { nextPhase });
    return { currentPhase: nextPhase, phaseTurnCount: 0 };
  }

  log.debug("Staying in current tech phase");
  return { phaseTurnCount: newCount };
}
