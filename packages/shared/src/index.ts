export type Phase = "requirements" | "design" | "deep_dive" | "scale";

export type TechPhase = "warm_up" | "core_concepts" | "design_coding" | "deep_dive";

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

export interface TechQuestionConfig {
  title: string;
  description: string;
  difficulty: "junior" | "mid" | "senior";
  whyThisQuestion: string;
  topicsToExplore: string[];
  expectedKnowledgeAreas: string[];
  optionalCodingPrompt?: string;
}

export interface TechInterviewStrategy {
  resumeStrengths: string[];
  resumeGaps: string[];
  techStack: string[];
  companyContext: string;
  probingStrategy: string;
}

export interface TechRubricScores {
  languageProficiency: number;  // 0-5
  csFundamentals: number;       // 0-5
  problemSolving: number;       // 0-5
  codeQuality: number;          // 0-5
  designThinking: number;       // 0-5
  communication: number;        // 0-5
  overall: number;              // 0-100 weighted
  levelAssessment: string;
  roleReadiness: string;
  gapAnalysis: string;
  resumeAdvice: string;
}

export interface TechPhaseFeedback {
  phase: TechPhase;
  score: number;
  strengths: string[];
  gaps: string[];
  specificQuotes: string[];
}

export interface ATSResult {
  overallScore: number;
  keywordAnalysis: {
    present: string[];
    missing: string[];
  };
  sectionScores: {
    summary: number;
    experience: number;
    skills: number;
  };
  topGaps: Array<{
    gap: string;
    suggestion: string;
  }>;
  strengths: string[];
}
