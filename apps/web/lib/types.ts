export type Phase = 'requirements' | 'design' | 'deep_dive' | 'scale'

export interface RubricScores {
  requirementsGathering: number
  apiDesign: number
  dataModeling: number
  systemComponents: number
  scalability: number
  tradeoffs: number
  communication: number
  overall: number
  levelAssessment: string
  roleReadiness: string
  gapAnalysis: string
  resumeAdvice: string
}

export interface PhaseFeedback {
  phase: Phase
  score: number
  strengths: string[]
  gaps: string[]
  specificQuotes: string[]
}
