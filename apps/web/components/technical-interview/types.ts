import type { TechPhase, TechRubricScores, TechPhaseFeedback } from "@devgrill/shared";

export type TechView = "setup" | "loading" | "chat" | "complete" | "trial_gate";

export type TechMsg = { role: "interviewer" | "candidate"; content: string };

export type TechTurnResponse = {
  phase: TechPhase;
  turnCount: number;
  openingMessage: string | null;
  interviewerMessage: string | null;
  interviewComplete: boolean;
  questionTitle?: string | null;
  interviewType?: "technical";
  scores?: TechRubricScores | null;
  phaseFeedback?: TechPhaseFeedback[];
  reportMarkdown?: string | null;
};

export const TECH_PHASES: TechPhase[] = ["warm_up", "core_concepts", "design_coding", "deep_dive"];

export const TECH_PHASE_LABEL: Record<TechPhase, string> = {
  warm_up: "Warm-Up",
  core_concepts: "Core Concepts",
  design_coding: "Design & Coding",
  deep_dive: "Deep Dive",
};

export const TECH_PHASE_FULL: Record<TechPhase, string> = {
  warm_up: "Warm-Up",
  core_concepts: "Core Concepts",
  design_coding: "Design & Coding",
  deep_dive: "Deep Dive",
};

export const TECH_RUBRIC_KEYS: { key: keyof TechRubricScores; label: string }[] = [
  { key: "languageProficiency", label: "Language Proficiency" },
  { key: "csFundamentals", label: "CS Fundamentals" },
  { key: "problemSolving", label: "Problem Solving" },
  { key: "codeQuality", label: "Code Quality" },
  { key: "designThinking", label: "Design Thinking" },
  { key: "communication", label: "Communication" },
];

export const TECH_LOADING_MSGS = [
  "Reading your resume...",
  "Scanning the job description...",
  "Identifying tech stack...",
  "Finding knowledge gaps...",
  "Picking a technical topic...",
  "Tailoring to your experience...",
  "Designing the question...",
  "Calibrating difficulty...",
  "Preparing interview questions...",
  "Building the coding prompt...",
  "Setting up the interviewer...",
  "Almost ready...",
  "One last check...",
  "Let's see what you know...",
];

export const TECH_GLOBAL_STYLES = `
  @keyframes breathe {
    0%, 100% { transform: scale(0.7); opacity: 0; }
    50% { transform: scale(1); opacity: 1; }
  }
  @keyframes breatheCore {
    0%, 100% { box-shadow: 0 0 10px 2px var(--accent-line); }
    50% { box-shadow: 0 0 28px 8px var(--accent-line); }
  }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes dotPulse { 0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
  @media (max-width: 640px) {
    .phase-pip--hidden-mobile { display: none !important; }
    .chat-messages-inner { padding: 16px 12px !important; }
    .chat-input-bar { padding: 10px 12px !important; }
    .setup-role-grid { grid-template-columns: 1fr !important; }
    .chat-nav-right { gap: 4px !important; }
    .question-nav-btn { display: none !important; }
    .tech-editor-panel { display: none !important; }
  }
`;

export function scoreColor(score: number, max = 5): string {
  const pct = score / max;
  if (pct >= 0.8) return "var(--accent)";
  if (pct >= 0.6) return "#eab308";
  return "#ef4444";
}
