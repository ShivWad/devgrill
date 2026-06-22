import { Annotation } from "@langchain/langgraph";
import type {
  TechPhase,
  TechQuestionConfig,
  TechInterviewStrategy,
  TechRubricScores,
  TechPhaseFeedback,
  Message,
} from "@devgrill/shared";

export type {
  TechPhase,
  TechQuestionConfig,
  TechInterviewStrategy,
  TechRubricScores,
  TechPhaseFeedback,
  Message,
} from "@devgrill/shared";

export const TechInterviewState = Annotation.Root({
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

  question: Annotation<TechQuestionConfig | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  strategy: Annotation<TechInterviewStrategy | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  currentPhase: Annotation<TechPhase>({
    reducer: (_, next) => next,
    default: () => "warm_up",
  }),

  messages: Annotation<Message[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  turnCount: Annotation<number>({
    reducer: (prev, next) => prev + next,
    default: () => 0,
  }),

  phaseTurnCount: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),

  phaseNotes: Annotation<Record<TechPhase, string>>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({
      warm_up: "",
      core_concepts: "",
      design_coding: "",
      deep_dive: "",
    }),
  }),

  scores: Annotation<TechRubricScores | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  phaseFeedback: Annotation<TechPhaseFeedback[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  reportMarkdown: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  interviewComplete: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),
});

export type TechInterviewStateType = typeof TechInterviewState.State;
