import type { Phase, QuestionConfig } from "../graph/state";
import { slugify } from "./text";

/**
 * Builds the interview coverage checklist from a generated question.
 *
 * Checklist items are namespaced by interview phase:
 * - req:*    Requirements gathering topics
 * - design:* High-level design topics
 * - deep:*   Deep-dive discussion topics
 * - scale:*  Generic scalability evaluation topics
 *
 * All entries are initialized to false and updated as the interview progresses.
 *
 * @param question Generated interview question configuration
 * @returns Coverage checklist keyed by phase-prefixed identifiers
 */
export const buildChecklist = (
  question: QuestionConfig,
): Record<string, boolean> => {
  const checklist: Record<string, boolean> = {};

  for (const item of question.expectedClarifications) {
    checklist[`req:${slugify(item)}`] = false;
  }

  for (const item of question.keyComponents) {
    checklist[`design:${slugify(item)}`] = false;
  }

  for (const item of question.deepDiveTargets) {
    checklist[`deep:${slugify(item)}`] = false;
  }

  // Generic scale-phase items — same across all questions
  checklist["scale:identified_bottleneck"] = false;
  checklist["scale:proposed_mitigation"] = false;
  checklist["scale:discussed_tradeoff"] = false;
  checklist["scale:back_of_envelope"] = false;

  return checklist;
};

/**
 * Creates an empty notes object for all interview phases.
 *
 * Notes are accumulated during the interview and used for phase transitions,
 * summaries, and evaluation.
 *
 * @returns Empty phase notes keyed by phase name
 */
export const emptyPhaseNotes = (): Record<Phase, string> => ({
  requirements: "",
  design: "",
  deep_dive: "",
  scale: "",
});
