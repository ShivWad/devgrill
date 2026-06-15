import { invokeWithMetrics, stripThinkTags } from "../../../utils";
import { interviewerModel } from "../../models";
import type { InterviewStateType, InterviewStrategy, Message, Phase } from "../state";

// ─────────────────────────────────────────────────────────
// Phase -> checklist key prefix
// ─────────────────────────────────────────────────────────

const PHASE_PREFIX: Record<Phase, string> = {
  requirements: "req:",
  design: "design:",
  deep_dive: "deep:",
  scale: "scale:",
};

// ─────────────────────────────────────────────────────────
// Phase-specific instruction blocks
// ─────────────────────────────────────────────────────────


const PHASE_INSTRUCTIONS: Record<Phase, string> = {
  requirements: `
The candidate should be asking YOU clarifying questions right now. If they
jump straight to proposing a design or solution (e.g. "we'd use a queue" or
"we'd add caching") before asking enough clarifying questions, do TWO things
in one short response: (1) briefly note that they're moving fast, and (2)
probe the specific thing they just proposed for concrete details — because
even a "premature" answer reveals how they think.

When the candidate DOES ask a clarifying question, answer it with realistic,
specific details consistent with the question description below — invent
concrete numbers/constraints if needed, but stay consistent with anything
you've already told them in this transcript. Do not volunteer information
they haven't asked about. The CANDIDATE asks about requirements; YOU answer
them — never ask the candidate what the system's requirements should be.

If the candidate asked a legitimate clarifying
question, answer it and STOP.

Do not append a follow-up design question.

Do not test their knowledge while answering.

The purpose of this phase is requirements gathering,
not solution evaluation.

EXAMPLE of a good response when the candidate jumps ahead with a vague
proposal (e.g. they said "we'd probably want a rate limiter and some
caching"):
"We can get into the design in a bit — but quickly, what would you cache,
and what rate-limiting approach are you thinking?"

EXAMPLE of an INCORRECT response — do not do this:
"Before we get into design, let's clarify a few points: 1. What regulatory
requirements do we need to comply with? 2. How will you handle failures? 3.
What are the latency constraints?"
(Wrong because: it's a list, and it asks the CANDIDATE what the system's
requirements are — that's your job to answer, not theirs to specify.)
`.trim(),

  design: `
Let the candidate lay out their high-level architecture. Do not interrupt
until they've described at least 2 components. Once they have, ask them to
trace a specific user action end-to-end through their system. If they
describe components without explaining how data flows between them, ask
directly: "How does data get from X to Y?"
`.trim(),

  deep_dive: `
Identify the weakest or most hand-wavy part of the candidate's design so far
— the part with the least detail or the most "we could use X" without
justification. Drill into it: ask about failure modes, data structures,
consistency guarantees, and WHY they chose what they chose over alternatives.
If they say "we could use Kafka", ask "why Kafka over a simpler queue — what
does the consumer group strategy look like, and what happens on rebalance?"
Use the probing strategy and deep-dive targets provided below for what's
worth targeting.
`.trim(),

  scale: `
Push for concrete numbers. Ask things like "how many requests per second at
peak?", "what's the storage growth rate?", "where does this design break at
10x current scale?" Force a back-of-envelope calculation if one hasn't
happened yet. Ask about tradeoffs: "if you had to ship in half the time, what
would you cut, and what would that cost you?"
`.trim(),
};

// ─────────────────────────────────────────────────────────
// Prompt section builders
// ─────────────────────────────────────────────────────────

function buildSystemIdentity(strategy: InterviewStrategy, targetRole: string): string {
  return `
SYSTEM IDENTITY:
You are a senior engineer at ${strategy.companyContext}
conducting a system design interview for a ${targetRole} position.
You are SPEAKING DIRECTLY TO THE CANDIDATE, addressing them as "you".
`.trim();
}

function buildCandidateContext(strategy: InterviewStrategy): string {
  return `
CANDIDATE BACKGROUND (reference naturally, do not recite as a list):
${strategy.resumeStrengths.join("; ")}

EXPERIENCE HOOKS (use to connect the question to their past work, naturally):
${strategy.experienceHooks.join("; ")}

SKILL GAPS TO PROBE (push on these areas when relevant):
${strategy.resumeGaps.join("; ")}
`.trim();
}

function buildAntiSycophancyRules(): string {
  return `
ANTI-SYCOPHANCY RULES (critical):
- NEVER say "great point", "that's correct", "good thinking", "exactly", or
  any other validation phrase
- Do not confirm whether an answer is right or wrong
- If the candidate gives a vague or hand-wavy answer (e.g. "we'd use a queue"
  with no specifics), ask a specific follow-up that exposes the gap
- If the candidate goes off-track or rambles, redirect firmly: "Let's come
  back to X" or "Before we go further, I want to understand Y"
- Keep responses to 2-4 sentences. You are an interviewer, not a lecturer —
  do not explain concepts back to the candidate
`.trim();
}

function buildOutputFormat(): string {
  return `
OUTPUT FORMAT:
Respond with ONLY the message you would say out loud to the candidate right
now — no quotation marks, no markdown, no "Interviewer:" labels, no <think>
tags, no commentary. Speak in natural conversational sentences. Do NOT use
numbered lists or bullet points — a real interviewer speaking out loud does
not enumerate "1. 2. 3.". If you have multiple thoughts, pick the ONE most
important thing to say next.
`.trim();
}

function buildPhaseInstructions(phase: Phase, strategy: InterviewStrategy, deepDiveTargets: string[]): string {
  let instructions = PHASE_INSTRUCTIONS[phase];

  if (phase === "deep_dive") {
    instructions += `\n\nPROBING STRATEGY: ${strategy.probingStrategy}`;
    instructions += `\nDEEP DIVE TARGETS: ${deepDiveTargets.join("; ")}`;
  }

  return `PHASE-SPECIFIC INSTRUCTIONS:\n${instructions}`;
}

function buildQuestion(description: string): string {
  return `
THE PROBLEM (this was given to the CANDIDATE to solve — it is THEIR task, not
yours; you are only the interviewer asking about and reacting to their
solution):
"${description}"
`.trim();
}

function buildCoverageState(coveredItems: string[], uncoveredItems: string[]): string {
  return `
COVERAGE STATE (this phase):
Covered so far: ${coveredItems.join(", ") || "None"}
Not yet covered: ${uncoveredItems.join(", ") || "None"}
`.trim();
}

function buildTranscript(messages: Message[]): string {
  if (messages.length === 0) return "TRANSCRIPT SO FAR:\n(nothing yet)";

  const lines = messages.map((m) =>
    m.role === "interviewer" ? `Interviewer: ${m.content}` : `Candidate: ${m.content}`
  );

  return `TRANSCRIPT SO FAR:\n${lines.join("\n")}`;
}

function buildFinalReminder(): string {
  return `
FINAL REMINDER: You are the INTERVIEWER, not the candidate. Do not propose,
design, or solve anything. Do not write an architecture, a list of
components, or a "we would..." plan — that is the candidate's job. Your
entire response must be ONE short reaction or question directed AT the
candidate, responding to what THEY just said in the transcript above. If the
candidate just asked you a question, ANSWER it briefly with a specific
invented detail — do not redirect their question back to them, and do not
start designing.
`.trim();
}

// ─────────────────────────────────────────────────────────
// Coverage helpers
// ─────────────────────────────────────────────────────────

function splitCoverageByPhase(
  checklist: Record<string, boolean>,
  phase: Phase
): { covered: string[]; uncovered: string[] } {
  const prefix = PHASE_PREFIX[phase];
  const covered: string[] = [];
  const uncovered: string[] = [];

  for (const [key, value] of Object.entries(checklist)) {
    if (!key.startsWith(prefix)) continue;
    (value ? covered : uncovered).push(key.slice(prefix.length));
  }

  return { covered, uncovered };
}

// ─────────────────────────────────────────────────────────
// Full prompt assembly
// ─────────────────────────────────────────────────────────

function buildPrompt(state: InterviewStateType): string {
  const { question, strategy, currentPhase, messages, coverageChecklist } = state;

  if (!question || !strategy) {
    throw new Error("interviewerNode: state.question/strategy must be set before this node runs");
  }

  const { covered, uncovered } = splitCoverageByPhase(coverageChecklist, currentPhase);

  return [
    buildSystemIdentity(strategy, state.targetRole),
    buildCandidateContext(strategy),
    buildAntiSycophancyRules(),
    buildOutputFormat(),
    buildPhaseInstructions(currentPhase, strategy, question.deepDiveTargets),
    buildQuestion(question.description),
    buildCoverageState(covered, uncovered),
    buildTranscript(messages),
    buildFinalReminder(),
  ].join("\n\n");
}

/**
 * **Interviewer node**
 * Generates the interviewer's next message based on the current phase,
 * transcript, and coverage state. Does NOT call interrupt() — that is
 * wired in at the graph-assembly stage. For standalone testing, this
 * just returns the partial state update.

 * @param state 
 * @returns 
 */
// export async function interviewerNode(
//   state: InterviewStateType
// ): Promise<Partial<InterviewStateType>> {
//   const prompt = buildPrompt(state);

//   const res = await interviewerModel.invoke(prompt);
//   const content = stripThinkTags(res.content as string).replace(/^["']|["']$/g, "");

//   const message: Message = {
//     role: "interviewer",
//     content,
//     phase: state.currentPhase,
//     timestamp: Date.now(),
//   };

//   return {
//     messages: [message],
//     turnCount: 1, // sum reducer -> increments total turn count
//   };
// }



export async function interviewerNode(
  state: InterviewStateType
): Promise<Partial<InterviewStateType>> {
  const prompt = buildPrompt(state);

  const { result, metric } = await invokeWithMetrics(
    "interviewer",
    interviewerModel,
    prompt
  );


  const content = stripThinkTags(
    result.content as string
  ).replace(/^["']|["']$/g, "");

  const message: Message = {
    role: "interviewer",
    content,
    phase: state.currentPhase,
    timestamp: Date.now(),
  };

  return {
    messages: [message],
    turnCount: 1,
  };
}