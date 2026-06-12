# Mock Interview Agent — Project Spec

## Overview

A multi-turn AI agent that conducts **personalized** system design interviews. The candidate uploads their resume and the job description they applied for. An agent analyzes both, generates a tailored interview question targeting the gap between their experience and the role's requirements, then conducts a realistic multi-phase interview, scores answers against a structured rubric, and delivers actionable feedback.

**Scope**: Portfolio project. No billing, no marketing site, no email system. Focus is on agent quality, personalization, and scoring accuracy.

**Live URL target**: `interview.shivwad.in`

---

## Tech Stack

| Layer              | Choice                                      | Why                                                  |
|--------------------|---------------------------------------------|------------------------------------------------------|
| Frontend           | Next.js 15 (App Router, TypeScript)         | SSR, streaming, server actions                       |
| Styling            | Tailwind CSS + shadcn/ui                    | Fast to build, consistent components                 |
| Agent orchestration| LangGraph.js (separate Node.js service)     | Stateful graph, checkpointing, interrupt/resume      |
| Question generation| DeepSeek V4-Pro (`deepseek-v4-pro`)         | Needs strong reasoning for resume/JD analysis        |
| Interviewer LLM    | DeepSeek V4-Flash (`deepseek-v4-flash`)     | $0.14/$0.28 per M tokens — cheap per-turn            |
| Judge/Scorer LLM   | DeepSeek V4-Pro (`deepseek-v4-pro`)         | $0.435/$0.87 per M tokens — scoring accuracy         |
| Fallback LLM       | Claude Haiku 4.5                            | Automatic failover when DeepSeek is down             |
| Database           | PostgreSQL (Neon)                           | Checkpoints, users, sessions, scores                 |
| File storage       | Uploadthing (or Vercel Blob)                | Resume PDFs, JD uploads                              |
| Session cache      | Redis (Upstash)                             | Active interview state, fast reads                   |
| Auth               | Clerk (free tier)                           | Google/GitHub login, JWT for API auth                |
| Deploy — frontend  | Vercel                                      | Free tier, automatic previews                        |
| Deploy — agent     | Railway                                     | Persistent Node.js process, $5/mo hobby              |
| Monitoring         | Sentry (free tier)                          | Error tracking, catch silent LLM failures            |

**Estimated cost per interview**: ~₹5-10 (1 V4-Pro question generation call + 40-60 turns V4-Flash + 1 V4-Pro judge call).

---

## Architecture

```
┌─────────────┐     SSE/HTTP      ┌──────────────────────┐
│   Browser    │◄────────────────►│  Next.js on Vercel    │
│  (React UI)  │                  │  - Pages/routes       │
│              │                  │  - Auth (Clerk)       │
│  Uploads:    │                  │  - File uploads       │
│  - Resume    │                  │  - Session management │
│  - JD        │                  └──────────┬───────────┘
└─────────────┘                             │ HTTP
                                             ▼
                                  ┌──────────────────────┐
                                  │  LangGraph Service    │
                                  │  Node.js + Express    │
                                  │  on Railway           │
                                  │                       │
                                  │  ┌─────────────────┐  │
                                  │  │  Interview Graph │  │
                                  │  │  (state machine) │  │
                                  │  └────────┬────────┘  │
                                  └───────────┼───────────┘
                                    ┌─────────┼─────────┐
                                    ▼         ▼         ▼
                              ┌─────────┐ ┌───────┐ ┌──────────┐
                              │DeepSeek │ │Postgres│ │  Redis   │
                              │V4 API   │ │ (Neon) │ │(Upstash) │
                              │+ Haiku  │ │        │ │          │
                              │fallback │ │        │ │          │
                              └─────────┘ └───────┘ └──────────┘
```

---

## Input Flow

### What the candidate provides

1. **Resume** — PDF upload (parsed to text server-side via `pdf-parse` or similar)
2. **Job description** — Paste text or PDF upload
3. **Target company** — Text input (e.g. "Google", "Flipkart", "Razorpay")
4. **Target role** — Text input (e.g. "Senior Backend Engineer")

All four are required before an interview can start. The resume and JD are stored as files (Uploadthing/Vercel Blob) and the extracted text is cached in Postgres for reuse across multiple interviews with the same resume.

---

## LangGraph State Machine

### Nodes (7 total)

1. **Question Generator** *(new)* — The most important node. Analyzes resume + JD + target company. Identifies skill gaps, relevant domain overlap, and the system design topic that would best test the candidate. Generates a complete `QuestionConfig` and `InterviewStrategy`. Uses V4-Pro.

2. **Setup** — Takes the generated `QuestionConfig`, builds coverage checklist, calibrates rubric to target level, generates opening message. No longer loads from DB.

3. **Interviewer** — Core conversational node. Selects phase-specific system prompt based on `state.currentPhase`. Has access to resume context and can reference candidate's experience. Calls V4-Flash.

4. **Interrupt (await input)** — LangGraph `interrupt()`. Checkpoints state to Postgres, streams interviewer response to frontend via SSE, pauses graph.

5. **Phase evaluator** — Runs after every candidate turn. Checks coverage checklist + turn count. Returns `stay`, `advance`, or `end`.

6. **Judge** — Single V4-Pro call after interview ends. Receives full transcript + question config + rubric + resume + JD. Scores against rubric AND evaluates readiness for the specific role.

7. **Report generator** — Takes judge scores + transcript + resume gaps. Produces markdown feedback including role-specific recommendations.

### Edges

```
START → question_generator → setup → interviewer → interrupt → phase_evaluator
                                        ▲                           │
                                        │     (stay / advance)      │
                                        └───────────────────────────┘
                                                                    │
                                                   (all phases done)│
                                                                    ▼
                                                         judge → report → END
```

### Interview Phases (unchanged)

| Phase          | Goal                                    | Transition trigger                                      | Max turns |
|----------------|-----------------------------------------|---------------------------------------------------------|-----------|
| Requirements   | Candidate asks clarifying questions     | ≥3 expected clarifications asked OR turn limit           | 5         |
| Design         | Candidate proposes high-level architecture | ≥2 key components proposed OR turn limit               | 6         |
| Deep dive      | Interviewer drills into specific components | ≥1 component explored with specifics OR turn limit     | 5         |
| Scale          | Bottlenecks, tradeoffs, estimates       | ≥1 bottleneck + ≥1 tradeoff discussed OR turn limit     | 4         |

---

## The Question Generator Node (Core Differentiator)

This is the node that makes this project different from every other mock interview tool. It receives the raw resume text + JD text + company + role and produces two outputs:

### Output 1: QuestionConfig

```typescript
interface QuestionConfig {
  title: string;                     // "Design a real-time order tracking system"
  description: string;               // Full problem statement tailored to role
  difficulty: "mid" | "senior" | "staff";
  whyThisQuestion: string;           // "The JD emphasizes event-driven architecture
                                     //  and your resume shows message queue experience
                                     //  but no real-time streaming — this tests that gap"
  expectedClarifications: string[];
  keyComponents: string[];
  commonPitfalls: string[];
  deepDiveTargets: string[];
}
```

### Output 2: InterviewStrategy

```typescript
interface InterviewStrategy {
  resumeStrengths: string[];         // Skills from resume relevant to this question
  resumeGaps: string[];              // Skills the JD wants that the resume lacks
  experienceHooks: string[];         // Things from their resume to reference during interview
                                     // e.g. "You built a notification system at Digitize —
                                     //  how would you handle 1000x that scale?"
  companyContext: string;            // "Google values distributed systems thinking
                                     //  and back-of-envelope estimation"
  probingStrategy: string;           // What the deep dive should focus on based on gaps
}
```

### The Question Generator Prompt

```
You are a senior technical interviewer preparing a system design interview.

INPUTS:
- Candidate resume: {resumeText}
- Job description: {jdText}
- Target company: {company}
- Target role: {role}

TASK:
1. Analyze the resume: extract key technical skills, projects, scale of systems built,
   domain experience, and years of experience.
2. Analyze the JD: extract required skills, technical expectations, domain focus,
   and seniority signals.
3. Identify the GAP: what does the JD require that the resume doesn't clearly demonstrate?
4. Generate a system design question that:
   - Is relevant to the company's domain and the role's focus area
   - Tests the identified skill gap (the candidate must stretch, not just repeat past work)
   - Connects to something in their resume (so they have a foothold, not a cold start)
   - Is calibrated to the seniority level implied by the JD
5. Generate the full InterviewStrategy with resume hooks and probing direction.

EXAMPLES of good question selection logic:
- Resume: built REST APIs, JD: requires event-driven architecture
  → "Design a real-time order tracking system" (tests event streaming, references their API experience)
- Resume: worked with PostgreSQL, JD: requires distributed data
  → "Design a distributed key-value store" (tests distributed systems, references their DB knowledge)
- Resume: notification system experience, JD: senior role at scale
  → "Design a notification system for 50M users" (scales their exact experience, tests the growth gap)

OUTPUT: JSON matching QuestionConfig + InterviewStrategy schemas.
Do NOT pick a generic question. The question MUST be derived from the resume-JD gap analysis.
```

### Why V4-Pro for this node

This is the most reasoning-intensive call in the entire system. It needs to:
- Parse and understand an entire resume (1-3 pages)
- Parse a job description (often messy formatting)
- Cross-reference skills and identify gaps
- Generate a coherent, well-calibrated question
- Produce structured JSON output

V4-Flash would work for the interviewer turns (short, conversational) but this node needs the reasoning depth of V4-Pro. It's a single call per interview so the cost is negligible (~₹1-2).

---

## State Schema

```typescript
import { Annotation } from "@langchain/langgraph";

type Phase = "requirements" | "design" | "deep_dive" | "scale";

interface Message {
  role: "interviewer" | "candidate";
  content: string;
  phase: Phase;
  timestamp: number;
}

interface QuestionConfig {
  title: string;
  description: string;
  difficulty: "mid" | "senior" | "staff";
  whyThisQuestion: string;
  expectedClarifications: string[];
  keyComponents: string[];
  commonPitfalls: string[];
  deepDiveTargets: string[];
}

interface InterviewStrategy {
  resumeStrengths: string[];
  resumeGaps: string[];
  experienceHooks: string[];
  companyContext: string;
  probingStrategy: string;
}

interface RubricScores {
  requirementsGathering: number;     // 0-5
  apiDesign: number;
  dataModeling: number;
  systemComponents: number;
  scalability: number;
  tradeoffs: number;
  communication: number;
  overall: number;                   // 0-100 weighted
  levelAssessment: string;
  roleReadiness: string;             // "Ready for this role" / "Needs work on X, Y"
}

interface PhaseFeedback {
  phase: Phase;
  score: number;
  strengths: string[];
  gaps: string[];
  specificQuotes: string[];
}

// ─── LangGraph State ───

const InterviewState = Annotation.Root({
  // Raw inputs (from frontend)
  resumeText: Annotation<string>,
  jdText: Annotation<string>,
  targetCompany: Annotation<string>,
  targetRole: Annotation<string>,

  // Generated by question_generator node
  question: Annotation<QuestionConfig | null>({
    default: () => null,
    reducer: (_, next) => next,
  }),
  strategy: Annotation<InterviewStrategy | null>({
    default: () => null,
    reducer: (_, next) => next,
  }),

  // Interview progress
  currentPhase: Annotation<Phase>({
    default: () => "requirements",
    reducer: (_, next) => next,
  }),
  messages: Annotation<Message[]>({
    default: () => [],
    reducer: (prev, next) => [...prev, ...next],
  }),
  turnCount: Annotation<number>({
    default: () => 0,
    reducer: (prev, next) => prev + next,
  }),
  phaseTurnCount: Annotation<number>({
    default: () => 0,
    reducer: (_, next) => next,
  }),

  // Coverage tracking
  coverageChecklist: Annotation<Record<string, boolean>>({
    default: () => ({}),
    reducer: (prev, next) => ({ ...prev, ...next }),
  }),
  phaseNotes: Annotation<Record<Phase, string>>({
    default: () => ({ requirements: "", design: "", deep_dive: "", scale: "" }),
    reducer: (prev, next) => ({ ...prev, ...next }),
  }),

  // Scoring
  scores: Annotation<RubricScores | null>({
    default: () => null,
    reducer: (_, next) => next,
  }),
  phaseFeedback: Annotation<PhaseFeedback[]>({
    default: () => [],
    reducer: (prev, next) => [...prev, ...next],
  }),
  reportMarkdown: Annotation<string | null>({
    default: () => null,
    reducer: (_, next) => next,
  }),
});
```

---

## Prompt Architecture

### Shared Interviewer Skeleton

```
SYSTEM:
You are a senior engineer at {strategy.companyContext} conducting a 45-minute
system design interview for a {targetRole} position.

CANDIDATE BACKGROUND (from their resume — reference naturally, don't recite):
{strategy.resumeStrengths}

EXPERIENCE HOOKS (use these to connect the question to their past work):
{strategy.experienceHooks}

SKILL GAPS TO PROBE (from resume-JD analysis — push on these areas):
{strategy.resumeGaps}

RULES:
- Never say "great point", "that's correct", or "good thinking"
- Do not validate answers. Probe, challenge, ask follow-ups
- Reference their resume experience naturally when relevant:
  "You mentioned building X at Y — how would that change at this scale?"
- Keep responses to 2-4 sentences
- If they go off track, redirect firmly

PHASE: {phase-specific instructions}

QUESTION: {question.description}

COVERAGE STATE:
Covered: {checklist items that are true}
Not yet covered: {checklist items that are false}

TRANSCRIPT:
{full conversation history}
```

### Phase-Specific Instructions (same as before)

**Requirements**: Let them ask clarifying questions. Redirect if they skip to design.
**Design**: Let them propose architecture, then ask for end-to-end request trace.
**Deep dive**: Target {strategy.probingStrategy}. Probe failure modes, data structures, why-not alternatives.
**Scale**: Push for numbers, bottlenecks, tradeoffs, back-of-envelope math.

### Judge Prompt (Enhanced)

```
You are scoring a system design interview for a {targetRole} at {targetCompany}.

RESUME: {resumeText}
JOB DESCRIPTION: {jdText}
QUESTION: {question.title} — {question.whyThisQuestion}
INTERVIEW STRATEGY: {strategy}
TRANSCRIPT: {full messages}

Score 0-5 per category. A 3 means "meets expectations for this role."
For each score, cite specific turns from the transcript as evidence.

ADDITIONAL EVALUATION:
- Role readiness: Based on this interview AND their resume, how ready are they
  for this specific role at this company?
- Gap analysis: What specific skills should they work on before interviewing
  for this role? Be concrete: not "improve system design" but "practice designing
  systems with strict consistency requirements — you defaulted to eventual
  consistency without considering the order-processing use case."
- Resume advice: Are there projects or experiences they should highlight
  differently given what they demonstrated in this interview?
```

---

## Database Schema

```sql
-- Users (synced from Clerk webhook)
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL,
  name          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Resume store (one active resume per user, supports re-upload)
CREATE TABLE resumes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT REFERENCES users(id),
  file_url      TEXT NOT NULL,           -- Uploadthing/Vercel Blob URL
  extracted_text TEXT NOT NULL,          -- Parsed text from PDF
  uploaded_at   TIMESTAMPTZ DEFAULT NOW(),
  is_active     BOOLEAN DEFAULT TRUE
);

-- Interview sessions
CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT REFERENCES users(id),
  resume_id     UUID REFERENCES resumes(id),
  thread_id     TEXT NOT NULL UNIQUE,
  -- Inputs
  jd_text       TEXT NOT NULL,
  target_company TEXT NOT NULL,
  target_role   TEXT NOT NULL,
  -- Generated
  question_config JSONB,                 -- Generated QuestionConfig
  interview_strategy JSONB,             -- Generated InterviewStrategy
  -- Status
  status        TEXT CHECK (status IN ('generating', 'active', 'completed', 'abandoned'))
                DEFAULT 'generating',
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  total_turns   INTEGER,
  duration_seconds INTEGER
);

-- Scores
CREATE TABLE scores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID REFERENCES sessions(id) UNIQUE,
  requirements_gathering  SMALLINT CHECK (requirements_gathering BETWEEN 0 AND 5),
  api_design              SMALLINT CHECK (api_design BETWEEN 0 AND 5),
  data_modeling            SMALLINT CHECK (data_modeling BETWEEN 0 AND 5),
  system_components        SMALLINT CHECK (system_components BETWEEN 0 AND 5),
  scalability              SMALLINT CHECK (scalability BETWEEN 0 AND 5),
  tradeoffs                SMALLINT CHECK (tradeoffs BETWEEN 0 AND 5),
  communication            SMALLINT CHECK (communication BETWEEN 0 AND 5),
  overall                  SMALLINT CHECK (overall BETWEEN 0 AND 100),
  level_assessment         TEXT,
  role_readiness           TEXT,         -- New: specific to this role
  gap_analysis             TEXT,         -- New: what to work on
  resume_advice            TEXT,         -- New: how to position resume better
  phase_feedback           JSONB,
  report_markdown          TEXT,
  scored_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_resumes_user ON resumes(user_id);
CREATE INDEX idx_scores_session ON scores(session_id);
```

---

## API Routes

### Next.js Routes

```
POST   /api/resume/upload               Upload resume PDF
  Body: multipart/form-data
  Returns: { resumeId, extractedPreview }

POST   /api/interview/start             Start new interview
  Body: { resumeId, jdText, targetCompany, targetRole }
  Returns: SSE stream — first: question generation status, then: opening message

POST   /api/interview/[id]/message      Send candidate message
  Body: { content: string }
  Returns: SSE stream of interviewer response

GET    /api/interview/[id]              Get session state
GET    /api/interview/[id]/report       Get completed report
GET    /api/history                     List past interviews
```

### LangGraph Service Routes (internal)

```
POST   /graph/invoke                    Start graph (includes question generation)
POST   /graph/resume                    Resume after interrupt
GET    /graph/state/:threadId           Get current state
GET    /health                          Health check
```

---

## Pages & UI

### Route Structure

```
/                           Landing — hero + "Start interview" CTA
/login                      Clerk sign-in
/setup                      Interview setup form (upload resume, paste JD, enter company/role)
/dashboard                  Home: past interviews, scores
/interview/[id]/preparing   Question generation loading screen (5-10 seconds)
/interview/[id]             Active interview (chat + scratchpad)
/interview/[id]/report      Post-interview debrief + scores
```

### Interview Setup Page (`/setup`)

Single-page form, vertical layout:

1. **Resume upload** — Drag-and-drop zone. Shows parsed preview after upload. If user has previously uploaded a resume, show "Use existing" toggle with the last resume's preview. Re-upload replaces it.

2. **Job description** — Large textarea. Paste the full JD text. Helper text: "Copy the full job description from the listing."

3. **Target company** — Text input with autocomplete for common companies (Google, Amazon, Flipkart, Razorpay, etc). Free text allowed.

4. **Target role** — Text input. Helper text: "e.g. Senior Backend Engineer, SDE-2, Staff Engineer"

5. **Start interview** button. Disabled until all 4 fields are filled. On click: uploads resume if new, creates session, redirects to `/interview/[id]/preparing`.

### Preparing Screen (`/interview/[id]/preparing`)

Shows while the question generator node runs (~5-10 seconds):

- Animated progress indicator (not a spinner — a sequence of status messages):
  - "Reading your resume..."
  - "Analyzing the job description..."
  - "Identifying skill gaps..."
  - "Crafting your interview question..."
- Once complete: shows the generated question title + `whyThisQuestion` explanation
- "Start interview" button → redirects to `/interview/[id]`
- This pause is intentional — seeing WHY this question was chosen builds trust in the system

### Interview UI (`/interview/[id]`) — same as before

**Left panel (60%)** — Chat with phase indicator, timer, turn counter
**Right panel (40%)** — Scratchpad for candidate notes
**Top bar** — Timer, phase badge, "End early" button

### Report Page (`/interview/[id]/report`) — enhanced

Same as before (score card, radar chart, phase feedback) PLUS:

- **"Why this question"** section at top — shows `whyThisQuestion` and the gap analysis that led to this question choice
- **Role readiness assessment** — "Based on this interview, here's where you stand for {role} at {company}"
- **Gap analysis** — Specific skills to work on, with concrete recommendations
- **Resume advice** — How to better position their experience for this role
- **"Try another angle"** button — re-runs with same resume/JD but generates a different question (the question generator is non-deterministic + you can add temperature or a "previously asked" exclusion list)

---

## Project Structure

```
mock-interview/
├── apps/
│   ├── web/                          # Next.js (Vercel)
│   │   ├── app/
│   │   │   ├── (marketing)/
│   │   │   │   └── page.tsx
│   │   │   ├── (app)/
│   │   │   │   ├── setup/
│   │   │   │   │   └── page.tsx      # Resume + JD + company + role form
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── interview/
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── preparing/
│   │   │   │   │       │   └── page.tsx  # Question generation loading
│   │   │   │   │       ├── page.tsx      # Interview chat
│   │   │   │   │       └── report/
│   │   │   │   │           └── page.tsx
│   │   │   │   └── layout.tsx
│   │   │   ├── api/
│   │   │   │   ├── resume/
│   │   │   │   │   └── upload/route.ts
│   │   │   │   ├── interview/
│   │   │   │   │   ├── start/route.ts
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── message/route.ts
│   │   │   │   │       └── report/route.ts
│   │   │   │   ├── history/route.ts
│   │   │   │   └── webhooks/
│   │   │   │       └── clerk/route.ts
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── setup/
│   │   │   │   ├── resume-upload.tsx
│   │   │   │   ├── jd-input.tsx
│   │   │   │   └── company-role-input.tsx
│   │   │   ├── interview/
│   │   │   │   ├── chat-panel.tsx
│   │   │   │   ├── scratchpad.tsx
│   │   │   │   ├── phase-indicator.tsx
│   │   │   │   ├── message-bubble.tsx
│   │   │   │   ├── preparing-screen.tsx
│   │   │   │   └── timer.tsx
│   │   │   ├── report/
│   │   │   │   ├── score-card.tsx
│   │   │   │   ├── radar-chart.tsx
│   │   │   │   ├── phase-feedback.tsx
│   │   │   │   ├── role-readiness.tsx
│   │   │   │   ├── gap-analysis.tsx
│   │   │   │   └── share-card.tsx
│   │   │   └── ui/
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   ├── db.ts
│   │   │   └── resume-parser.ts      # PDF → text extraction
│   │   └── drizzle/
│   │       ├── schema.ts
│   │       └── migrations/
│   │
│   └── agent/                        # LangGraph service (Railway)
│       ├── src/
│       │   ├── graph/
│       │   │   ├── state.ts
│       │   │   ├── graph.ts
│       │   │   ├── nodes/
│       │   │   │   ├── question-generator.ts   # NEW — the core differentiator
│       │   │   │   ├── setup.ts
│       │   │   │   ├── interviewer.ts
│       │   │   │   ├── phase-evaluator.ts
│       │   │   │   ├── judge.ts
│       │   │   │   └── report-generator.ts
│       │   │   └── prompts/
│       │   │       ├── question-generator.ts   # NEW
│       │   │       ├── skeleton.ts
│       │   │       ├── requirements.ts
│       │   │       ├── design.ts
│       │   │       ├── deep-dive.ts
│       │   │       ├── scale.ts
│       │   │       └── judge-rubric.ts
│       │   ├── models/
│       │   │   └── index.ts
│       │   ├── checkpointer.ts
│       │   └── server.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── Dockerfile
│
├── packages/
│   └── shared/
│       ├── types.ts
│       └── constants.ts
│
├── turbo.json
├── package.json
└── .env.example
```

---

## Environment Variables

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Database (Neon)
DATABASE_URL=postgresql://...

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# File storage
UPLOADTHING_SECRET=
UPLOADTHING_APP_ID=

# LLM APIs
DEEPSEEK_API_KEY=
ANTHROPIC_API_KEY=

# LangGraph service
LANGGRAPH_SERVICE_URL=http://localhost:3001

# Sentry
SENTRY_DSN=
```

---

## LLM Fallback Strategy

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";

const deepseekFlash = new ChatOpenAI({
  modelName: "deepseek-v4-flash",
  openAIApiKey: process.env.DEEPSEEK_API_KEY,
  configuration: { baseURL: "https://api.deepseek.com" },
});

const deepseekPro = new ChatOpenAI({
  modelName: "deepseek-v4-pro",
  openAIApiKey: process.env.DEEPSEEK_API_KEY,
  configuration: { baseURL: "https://api.deepseek.com" },
});

const haikuFallback = new ChatAnthropic({
  model: "claude-haiku-4-5-20251001",
});

// Question generator + Judge: V4-Pro with Haiku fallback
export const reasoningModel = deepseekPro.withFallbacks({
  fallbacks: [haikuFallback],
});

// Interviewer: V4-Flash with Haiku fallback
export const interviewerModel = deepseekFlash.withFallbacks({
  fallbacks: [haikuFallback],
});
```

---

## Build Order

### Phase 1 — Question generator + agent core (Week 1-2)
- [ ] Set up Turborepo monorepo
- [ ] Define shared types in `packages/shared`
- [ ] Set up Postgres on Neon + Drizzle schema
- [ ] Build question generator node — test with your own resume + sample JDs
- [ ] Build LangGraph state schema
- [ ] Build setup + interviewer + phase evaluator nodes
- [ ] Test full interview loop in terminal (hardcoded resume/JD text, no UI)
- [ ] Iterate on question generator prompts until generated questions are consistently good
- [ ] Add Postgres checkpointer — verify interrupt/resume

### Phase 2 — Basic UI + file upload (Week 2-3)
- [ ] Set up Next.js with Clerk auth
- [ ] Build resume upload + PDF text extraction
- [ ] Build interview setup page (resume + JD + company + role form)
- [ ] Build preparing screen with status messages
- [ ] Build interview chat page with SSE streaming
- [ ] Wire everything: upload → generate → interview → complete
- [ ] Test full flow in browser with your own resume

### Phase 3 — Scoring & report (Week 3-4)
- [ ] Build judge node with enhanced rubric (role readiness, gap analysis, resume advice)
- [ ] Build report generator node
- [ ] Build report page: scores + radar chart + role readiness + gaps
- [ ] Store scores in DB
- [ ] Build dashboard with interview history

### Phase 4 — Polish (Week 4-5)
- [ ] Add scratchpad panel
- [ ] Add phase indicator + timer
- [ ] Upgrade phase evaluator to LLM-based coverage checking
- [ ] Add LLM fallback (Haiku 4.5)
- [ ] Add "End early" button
- [ ] Add "Try another angle" (re-generate different question for same resume/JD)
- [ ] Add shareable report card
- [ ] Sentry error tracking
- [ ] Deploy: Vercel + Railway
- [ ] Point `interview.shivwad.in`

---

## Non-Goals (for now)

- Billing / payments / subscriptions
- Marketing site / SEO pages
- Email notifications
- Admin panel
- Team/org accounts
- Behavioral interview mode
- Coding interview mode (system design only)
- Real-time collaborative whiteboard
- Mobile app
- Static question bank (questions are always generated)
