# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Turborepo monorepo for a mock system design interview agent. Two deployable services:

- `apps/web` — Next.js 15 (App Router, TypeScript) on Vercel
- `apps/agent` — LangGraph.js service (Node.js + Express) on Railway
- `packages/shared` — Shared TypeScript types (`QuestionConfig`, `InterviewStrategy`, `InterviewState`, etc.)

## Commands

```bash
# Root
pnpm install
pnpm dev            # all apps
pnpm build
pnpm lint
pnpm typecheck

# Single app
pnpm --filter web dev
pnpm --filter agent dev

# DB migrations (Drizzle, from apps/web)
pnpm --filter web db:push
pnpm --filter web db:generate
pnpm --filter web db:migrate
```

## Architecture

### Two-service split

Next.js handles auth (Clerk), file uploads (Uploadthing), DB reads, and SSE streaming to the browser. It proxies interview operations to the LangGraph service via HTTP. The agent service owns all graph state, LLM calls, and Postgres checkpointing.

Frontend communicates via SSE for streaming responses. `/api/interview/start` and `/api/interview/[id]/message` are SSE routes that forward to the agent service and pipe back the stream.

### LangGraph graph flow

```
START → question_generator → setup → interviewer → interrupt → phase_evaluator
                                        ▲                            │
                                        │    (stay / advance)        │
                                        └────────────────────────────┘
                                                                     │ (all phases done)
                                                                     ▼
                                                          judge → report → END
```

7 nodes: `question_generator`, `setup`, `interviewer`, `interrupt`, `phase_evaluator`, `judge`, `report_generator`.

State lives in `apps/agent/src/graph/state.ts` as a `LangGraph Annotation.Root`. The `messages` and `phaseFeedback` arrays use append reducers; all other fields use replace reducers.

Interview has 4 phases: `requirements` → `design` → `deep_dive` → `scale`. Phase transitions are controlled by `phase_evaluator` which returns `stay`, `advance`, or `end`.

### LLM strategy

```typescript
// apps/agent/src/models/index.ts
reasoningModel  = deepseekPro.withFallbacks([haikuFallback])   // question_generator + judge
interviewerModel = deepseekFlash.withFallbacks([haikuFallback]) // interviewer node
```

DeepSeek is accessed via OpenAI-compatible SDK (`ChatOpenAI` with custom `baseURL`). Haiku fallback uses `ChatAnthropic`. Model IDs: `deepseek-v4-pro`, `deepseek-v4-flash`, `claude-haiku-4-5-20251001`.

### The question generator node

This is the core differentiator. It receives `resumeText + jdText + targetCompany + targetRole`, runs a single V4-Pro call, and outputs both `QuestionConfig` and `InterviewStrategy` as structured JSON. The question MUST be derived from the resume-JD gap — never generic. Prompt lives in `apps/agent/src/graph/prompts/question-generator.ts`.

### State persistence

- **Postgres (Neon)** — LangGraph checkpoints (via `@langchain/langgraph-checkpoint-postgres`), users, sessions, scores tables. Drizzle ORM in `apps/web/drizzle/`.
- **Redis (Upstash)** — Active interview state cache for fast reads during the chat.
- Clerk webhook at `/api/webhooks/clerk` syncs users into the `users` table.

## Key Types (packages/shared/types.ts)

`QuestionConfig` — generated question with `expectedClarifications`, `keyComponents`, `commonPitfalls`, `deepDiveTargets`, and crucially `whyThisQuestion`.

`InterviewStrategy` — `resumeStrengths`, `resumeGaps`, `experienceHooks`, `companyContext`, `probingStrategy`. These are injected into every interviewer prompt.

`RubricScores` — 0-5 per category + 0-100 overall + `roleReadiness` + `levelAssessment`.

## Interviewer Prompt Rules

The shared skeleton in `prompts/skeleton.ts` injects `strategy.experienceHooks` so the interviewer references the candidate's resume naturally. Hard rules: never say "great point"/"that's correct", never validate, keep responses 2-4 sentences. Phase-specific prompts override the `PHASE:` section only.

## Agent Service Routes

Internal only (Next.js calls these, not the browser):

- `POST /graph/invoke` — start graph (triggers question generation)
- `POST /graph/resume` — resume after `interrupt()`
- `GET /graph/state/:threadId` — current state
- `GET /health`

## Build Phases

Current plan: Phase 1 = agent core + question generator (terminal testable). Phase 2 = UI + file upload. Phase 3 = scoring + reports. Phase 4 = polish + deploy. Start by testing the question generator node in isolation with hardcoded resume/JD before building any UI.
