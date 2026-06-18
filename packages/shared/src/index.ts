export type Phase = "requirements" | "design" | "deep_dive" | "scale";

export type PhaseAction = "stay" | "advance" | "end";

export interface Message {
  role: "interviewer" | "candidate";
  content: string;
  phase: Phase;
  timestamp: number;
}

export interface QuestionConfig {
  title: string;
  description: string;
  difficulty: "mid" | "senior" | "staff";
  whyThisQuestion: string;
  expectedClarifications: string[];
  keyComponents: string[];
  commonPitfalls: string[];
  deepDiveTargets: string[];
}

export interface InterviewStrategy {
  resumeStrengths: string[];
  resumeGaps: string[];
  experienceHooks: string[];
  companyContext: string;
  probingStrategy: string;
}

export interface RubricScores {
  requirementsGathering: number; // 0-5
  apiDesign: number;
  dataModeling: number;
  systemComponents: number;
  scalability: number;
  tradeoffs: number;
  communication: number;
  overall: number; // 0-100 weighted
  levelAssessment: string;
  roleReadiness: string;
  gapAnalysis: string;
  resumeAdvice: string;
}

export interface PhaseFeedback {
  phase: Phase;
  score: number;
  strengths: string[];
  gaps: string[];
  specificQuotes: string[];
}
