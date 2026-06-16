# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Turborepo monorepo for a mock system design interview agent. Two deployable services:

- `apps/web` — Next.js 15 (App Router, TypeScript) on Vercel (**stub — scripts are `echo TODO`**)
- `apps/agent` — LangGraph.js service (Node.js + Express) on Railway (**active development**)
- `packages/shared` — Shared types package (**currently empty** — types live in `apps/agent/src/graph/state.ts`)

## Commands

```bash
# Root
pnpm install
pnpm build
pnpm lint
pnpm typecheck

# Agent service (the only runnable app right now)
cd apps/agent && tsx src/server.ts       # start server (when wired)
cd apps/agent && tsx src/cli.ts          # run full interview end-to-end (auto-candidate via LLM)

# Manual tests — no jest/vitest, run these directly
cd apps/agent && tsx src/test-deepseek.ts          # verify model connectivity
cd apps/agent && tsx src/test-generateQuestion.ts  # isolated question generator
cd apps/agent && tsx src/test-setup.ts             # setup node + opening message
cd apps/agent && tsx src/test-interviewer.ts       # interviewer across all phases
cd apps/agent && tsx src/test-jude.ts              # judge node

# DB migrations (Drizzle, from apps/web — future)
pnpm --filter web db:push
pnpm --filter web db:generate
pnpm --filter web db:migrate
```

**Env**: Copy `.env.example` → `.env` at root. Agent needs at minimum `DEEPSEEK_API_KEY` and `ANTHROPIC_API_KEY`.

## Architecture

### Two-service split

Next.js handles auth (Clerk), file uploads (Uploadthing), DB reads, and SSE streaming to the browser. It proxies interview operations to the LangGraph service via HTTP. The agent service owns all graph state, LLM calls, and Postgres checkpointing.

Frontend communicates via SSE. `/api/interview/start` and `/api/interview/[id]/message` are planned SSE routes that will forward to the agent service.

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

8 nodes total. **Implementation status:**
- ✅ `question_generator` (`apps/agent/src/graph/nodes/question-generator.ts`)
- ✅ `setup` (`apps/agent/src/graph/nodes/setup.ts`)
- ✅ `interviewer` (`apps/agent/src/graph/nodes/interviewer.ts`)
- ✅ `human_input` (`apps/agent/src/graph/nodes/human-input.ts`) — calls `interrupt()`, collects candidate response
- ✅ `phase_evaluator` (`apps/agent/src/graph/nodes/phase-evaluator.ts`) — deterministic turn-count logic; LLM coverage check is TODO
- ✅ `judge` (`apps/agent/src/graph/nodes/judge.ts`) — `judgeModel` scores 7 rubric categories + per-phase feedback
- ✅ `report_generator` (`apps/agent/src/graph/nodes/report-generator.ts`) — pure formatting, no LLM, produces markdown report
- ✅ Graph assembly (`apps/agent/src/graph/graph.ts`) — StateGraph compiled with `MemorySaver` checkpointer

State lives in `apps/agent/src/graph/state.ts` as `LangGraph Annotation.Root`. `messages` and `phaseFeedback` use append reducers; all other fields use replace reducers.

Interview has 4 phases: `requirements` → `design` → `deep_dive` → `scale`. Phase transitions return `stay`, `advance`, or `end`.

### LLM strategy

```typescript
// apps/agent/src/models/index.ts
reasoningModel   // ChatDeepSeek({ model: "deepseek-v4-pro",   temperature: 0.3 }) — question generator
interviewerModel // ChatDeepSeek({ model: "deepseek-v4-flash", temperature: 0.5 }) — interviewer turns + CLI auto-candidate
judgeModel       // ChatDeepSeek({ model: "deepseek-v4-flash", temperature: 0.1 }) — near-deterministic scoring
// Local fallbacks also exported: reasoningModelLocal, interviewerModelLocal (Ollama)
```

DeepSeek via `@langchain/deepseek`. No `.withFallbacks()` wired yet — Haiku fallback is planned.

### The question generator node

Two-stage pipeline in `apps/agent/src/graph/nodes/question-generator.ts`:
- **Stage 1** — `reasoningModel` (deepseek-v4-pro): analyzes resume/JD gap, produces 2 candidate questions
- **Stage 2** — `interviewerModel` (deepseek-v4-flash): selects best candidate, structures full `QuestionConfig` + `InterviewStrategy`

Question MUST be derived from resume-JD gap — never generic. Prompts are inline in the same file (not in a separate prompts dir).

### State persistence (planned)

- **Postgres (Neon)** — LangGraph checkpoints (`@langchain/langgraph-checkpoint-postgres`), users, sessions, scores. Drizzle ORM in `apps/web/drizzle/`.
- **Redis (Upstash)** — Active interview state cache.
- Clerk webhook at `/api/webhooks/clerk` syncs users into `users` table.

## Key Types (`apps/agent/src/graph/state.ts`)

`QuestionConfig` — generated question with `expectedClarifications`, `keyComponents`, `commonPitfalls`, `deepDiveTargets`, `whyThisQuestion`.

`InterviewStrategy` — `resumeStrengths`, `resumeGaps`, `experienceHooks`, `companyContext`, `probingStrategy`. Injected into every interviewer prompt.

`RubricScores` — 0-5 per category + 0-100 overall + `roleReadiness` + `levelAssessment` + `gapAnalysis` + `resumeAdvice`.

`PhaseFeedback` — per-phase `score`, `strengths[]`, `gaps[]`, `specificQuotes[]`.

`Phase` — `"requirements" | "design" | "deep_dive" | "scale"`.

## Utilities (`apps/agent/utils.ts`)

Key exports used across nodes and tests:

| Function | Purpose |
|---|---|
| `invokeWithMetrics(nodeName, model, prompt)` | Invokes model, captures duration/token counts (input, output, reasoning, cached) |
| `extractJson(raw)` | Strips `<think>` tags + markdown fences, extracts outermost `{...}` |
| `buildChecklist(question)` | Creates coverage checklist from `QuestionConfig` with phase prefixes (`req:*`, `design:*`, `deep:*`, `scale:*`) |
| `stripThinkTags(raw)` | Removes `<think>...</think>` blocks |
| `slugify(text)` | `text → lowercase_underscore_slug` for checklist keys |
| `emptyPhaseNotes()` | Returns `{requirements: "", design: "", deep_dive: "", scale: ""}` |
| `routeAfterEvaluator(state)` | Conditional edge fn — returns `"interviewer"` or `"judge"` based on `interviewComplete` |
| `printSessionSummary()` | Prints aggregated token/duration metrics for all nodes in the session |

`NodeMetric` type captures: `node`, `durationMs`, `inputTokens`, `cachedTokens`, `outputTokens`, `reasoningTokens`, `totalTokens`.

## Interviewer Prompt Rules

Prompt built in `interviewerNode` → `buildPrompt()`. Injects `strategy.experienceHooks` so interviewer references candidate's resume naturally. Hard rules: never say "great point"/"that's correct", never validate, keep responses 2-4 sentences. Phase-specific instructions live in `PHASE_INSTRUCTIONS` record in `interviewer.ts`.

## Agent Service Routes (planned)

Internal only (Next.js calls these, not the browser):

- `POST /graph/invoke` — start graph (triggers question generation)
- `POST /graph/resume` — resume after `interrupt()`
- `GET /graph/state/:threadId` — current state
- `GET /health`

## Test Fixtures (`apps/agent/fixtures/`)

- `resume.txt`, `jd.txt` — sample candidate resume and job description
- `question.ts` — exports `questionFixture` (QuestionConfig) and `strategyFixture` (InterviewStrategy) for use in manual tests

## Build Phases

- **Phase 1** ✅: All 8 nodes implemented, graph assembled, CLI runner working (`src/cli.ts`)
- **Phase 1 remaining**: Express server routes (`POST /graph/invoke`, `POST /graph/resume`, etc.), LLM-based phase evaluator coverage check
- **Phase 2**: UI + file upload (Next.js)
- **Phase 3**: Postgres checkpointing swap (replace `MemorySaver` with `@langchain/langgraph-checkpoint-postgres`)
- **Phase 4**: polish + deploy
