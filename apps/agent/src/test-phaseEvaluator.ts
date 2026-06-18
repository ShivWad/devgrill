// src/test-phase-evaluator.ts
import { routeAfterEvaluator } from "../utils";
import { phaseEvaluatorNode } from "./graph/nodes/phase-evaluator";
import type { InterviewStateType } from "./graph/state";

function makeState(phase: string, count: number, complete = false) {
  return { currentPhase: phase, phaseTurnCount: count, interviewComplete: complete } as InterviewStateType;
}

// Stay cases
console.log(phaseEvaluatorNode(makeState("requirements", 2)));  // { phaseTurnCount: 3 }
console.log(phaseEvaluatorNode(makeState("design", 4)));        // { phaseTurnCount: 5 }

// Advance cases
console.log(phaseEvaluatorNode(makeState("requirements", 4)));  // { currentPhase: "design", phaseTurnCount: 0 }
console.log(phaseEvaluatorNode(makeState("design", 5)));        // { currentPhase: "deep_dive", phaseTurnCount: 0 }
console.log(phaseEvaluatorNode(makeState("deep_dive", 4)));     // { currentPhase: "scale", phaseTurnCount: 0 }

// End case
console.log(phaseEvaluatorNode(makeState("scale", 3)));         // { phaseTurnCount: 4, interviewComplete: true }

// Route cases
console.log(routeAfterEvaluator(makeState("scale", 4, false))); // "interviewer"
console.log(routeAfterEvaluator(makeState("scale", 4, true)));  // "judge"