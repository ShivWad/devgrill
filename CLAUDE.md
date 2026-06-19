# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Turborepo monorepo for a mock system design interview agent. Two deployable services:

- `apps/web` — Next.js 15 (App Router, TypeScript) on Vercel (**active**)
- `apps/agent` — LangGraph.js service (Node.js + Express) on Railway (**active**)
- `packages/shared` — Shared types package (`packages/shared/src/index.ts` — source of truth for all shared types)

## Commands

```bash
# Root
pnpm install
pnpm build
pnpm lint
pnpm typecheck

# Agent service
cd apps/agent && tsx server.ts             # start Express server (PORT 3001)
cd apps/agent && tsx src/cli.ts            # run full interview end-to-end (auto-candidate via LLM)

# Web app
cd apps/web && pnpm dev                    # start Next.js dev server (PORT 3000)

# Manual tests — no jest/vitest, run these directly
cd apps/agent && tsx src/test-deepseek.ts          # verify model connectivity
cd apps/agent && tsx src/test-generateQuestion.ts  # isolated question generator
cd apps/agent && tsx src/test-setup.ts             # setup node + opening message
cd apps/agent && tsx src/test-interviewer.ts       # interviewer across all phases
cd apps/agent && tsx src/test-jude.ts              # judge node
cd apps/agent && tsx src/test-phaseEvaluator.ts    # phase evaluator
```

**Env**: Each app has its own `.env` file (`apps/agent/.env` and `apps/web/.env`). See `.env.example` at root for all required keys.

Agent needs: `DEEPSEEK_API_KEY`, `ANTHROPIC_API_KEY`, `DATABASE_URL`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (fallback for `@clerk/express`), `ALLOWED_ORIGIN`, `AGENT_INTERNAL_SECRET`.

Web needs: `DATABASE_URL`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_WEBHOOK_SECRET`, `AGENT_URL`.

## Architecture

### Two-service split

Next.js handles auth (Clerk), PDF parsing, DB reads (profile/history), and proxies interview operations to the agent via HTTP API routes. The agent owns all graph state, LLM calls, and Postgres checkpointing.

Browser never talks to the agent directly. All calls go through `/api/interview/*` proxy routes which forward a Clerk JWT (`Authorization: Bearer <token>`) to the agent.

### LangGraph graph flow

```
START → question_generator → setup → interviewer → human_input → phase_evaluator
                                        ▲                               │
                                        │       (stay / advance)        │
                                        └───────────────────────────────┘
                                                                        │ (all phases done)
                                                                        ▼
                                                             judge → report_generator → END
```

8 nodes total — all implemented and wired. Graph compiled with `PostgresSaver` checkpointer (Neon).

### Agent service routes (`apps/agent/server.ts`)

Internal only (Next.js calls these, not the browser). All routes require `requireClerkAuth` (verifies Bearer JWT via `@clerk/express`).

| Route | Purpose |
|---|---|
| `POST /graph/invoke` | Start interview — runs question_generator → setup → interviewer → interrupt() |
| `POST /graph/resume` | Resume after interrupt with candidate answer |
| `GET /graph/state/:threadId` | Full state snapshot for session restore |
| `GET /graph/active-session` | Most recent incomplete session for the authenticated user |
| `POST /graph/auto-candidate` | Generate an LLM candidate answer (for auto-testing) |
| `GET /health` | Health check |

### Next.js API routes (`apps/web/app/api/`)

| Route | Purpose |
|---|---|
| `POST /api/interview/invoke` | Proxy → `/graph/invoke` |
| `POST /api/interview/resume` | Proxy → `/graph/resume` |
| `GET /api/interview/active-session` | Proxy → `/graph/active-session` |
| `GET /api/interview/state/[threadId]` | Proxy → `/graph/state/:threadId` |
| `POST /api/interview/auto-candidate` | Proxy → `/graph/auto-candidate` |
| `POST /api/parse-pdf` | Server-side PDF text extraction (pdfjs-dist v6) |
| `POST /api/waitlist` | Waitlist signup |
| `POST /api/webhooks/clerk` | Clerk webhook (user sync) |

### Web pages

| Route | Description |
|---|---|
| `/` | Landing page (auth-aware nav) |
| `/interview` | Interview UI — setup form, chat, report. Accepts `?threadId=` to restore a session |
| `/profile` | Active sessions (continue) + completed interviews (view report) |
| `/profile/[id]` | Full interview report: scores, rubric bars, phase feedback |
| `/pricing` | Pricing page (waitlist) |
| `/sign-in`, `/sign-up` | Clerk hosted auth pages |

### State persistence

- **Postgres (Neon)** — LangGraph checkpoints (`@langchain/langgraph-checkpoint-postgres`) + `interviews` table (agent-managed). Both agent and web connect to the same Neon DB.
- `interviews` table is created automatically on agent startup (`server.ts → start()`). No migrations needed.
- Web also has a Drizzle schema (`apps/web/lib/schema.ts`) with `interviews`, `subscriptions`, and `waitlist` tables.

#### `interviews` table schema

```sql
id              UUID PRIMARY KEY
user_id         TEXT        -- Clerk user ID
thread_id       TEXT UNIQUE -- LangGraph thread ID
question_title  TEXT
question_description TEXT
scores          JSONB       -- RubricScores (null while in progress)
phase_feedback  JSONB       -- PhaseFeedback[]
report_markdown TEXT
target_role     TEXT
target_company  TEXT
client_ip       TEXT
created_at      TIMESTAMPTZ
```

Row inserted at interview start (scores = null). Updated with results on completion. `scores IS NULL` = active/in-progress session.

### Auth flow

- **Clerk** handles auth for both services.
- Web: `clerkMiddleware()` in `middleware.ts` protects `/interview`, `/profile`, and `/api/*` routes.
- Agent: `clerkMiddleware()` + `requireClerkAuth` middleware verifies the Bearer JWT forwarded by Next.js. Pass publishable key explicitly since `@clerk/express` reads `CLERK_PUBLISHABLE_KEY` (not `NEXT_PUBLIC_`).
- Web → Agent auth: Next.js proxy routes call `getToken()` from `auth()` and forward `Authorization: Bearer <token>`.

### LLM strategy

```typescript
// apps/agent/src/models/index.ts
reasoningModel   // ChatDeepSeek({ model: "deepseek-v4-pro",   temperature: 0.3 }) — question generator
interviewerModel // ChatDeepSeek({ model: "deepseek-v4-flash", temperature: 0.5 }) — interviewer turns + CLI auto-candidate
judgeModel       // ChatDeepSeek({ model: "deepseek-v4-flash", temperature: 0.1 }) — near-deterministic scoring
// Local fallbacks: reasoningModelLocal, interviewerModelLocal (Ollama)
```

### The question generator node

Two-stage pipeline in `apps/agent/src/graph/nodes/question-generator.ts`:
- **Stage 1** — `reasoningModel`: analyzes resume/JD gap, produces 2 candidate questions
- **Stage 2** — `interviewerModel`: selects best candidate, structures full `QuestionConfig` + `InterviewStrategy`

Question MUST be derived from resume-JD gap — never generic.

### CLI runner (`apps/agent/src/cli.ts`)

Standalone dev tool. Compiles graph with `MemorySaver` (one-shot, no persistence). Runs a full interview with LLM-as-candidate. Not used by the web app.

## Key Types

**`packages/shared/src/index.ts`** (source of truth — imported by both agent and web):

`QuestionConfig` — generated question with `expectedClarifications`, `keyComponents`, `commonPitfalls`, `deepDiveTargets`, `whyThisQuestion`.

`InterviewStrategy` — `resumeStrengths`, `resumeGaps`, `experienceHooks`, `companyContext`, `probingStrategy`. Injected into every interviewer prompt.

`RubricScores` — 0-5 per category (`requirementsGathering`, `apiDesign`, `dataModeling`, `systemComponents`, `scalability`, `tradeoffs`, `communication`) + `overall` (0-100) + `roleReadiness` + `levelAssessment` + `gapAnalysis` + `resumeAdvice`.

`PhaseFeedback` — per-phase `score`, `strengths[]`, `gaps[]`, `specificQuotes[]`.

`Phase` — `"requirements" | "design" | "deep_dive" | "scale"`.

## Utilities

`apps/agent/utils.ts` is a barrel re-export of `src/utils/*` (backward-compat). Actual implementations:

| Function | File | Purpose |
|---|---|---|
| `invokeWithMetrics(nodeName, model, prompt)` | `src/utils/metrics.ts` | Invokes model, captures duration/token counts |
| `printSessionSummary()` | `src/utils/metrics.ts` | Prints aggregated token/duration metrics |
| `extractJson(raw)` | `src/utils/text.ts` | Strips `<think>` tags + markdown fences, extracts outermost `{...}` |
| `sanitizeUserInput(text)` | `src/utils/text.ts` | Sanitizes user-supplied text before it enters prompts |
| `stripThinkTags(raw)` | `src/utils/text.ts` | Removes `<think>...</think>` blocks |
| `slugify(text)` | `src/utils/text.ts` | `text → lowercase_underscore_slug` |
| `buildChecklist(question)` | `src/utils/checklist.ts` | Creates coverage checklist from `QuestionConfig` |
| `emptyPhaseNotes()` | `src/utils/checklist.ts` | Returns `{requirements: "", design: "", deep_dive: "", scale: ""}` |
| `routeAfterEvaluator(state)` | `src/utils/routing.ts` | Conditional edge fn — returns `"interviewer"` or `"judge"` |

`NodeMetric` type captures: `node`, `durationMs`, `inputTokens`, `cachedTokens`, `outputTokens`, `reasoningTokens`, `totalTokens`.

## Interviewer Prompt Rules

Prompt built in `interviewerNode` → `buildPrompt()`. Injects `strategy.experienceHooks`. Hard rules: never say "great point"/"that's correct", never validate, keep responses 2-4 sentences. Phase-specific instructions in `PHASE_INSTRUCTIONS` record in `interviewer.ts`.

## PDF Parsing (`apps/web/app/api/parse-pdf/route.ts`)

Uses `pdfjs-dist` v6 server-side. Requires `GlobalWorkerOptions.workerSrc` to point to the worker file — use `createRequire(import.meta.url)` to resolve the path. Empty string is treated as falsy in v6 and throws.

## Build Phases

- **Phase 1** ✅: All 8 nodes, graph assembly, CLI runner, Express server with all routes
- **Phase 2** ✅: Next.js UI (interview chat, report view, profile/history), Clerk auth, PDF upload, Postgres persistence, session restore
- **Phase 3** ✅: PostgresSaver checkpointing, judge node, report generator, structured scoring
- **Phase 4**: Polish + deploy (pricing, waitlist, fallbacks, hardening)
