import type { Phase, RubricScores } from "@devgrill/shared";

// ── View states ───────────────────────────────────────────────────────────────

export type View = "setup" | "loading" | "chat" | "complete";

export type Msg = { role: "interviewer" | "candidate"; content: string };

// Shape returned by /api/interview/invoke and /api/interview/resume
export type TurnResponse = {
  phase: Phase;
  turnCount: number;
  openingMessage: string | null;
  interviewerMessage: string | null;
  interviewComplete: boolean;
  questionTitle?: string | null;
  scores?: RubricScores | null;
  phaseFeedback?: import("@devgrill/shared").PhaseFeedback[];
  reportMarkdown?: string | null;
};

// ── Constants ─────────────────────────────────────────────────────────────────

export const PHASES: Phase[] = ["requirements", "design", "deep_dive", "scale"];

export const PHASE_LABEL: Record<Phase, string> = {
  requirements: "Requirements",
  design: "Design",
  deep_dive: "Deep Dive",
  scale: "Scale",
};

export const PHASE_FULL: Record<Phase, string> = {
  requirements: "Requirements Gathering",
  design: "High-Level Design",
  deep_dive: "Deep Dive",
  scale: "Scale & Tradeoffs",
};

export const RUBRIC_KEYS: { key: keyof RubricScores; label: string }[] = [
  { key: "requirementsGathering", label: "Requirements Gathering" },
  { key: "apiDesign", label: "API Design" },
  { key: "dataModeling", label: "Data Modeling" },
  { key: "systemComponents", label: "System Components" },
  { key: "scalability", label: "Scalability" },
  { key: "tradeoffs", label: "Tradeoffs" },
  { key: "communication", label: "Communication" },
];

export const LOADING_MSGS = [
  "Reading your resume...",
  "Scanning the job description...",
  "Finding skill gaps...",
  "Picking the right challenge...",
  "Matching your experience...",
  "Building a realistic scenario...",
  "Designing an interview question...",
  "Tailoring the interviewer...",
  "Looking for weak spots...",
  "Preparing follow-ups...",
  "Setting the difficulty...",
  "Crafting deep-dive questions...",
  "Simulating a real interview...",
  "Calibrating for the target role...",
  "Building your interview plan...",
  "Almost ready...",
  "One last check...",
  "Generating your challenge...",
  "Preparing your interviewer...",
  "Let's see what you've got...",
];

// Global CSS animations shared by all interview views
export const GLOBAL_STYLES = `
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
  }
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns a CSS color string based on a 0–max score. */
export function scoreColor(score: number, max = 5): string {
  const pct = score / max;
  if (pct >= 0.8) return "var(--accent)";
  if (pct >= 0.6) return "#eab308";
  return "#ef4444";
}
