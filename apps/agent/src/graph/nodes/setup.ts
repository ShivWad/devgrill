import { buildChecklist, emptyPhaseNotes } from "../../utils/checklist";
import { stripThinkTags } from "../../utils/text";
import { interviewerModel } from "../../models";
import { logger } from "../../utils/logger";
import type { InterviewStateType, Message, Phase, QuestionConfig } from "../state";



// ─────────────────────────────────────────────────────────
// Generate the opening message
// ─────────────────────────────────────────────────────────


/**
 * Opening prompt of interviewer. Prompt for asking the starting question.
 * @param question 
 * @returns 
 */
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
(YOU ARE THE INTERVIWER, not the candidate. This is wrong because it's written as the CANDIDATE's answer, not the
INTERVIEWER's prompt.)

Respond with ONLY the message you would say out loud to the candidate —
no quotation marks, no markdown, no labels like "Interviewer:", no <think>
tags, no commentary.`;
};



// ─────────────────────────────────────────────────────────
// setup node
// ─────────────────────────────────────────────────────────
//


/**
 * **Setup Node**
 * Runs once, immediately after question_generator. Expects
 * state.question and state.strategy to already be populated.
 * Builds the coverage checklist, resets phase notes, and produces
 * the interviewer's opening message.
 * @param state 
 * @returns 
 */
export const setupNode = async (
  state: InterviewStateType,
): Promise<Partial<InterviewStateType>> => {
  const { question } = state;
  const log = logger.child({ node: "setup" });

  if (!question) {
    log.error("Setup node called before question was generated");
    throw new Error("setupNode: state.question is null — question_generator must run first");
  }

  log.info("Setting up interview session", { questionTitle: question.title, difficulty: question.difficulty });

  const checklist = buildChecklist(question);

  let openingContent: string;
  try {
    const openingPrompt = buildOpeningPrompt(question);
    const openingRes = await interviewerModel.invoke(openingPrompt);
    openingContent = stripThinkTags(openingRes.content as string).replace(/^["']|["']$/g, "");
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    log.error("Failed to generate opening message", { err: error.message, stack: error.stack });
    throw error;
  }

  const openingMessage: Message = {
    role: "interviewer",
    content: openingContent,
    phase: "requirements",
    timestamp: Date.now(),
  };

  log.info("Setup complete — opening message generated");

  return {
    currentPhase: "requirements",
    coverageChecklist: checklist,
    phaseNotes: emptyPhaseNotes(),
    messages: [openingMessage],
    turnCount: 0,
    phaseTurnCount: 0,
  };
};