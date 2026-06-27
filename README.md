# DevGrill

Multi-turn AI agent that conducts **personalized** technical and system design interviews. Upload your resume + job description → agent generates a tailored question targeting the gap between your experience and the role's requirements → realistic multi-phase interview → structured scoring and actionable feedback.

**Live at**: [grill.shivwad.in](https://grill.shivwad.in)

## Architecture

Two services:

| Service | Stack | Deploy |
|---------|-------|--------|
| `apps/web` | Next.js 15 (App Router), Clerk auth, Neon Postgres | Vercel |
| `apps/agent` | LangGraph.js, Node.js, Express, Neon Postgres | Railway |

```
Browser ──HTTP──► Next.js API routes ──HTTP + Bearer JWT──► LangGraph Agent ──► DeepSeek
                       │                                          │
                  Clerk (auth)                           Postgres (Neon)
                  Neon (profile reads)                   LangGraph checkpoints
                                                         interviews table
```

## Graph Flow

```
START → question_generator → setup → interviewer → human_input → phase_evaluator
                                        ▲                               │
                                        └───────────────────────────────┘
                                                                        │ (all phases done)
                                                                        ▼
                                                             judge → report_generator → END
```

8 nodes across 4 phases: `requirements` → `design` → `deep_dive` → `scale`.

The **question generator** analyzes resume-JD gaps and generates a unique question per candidate — never a static bank.

## Getting Started

```bash
pnpm install
```

Each app has its own `.env` file. Copy `.env.example` and fill in keys for both `apps/agent/.env` and `apps/web/.env`.

```bash
# Start agent (port 3001)
cd apps/agent && tsx server.ts

# Start web (port 3000)
cd apps/web && pnpm dev
```

## Environment

| Key | Where | Purpose |
|-----|-------|---------|
| `DEEPSEEK_API_KEY` | agent | LLM calls |
| `ANTHROPIC_API_KEY` | agent | fallback LLM |
| `DATABASE_URL` | agent + web | Neon Postgres |
| `CLERK_SECRET_KEY` | agent + web | JWT verification |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | agent + web | Clerk client key |
| `AGENT_URL` | web | Agent service URL |

## Key Features

- **Two interview types** — System Design (4-phase: requirements → design → deep dive → scale) and Technical (language internals, OOP, CS fundamentals, coding)
- **Personalized questions** — resume-JD gap analysis, never generic
- **Guest trial** — 2 free interviews before sign-up gate
- **Postgres-backed sessions** — interviews survive page reloads and server restarts
- **Session restore** — `/profile` shows active sessions; Continue picks up exactly where you left off
- **Structured report** — per-category rubric scores, phase breakdown, gap analysis, resume advice
- **Auto-candidate mode** — LLM plays the candidate for end-to-end frontend testing
- **Clerk auth** — all routes protected; JWT forwarded from Next.js to agent

## Cost

~₹5–10 per interview (1 V4-Pro reasoning call + ~40–60 V4-Flash turns + 1 V4-Flash judge call).

---

*AI-assisted development. Boilerplate, plumbing, and scaffolding generated with Claude Code.*
