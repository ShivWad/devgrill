import { stripThinkTags } from "../../../utils/text";
import { interviewerModel } from "../../../models";
import { logger } from "../../../utils/logger";
import type { TechInterviewStateType, TechQuestionConfig, Message } from "../state";

const buildOpeningPrompt = (question: TechQuestionConfig): string => {
  return `You are a senior engineer about to conduct a technical interview with a candidate.
You are SPEAKING DIRECTLY TO THE CANDIDATE. You are NOT the candidate.
Do NOT solve the problem yourself, do NOT say "I will" or "I'm going to" — that is the candidate's job.

TOPIC FOR THIS INTERVIEW:
${question.description}

TASK:
Introduce yourself briefly (1 sentence), then present the topic to the candidate in 2-3 sentences.
End with an open question that invites them to start, such as:
"How would you approach this?" or "Where would you like to start?"

Be direct. No small talk, no "great to meet you" filler.

EXAMPLE of correct tone (different topic, for format reference only):
"I'd like to talk about concurrency in Java today. You've worked with Spring Boot — imagine
you need to build a thread-safe cache that multiple request threads will access simultaneously.
How would you think about designing this?"

Respond with ONLY the message you would say out loud — no labels, no markdown, no <think> tags.`;
};

export const techSetupNode = async (
  state: TechInterviewStateType,
): Promise<Partial<TechInterviewStateType>> => {
  const { question } = state;
  const log = logger.child({ node: "tech_setup" });

  if (!question) {
    log.error("Tech setup node called before question was generated");
    throw new Error("techSetupNode: state.question is null — tech_question_generator must run first");
  }

  log.info("Setting up technical interview session", { questionTitle: question.title, difficulty: question.difficulty });

  let openingContent: string;
  try {
    const openingPrompt = buildOpeningPrompt(question);
    const openingRes = await interviewerModel.invoke(openingPrompt);
    openingContent = stripThinkTags(openingRes.content as string).replace(/^["']|["']$/g, "");
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    log.error("Failed to generate tech opening message", { err: error.message, stack: error.stack });
    throw error;
  }

  const openingMessage: Message = {
    role: "interviewer",
    content: openingContent,
    phase: "warm_up" as never,
    timestamp: Date.now(),
  };

  log.info("Tech setup complete — opening message generated");

  return {
    currentPhase: "warm_up",
    phaseNotes: { warm_up: "", core_concepts: "", design_coding: "", deep_dive: "" },
    messages: [openingMessage],
    turnCount: 0,
    phaseTurnCount: 0,
  };
};
