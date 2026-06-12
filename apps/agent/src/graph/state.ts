import { Annotation } from "@langchain/langgraph";

// ─────────────────────────────────────────────────────────
// Domain types
// ─────────────────────────────────────────────────────────

export type Phase = "requirements" | "design" | "deep_dive" | "scale";

export type PhaseAction = "stay" | "advance" | "end";

export interface Message {
  role: "interviewer" | "candidate";
  content: string;
  phase: Phase;
  timestamp: number;
}

// Output of the question_generator node
export interface QuestionConfig {
  title: string;                     // "Design a real-time order tracking system"
  description: string;               // Full problem statement read to candidate
  difficulty: "mid" | "senior" | "staff";
  whyThisQuestion: string;           // Gap-analysis rationale shown on /preparing
  expectedClarifications: string[];  // Topics candidate should ask about
  keyComponents: string[];           // Components a good answer includes
  commonPitfalls: string[];          // Mistakes to watch for when scoring
  deepDiveTargets: string[];         // Components worth drilling into
}

// Also produced by question_generator, alongside QuestionConfig
export interface InterviewStrategy {
  resumeStrengths: string[];         // Skills from resume relevant to this question
  resumeGaps: string[];              // Skills the JD wants but resume doesn't show
  experienceHooks: string[];         // Specific resume items the interviewer can reference
  companyContext: string;            // What this company's interviewers tend to value
  probingStrategy: string;           // What the deep-dive phase should focus on
}

// Output of the judge node
export interface RubricScores {
  requirementsGathering: number;     // 0-5
  apiDesign: number;
  dataModeling: number;
  systemComponents: number;
  scalability: number;
  tradeoffs: number;
  communication: number;
  overall: number;                   // 0-100 weighted
  levelAssessment: string;           // e.g. "Meets senior bar"
  roleReadiness: string;             // role-specific readiness summary
  gapAnalysis: string;               // concrete skills to work on
  resumeAdvice: string;              // how to better position experience
}

export interface PhaseFeedback {
  phase: Phase;
  score: number;
  strengths: string[];
  gaps: string[];
  specificQuotes: string[];          // short evidence excerpts from transcript
}

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
});

// Convenience type — every node function should be typed as:
//   (state: InterviewStateType) => Promise<Partial<InterviewStateType>>
export type InterviewStateType = typeof InterviewState.State;