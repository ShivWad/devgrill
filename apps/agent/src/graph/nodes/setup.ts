import { stripThinkTags } from "../../../utils";
import { interviewerModel } from "../../models";
import type { InterviewStateType, Message, Phase, QuestionConfig } from "../state";

// ─────────────────────────────────────────────────────────
// Slugify — turn a free-text string into a short checklist key
// ─────────────────────────────────────────────────────────

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")   // strip punctuation
    .trim()
    .split(/\s+/)
    .join("_");  
// ─────────────────────────────────────────────────────────
// Build the coverage checklist from the generated question
// ─────────────────────────────────────────────────────────
//
// Keys are namespaced by phase so the phase evaluator can easily check
// "are all req:* keys covered" etc.
//   req:<slug>    <- from expectedClarifications  (requirements phase)
//   design:<slug> <- from keyComponents            (design phase)
//   deep:<slug>   <- from deepDiveTargets          (deep_dive phase)
//   scale:*       <- generic, same for every question (scale phase)

export const buildChecklist = (question: QuestionConfig): Record<string, boolean> => {
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

// ─────────────────────────────────────────────────────────
// Empty phase notes — one entry per phase, filled in as the
// interview progresses
// ─────────────────────────────────────────────────────────

const emptyPhaseNotes = (): Record<Phase, string> => ({
  requirements: "",
  design: "",
  deep_dive: "",
  scale: "",
});

// ─────────────────────────────────────────────────────────
// Generate the opening message
// ─────────────────────────────────────────────────────────

const buildOpeningPrompt = (question: QuestionConfig): string => {
  return `You are a senior engineer about to interview a candidate. You are
SPEAKING DIRECTLY TO THE CANDIDATE, addressing them as "you". You are NOT the
candidate. Do NOT solve the problem, do NOT describe your own approach, and
do NOT use phrases like "I will" or "I'm tasked with" — that is the
CANDIDATE's job, not yours.

PROBLEM TO HAND TO THE CANDIDATE:
${question.description}

TASK:
Rephrase the problem above as something you'd say OUT LOUD to a candidate at
the start of an interview, in 2-3 sentences. Be direct, no pleasantries, no
"great to meet you" small talk. End with a question addressed to the
candidate, such as "Where would you like to start?" or "How would you
approach this?"

EXAMPLE of correct tone (different problem, for format reference only):
"We need a system that can handle notifications across email, SMS, and push
for tens of millions of users, with different priority levels and delivery
guarantees. Where would you like to start?"

EXAMPLE of INCORRECT tone — do not do this:
"I'm tasked with designing a notification system that handles millions of
users. I will start by outlining the architecture..."
(This is wrong because it's written as the CANDIDATE's answer, not the
INTERVIEWER's prompt.)

Respond with ONLY the message you would say out loud to the candidate —
no quotation marks, no markdown, no labels like "Interviewer:", no <think>
tags, no commentary.`;
};



// ─────────────────────────────────────────────────────────
// setup node
// ─────────────────────────────────────────────────────────
//
// Runs once, immediately after question_generator. Expects
// state.question and state.strategy to already be populated.
// Builds the coverage checklist, resets phase notes, and produces
// the interviewer's opening message.

export const setupNode = async (
  state: InterviewStateType,
): Promise<Partial<InterviewStateType>> => {
  const { question } = state;

  if (!question) {
    throw new Error("setupNode: state.question is null — question_generator must run first");
  }

  const checklist = buildChecklist(question);

  const openingPrompt = buildOpeningPrompt(question);
  const openingRes = await interviewerModel.invoke(openingPrompt);
  const openingContent = stripThinkTags(openingRes.content as string).replace(/^["']|["']$/g, "");

  
  const openingMessage: Message = {
    role: "interviewer",
    content: openingContent,
    phase: "requirements",
    timestamp: Date.now(),
  };

  return {
    currentPhase: "requirements",
    coverageChecklist: checklist,
    phaseNotes: emptyPhaseNotes(),
    messages: [openingMessage],
    turnCount: 0,
    phaseTurnCount: 0,
  };
};