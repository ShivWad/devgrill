import { Annotation } from "@langchain/langgraph";
import type {
  Phase,
  Message,
  QuestionConfig,
  InterviewStrategy,
  RubricScores,
  PhaseFeedback,
} from "@devgrill/shared";

export type {
  Phase,
  PhaseAction,
  Message,
  QuestionConfig,
  InterviewStrategy,
  RubricScores,
  PhaseFeedback,
} from "@devgrill/shared";

// ─────────────────────────────────────────────────────────
// Graph state
// ─────────────────────────────────────────────────────────
//
// Reducer cheat sheet:
//   - "replace"  -> (_, next) => next            last write wins
//   - "append"   -> (prev, next) => [...prev, ...next]
//   - "merge"    -> (prev, next) => ({ ...prev, ...next })
//   - "sum"      -> (prev, next) => prev + next

export const InterviewState = Annotation.Root({
  // ── Raw inputs — set once at graph invocation, never mutated ──
  resumeText: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  jdText: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  targetCompany: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  targetRole: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),

  // ── Generated once by question_generator, then read-only ──
  question: Annotation<QuestionConfig | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  strategy: Annotation<InterviewStrategy | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  // ── Interview progress — mutated every turn ──
  currentPhase: Annotation<Phase>({
    reducer: (_, next) => next,
    default: () => "requirements",
  }),

  messages: Annotation<Message[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  // Total turns across the whole interview
  turnCount: Annotation<number>({
    reducer: (prev, next) => prev + next,
    default: () => 0,
  }),

  // Turns within the current phase. Reset to 0 whenever the phase advances —
  // do this explicitly by returning { phaseTurnCount: 0 } from the node
  // that advances the phase (the reducer here is "replace", not "sum").
  phaseTurnCount: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),

  // ── Coverage tracking ──
  // Keys are slugs like "req:asked_about_scale", "design:proposed_priority_queue".
  // Built once in setup from QuestionConfig, then flipped to `true` by the
  // phase_evaluator as topics get covered.
  coverageChecklist: Annotation<Record<string, boolean>>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({}),
  }),

  // Free-text running notes per phase — short summaries the judge can use
  // without re-reading the full transcript for context.
  phaseNotes: Annotation<Record<Phase, string>>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({
      requirements: "",
      design: "",
      deep_dive: "",
      scale: "",
    }),
  }),

  // ── Final outputs — populated by judge / report_generator ──
  scores: Annotation<RubricScores | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  phaseFeedback: Annotation<PhaseFeedback[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  reportMarkdown: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),


  // ── Interview completion flag — set by phase_evaluator when scale phase ends ──
  // The conditional edge routeAfterEvaluator reads this to decide
  // whether to loop back to interviewer or route to judge.
  interviewComplete: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  })
});

// Convenience type — every node function should be typed as:
//   (state: InterviewStateType) => Promise<Partial<InterviewStateType>>
export type InterviewStateType = typeof InterviewState.State;
