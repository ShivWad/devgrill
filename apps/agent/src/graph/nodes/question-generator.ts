import { extractJson, stripThinkTags } from "../../../utils";
import { reasoningModel } from "../../models";
import type { QuestionConfig, InterviewStrategy } from "../state";

// ─────────────────────────────────────────────────────────
// Stage 1 — analysis & candidate scenarios (free text)
// ─────────────────────────────────────────────────────────

const buildStage1Prompt = (
  resumeText: string,
  jdText: string,
  targetCompany: string,
  targetRole: string,
): string => {
  return `You are a senior technical interviewer preparing a system design interview.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jdText}

TARGET COMPANY: ${targetCompany}
TARGET ROLE: ${targetRole}

TASK:
1. Analyze the resume: extract key technical skills, projects, scale of systems built,
   domain experience, and years of experience.
2. Analyze the job description: extract required skills, technical expectations,
   domain focus, and seniority signals.
3. Identify the TOP 2-3 GAPS: things the job description requires that the resume
   does not clearly demonstrate.
4. Before proposing questions, identify: what kind of products/systems does
   ${targetCompany} actually build? If it's a consulting firm, what's the likely
   CLIENT industry for a ${targetRole}? (e.g. if fintech, focus on financial systems;
   if an edtech company like Pearson, focus on educational/assessment systems).
   Every candidate question below should be set in THIS inferred domain, not a
   generic textbook domain.
5. For EACH gap, propose 2-3 DIFFERENT candidate system design questions that
   would test that gap. Each candidate question must:
   - Connect to something specific in the resume (a foothold, not a cold start)
   - Be set in the domain you inferred in step 4
   - Stretch the candidate into the identified gap
   - Be calibrated to the seniority level implied by the job description

Do NOT default to these commonly-seen interview questions unless the job
description makes them genuinely unavoidable: URL shortener, e-commerce
platform / order management system, generic chat or messaging app, generic
notification system, rate limiter, news feed, ride-sharing app, file storage
service (Dropbox-style), social media platform, generic API gateway.

If your first instinct is one of the above, push further: what underlying
capability is being tested, and what LESS COMMON, MORE SPECIFIC system would
test the same capability while being grounded in the domain you inferred?

EXAMPLES of good question selection logic (do not copy these, just follow the
reasoning):
- Resume: built REST APIs. JD: requires event-driven architecture.
  -> "Design a real-time order tracking system" (tests event streaming,
     references API experience)
- Resume: worked with PostgreSQL. JD: requires distributed data systems.
  -> "Design a distributed key-value store" (tests distributed systems,
     references DB knowledge)
- Resume: built a notification system. JD: senior role, large scale.
  -> "Design a notification system for 50 million users" (scales their
     exact experience)

Think out loud. For each candidate question, briefly note: the gap it tests,
the resume hook it connects to, the domain it's set in, and why it's NOT one
of the generic templates listed above. There is no required output format for
this step — just clear, well-reasoned analysis and a list of candidate
questions with the notes described above.`;
};

// ─────────────────────────────────────────────────────────
// Stage 2 — selection & structured output (strict JSON)
// ─────────────────────────────────────────────────────────

const buildStage2Prompt = (
  resumeText: string,
  jdText: string,
  targetCompany: string,
  targetRole: string,
  stage1Analysis: string,
): string => {
  return `You are finalizing a system design interview question based on prior analysis.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jdText}

TARGET COMPANY: ${targetCompany}
TARGET ROLE: ${targetRole}

PRIOR ANALYSIS AND CANDIDATE QUESTIONS:
${stage1Analysis}

TASK:
From the candidate questions above, select the SINGLE BEST one — the one
that is most specific, most domain-grounded, and best tests a real gap while
connecting to the candidate's actual experience. Do not invent a new question;
choose from the candidates already proposed (you may refine wording/details).

When selecting, prefer candidates that include concrete numbers, scale
constraints, or domain-specific regulatory/operational details over more
abstract ones. Also re-check: does your selected candidate resemble any
item in the blocklist from the analysis step? If so, prefer a different
candidate even if it requires more creative framing.

Then produce the full question configuration and interview strategy.

OUTPUT FORMAT:
Respond with ONLY valid JSON, no markdown code fences, no commentary, no
explanation, no <think> tags. The JSON must exactly match this shape:

{
  "question": {
    "title": string,
    "description": string,
    "difficulty": "mid" | "senior" | "staff",
    "whyThisQuestion": string,
    "expectedClarifications": string[],
    "keyComponents": string[],
    "commonPitfalls": string[],
    "deepDiveTargets": string[]
  },
  "strategy": {
    "resumeStrengths": string[],
    "resumeGaps": string[],
    "experienceHooks": string[],
    "companyContext": string,
    "probingStrategy": string
  }
}

FORMAT REFERENCE EXAMPLE (this shows the LEVEL OF DETAIL and STRUCTURE expected
only — your domain and question will likely be different, based on the
candidates above. Do not copy this domain or content):

{
  "question": {
    "title": "Design a High-Availability Banking Transaction Processing System",
    "description": "Design a system to process millions of banking transactions daily, ensuring high availability and fault tolerance.",
    "difficulty": "senior",
    "whyThisQuestion": "Tests architectural thinking around scalability, fault tolerance, and real-world financial systems. Connects to resume's microservice experience but requires deeper architecture.",
    "expectedClarifications": [
      "What level of transaction volume are we considering?",
      "Are there specific regulatory requirements?",
      "How will you handle failure scenarios?"
    ],
    "keyComponents": [
      "High Availability",
      "Scalability",
      "Fault Tolerance",
      "Transaction Processing"
    ],
    "commonPitfalls": [
      "Overcomplicating the architecture without clear justification.",
      "Ignoring monitoring and observability.",
      "Not considering disaster recovery."
    ],
    "deepDiveTargets": [
      "Architecture for scalability",
      "Handling failures in distributed systems",
      "Monitoring and logging"
    ]
  },
  "strategy": {
    "resumeStrengths": [
      "4+ years of experience with .NET, React.js, and microservices.",
      "Experience integrating external systems (Oracle CPQ, MuleSoft)."
    ],
    "resumeGaps": [
      "No explicit mention of designing large-scale architectures or leading architectural decisions."
    ],
    "experienceHooks": [
      "Work on 40+ features with .NET and SQL Server.",
      "Automated data processing workflows reducing time significantly."
    ],
    "companyContext": "Accenture delivers enterprise-level solutions, requiring robust architecture for mission-critical systems.",
    "probingStrategy": "Focus on how the candidate would extend their microservice experience to design a highly available system, emphasizing scalability and fault tolerance. Probe into their understanding of monitoring and recovery mechanisms."
  }
}`;
};


// ─────────────────────────────────────────────────────────
// Main function
// ─────────────────────────────────────────────────────────

export interface QuestionGeneratorResult {
  question: QuestionConfig;
  strategy: InterviewStrategy;
}

export const generateQuestion = async (
  resumeText: string,
  jdText: string,
  targetCompany: string,
  targetRole: string,
): Promise<QuestionGeneratorResult> => {
  // ── Stage 1: analysis + candidate scenarios ──
  const stage1Prompt = buildStage1Prompt(resumeText, jdText, targetCompany, targetRole);
  const stage1Res = await reasoningModel.invoke(stage1Prompt);
  const stage1Analysis = stripThinkTags(stage1Res.content as string);

  console.log("=== STAGE 1 ANALYSIS ===");
  console.log(stage1Analysis);
  console.log("========================\n");

  // ── Stage 2: select + structure ──
  const stage2Prompt = buildStage2Prompt(
    resumeText,
    jdText,
    targetCompany,
    targetRole,
    stage1Analysis,
  );
  const stage2Res = await reasoningModel.invoke(stage2Prompt);
  const raw = stage2Res.content as string;

  let parsed: QuestionGeneratorResult;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch (err) {
    console.error("STAGE 2 RAW OUTPUT (failed to parse):");
    console.error(raw);
    throw new Error(`generateQuestion: failed to parse JSON — ${err}`);
  }

  if (!parsed.question || !parsed.strategy) {
    console.error("STAGE 2 RAW OUTPUT (missing question/strategy):");
    console.error(raw);
    throw new Error("generateQuestion: response missing 'question' or 'strategy' key");
  }

  return parsed;
};