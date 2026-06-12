# Mock Interview Agent

Multi-turn AI agent that conducts **personalized** system design interviews. Upload your resume + job description → agent generates a tailored question targeting the gap between your experience and the role's requirements → realistic multi-phase interview → structured scoring with actionable feedback.

**Live at**: [interview.shivwad.in](https://interview.shivwad.in)

## Architecture

Two services:

| Service | Stack | Deploy |
|---------|-------|--------|
| `apps/web` | Next.js 15 (App Router), Tailwind, shadcn/ui, Clerk | Vercel |
| `apps/agent` | LangGraph.js, Node.js, Express | Railway |
| `packages/shared` | Shared TypeScript types | — |

```
Browser ◄──SSE──► Next.js ◄──HTTP──► LangGraph Service ◄──► DeepSeek / Claude
                                        │
                                    Postgres (Neon) + Redis (Upstash)
```

## Graph Flow

```
START → question_generator → setup → interviewer → interrupt → phase_evaluator
                                        ▲                           │
                                        └───────────────────────────┘
                                                                     ▼
                                                          judge → report → END
```

7 nodes across 4 phases: `requirements` → `design` → `deep_dive` → `scale`.

The **question generator** is the core differentiator — it analyzes resume-JD gaps and generates a unique system design question per candidate (never a static question bank).

## Getting Started

```bash
pnpm install
pnpm dev            # runs both apps
pnpm build
pnpm lint
pnpm typecheck
```

Single app:
```bash
pnpm --filter web dev
pnpm --filter agent dev
```

## Environment

Copy `.env.example` and fill in:
- `DEEPSEEK_API_KEY` / `ANTHROPIC_API_KEY` — LLM providers
- `DATABASE_URL` — Neon Postgres
- `CLERK_*` — Clerk auth
- `UPLOADTHING_*` — File uploads

## Build Phases

1. **Agent core** — question generator + LangGraph state + interview loop (terminal-testable)
2. **UI** — file upload, setup page, chat with SSE streaming
3. **Scoring** — judge node, rubric, report page
4. **Polish** — scratchpad, timer, fallbacks, deploy

## Cost

~₹5-10 per interview (1 V4-Pro call + 40-60 V4-Flash turns + 1 V4-Pro judge call).

---

*AI was used for boilerplate code, plumbing, comments, and test scaffolding during development.*
