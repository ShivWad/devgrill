import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { clerkMiddleware, getAuth } from "@clerk/express";
import { Command } from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import pg from "pg";
import { graph } from "./src/graph/graph";
import { interviewerModel } from "./src/models";
import type { InterviewStateType } from "./src/graph/state";

// Populated in start() after checkpointer.setup() resolves.
// eslint-disable-next-line prefer-const
let compiledGraph: ReturnType<typeof graph.compile>;
let appPool: pg.Pool;

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

// ── CORS ──────────────────────────────────────────────────────────────────────
// ALLOWED_ORIGIN is a single origin or comma-separated list.
// Set to the Vercel production URL in Railway env vars.

const rawOrigin = process.env.ALLOWED_ORIGIN ?? "http://localhost:3000";
const allowedOrigins = rawOrigin.split(",").map((o) => o.trim());

app.use(
  cors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: "3mb" }));

// Verifies the Clerk JWT from the Authorization: Bearer header.
// @clerk/express reads CLERK_PUBLISHABLE_KEY; fall back to the Next.js
// NEXT_PUBLIC_ variant so both services can share one .env file.
app.use(clerkMiddleware({
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
}));

// ── Auth guard ────────────────────────────────────────────────────────────────

function requireClerkAuth(req: Request, res: Response, next: NextFunction) {
  const { userId } = getAuth(req);
  if (!userId) return void res.status(401).json({ error: "Unauthorized" });
  next();
}


// ── Response shape ────────────────────────────────────────────────────────────
// Only what the frontend actually needs per turn. Raw text fields (resume, JD,
// checklist internals) are never sent to the client.

function toTurnResponse(state: InterviewStateType) {
  const firstMsg = state.messages[0];
  const openingMessage =
    firstMsg?.role === "interviewer" ? firstMsg.content : null;

  const lastMsg = state.messages.at(-1);
  const interviewerMessage =
    lastMsg?.role === "interviewer" && lastMsg !== firstMsg
      ? lastMsg.content
      : null;

  const base = {
    phase: state.currentPhase,
    turnCount: state.turnCount,
    openingMessage,
    interviewerMessage,
    interviewComplete: state.interviewComplete,
    questionTitle: state.question?.title ?? null,
  };

  if (!state.interviewComplete) return base;

  return {
    ...base,
    scores: state.scores,
    phaseFeedback: state.phaseFeedback,
    reportMarkdown: state.reportMarkdown,
  };
}

// ── Validation helpers ────────────────────────────────────────────────────────

const MAX_RESUME_CHARS = 50_000;
const MAX_JD_CHARS = 20_000;
const MAX_CANDIDATE_ANSWER_CHARS = 10_000;

function requireFields(
  body: Record<string, unknown>,
  fields: string[]
): string | null {
  const missing = fields.filter((f) => !body[f] || body[f] === "");
  return missing.length ? `Missing required fields: ${missing.join(", ")}` : null;
}

function checkLengths(body: Record<string, unknown>): string | null {
  if (typeof body.resumeText === "string" && body.resumeText.length > MAX_RESUME_CHARS)
    return `resumeText exceeds ${MAX_RESUME_CHARS} character limit`;
  if (typeof body.jdText === "string" && body.jdText.length > MAX_JD_CHARS)
    return `jdText exceeds ${MAX_JD_CHARS} character limit`;
  if (typeof body.candidateAnswer === "string" && body.candidateAnswer.length > MAX_CANDIDATE_ANSWER_CHARS)
    return `candidateAnswer exceeds ${MAX_CANDIDATE_ANSWER_CHARS} character limit`;
  return null;
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// ── Interview persistence ─────────────────────────────────────────────────────

async function createInterview(userId: string, threadId: string, targetRole: string, targetCompany: string) {
  try {
    await appPool.query(
      `INSERT INTO interviews (user_id, thread_id, target_role, target_company)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (thread_id) DO NOTHING`,
      [userId, threadId, targetRole || null, targetCompany || null]
    );
  } catch (err) {
    console.error("createInterview failed:", err);
  }
}

async function completeInterview(threadId: string, state: InterviewStateType) {
  if (!state.interviewComplete) return;
  try {
    await appPool.query(
      `UPDATE interviews
       SET question_title = $2, question_description = $3,
           scores = $4, phase_feedback = $5, report_markdown = $6
       WHERE thread_id = $1`,
      [
        threadId,
        state.question?.title ?? null,
        state.question?.description ?? null,
        state.scores ? JSON.stringify(state.scores) : null,
        state.phaseFeedback ? JSON.stringify(state.phaseFeedback) : null,
        state.reportMarkdown ?? null,
      ]
    );
  } catch (err) {
    console.error("completeInterview failed:", err);
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

type InvokeBody = {
  threadId: string;
  resumeText: string;
  jdText: string;
  targetCompany?: string;
  targetRole?: string;
};

app.post("/graph/invoke", requireClerkAuth, async (req, res) => {
  const err = requireFields(req.body, ["threadId", "resumeText", "jdText"]) ?? checkLengths(req.body);
  if (err) return void res.status(400).json({ error: err });

  try {
    const { threadId, resumeText, jdText, targetCompany = "", targetRole = "" } =
      req.body as InvokeBody;

    const { userId } = getAuth(req);
    await createInterview(userId!, threadId, targetRole, targetCompany);

    const state = await compiledGraph.invoke(
      { resumeText, jdText, targetCompany, targetRole },
      { configurable: { thread_id: threadId } }
    );

    await completeInterview(threadId, state);
    res.json(toTurnResponse(state));
  } catch (error) {
    console.error("/graph/invoke error:", error);
    res.status(500).json({ error: String(error) });
  }
});

type ResumeBody = {
  threadId: string;
  candidateAnswer: string;
};

app.post("/graph/resume", requireClerkAuth, async (req, res) => {
  const err = requireFields(req.body, ["threadId", "candidateAnswer"]) ?? checkLengths(req.body);
  if (err) return void res.status(400).json({ error: err });

  const { threadId, candidateAnswer } = req.body as ResumeBody;

  try {
    const state = await compiledGraph.invoke(
      new Command({ resume: candidateAnswer }),
      { configurable: { thread_id: threadId } }
    );

    await completeInterview(threadId, state);
    res.json(toTurnResponse(state));
  } catch (error) {
    console.error("/graph/resume error:", error);
    res.status(500).json({ error: String(error) });
  }
});

// Returns enough state to reconnect a live session (messages for transcript,
// question title for display). Still excludes raw resume/JD text.
app.get("/graph/state/:threadId", requireClerkAuth, async (req, res) => {
  const { threadId } = req.params;

  try {
    const snapshot = await compiledGraph.getState({
      configurable: { thread_id: threadId },
    });

    if (!snapshot.values || Object.keys(snapshot.values).length === 0) {
      return void res.status(404).json({ error: "Session not found" });
    }

    const s = snapshot.values as InterviewStateType;
    res.json({
      phase: s.currentPhase,
      turnCount: s.turnCount,
      interviewComplete: s.interviewComplete,
      question: s.question
        ? { title: s.question.title, description: s.question.description }
        : null,
      messages: s.messages,
      ...(s.interviewComplete && {
        scores: s.scores,
        phaseFeedback: s.phaseFeedback,
        reportMarkdown: s.reportMarkdown,
      }),
    });
  } catch (error) {
    console.error("/graph/state error:", error);
    res.status(500).json({ error: String(error) });
  }
});

// Returns the most recent incomplete interview thread for the authenticated user.
// The frontend calls this on mount to reconnect after a page reload.
app.get("/graph/active-session", requireClerkAuth, async (req, res) => {
  const { userId } = getAuth(req);
  try {
    const result = await appPool.query(
      `SELECT thread_id, target_role, target_company
       FROM interviews
       WHERE user_id = $1 AND scores IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );
    if (result.rows.length === 0) return void res.json({ threadId: null });
    const row = result.rows[0];
    res.json({ threadId: row.thread_id, targetRole: row.target_role, targetCompany: row.target_company });
  } catch (error) {
    console.error("/graph/active-session error:", error);
    res.status(500).json({ error: String(error) });
  }
});

app.post("/graph/auto-candidate", requireClerkAuth, async (req, res) => {
  const err = requireFields(req.body, ["threadId"]);
  if (err) return void res.status(400).json({ error: err });

  const { threadId } = req.body as { threadId: string };

  try {
    const snapshot = await compiledGraph.getState({
      configurable: { thread_id: threadId },
    });
    const state = snapshot.values as InterviewStateType;

    const transcript = state.messages
      .map((m) =>
        m.role === "interviewer"
          ? `Interviewer: ${m.content}`
          : `You: ${m.content}`,
      )
      .join("\n");

    const candidateRes = await interviewerModel.invoke(`
You are a software engineer being interviewed for a ${state.targetRole || "Software Engineer"} role${state.targetCompany ? ` at ${state.targetCompany}` : ""}.
You are NOT perfect — you know your stuff but occasionally miss edge cases or make reasonable assumptions the interviewer might challenge.
Answer naturally, like a real candidate, not like a textbook. Keep answers to 3-6 sentences unless the question genuinely needs more detail.
You MUST respond with at least one sentence. Never return an empty response.

CONVERSATION SO FAR:
${transcript}

Respond to the interviewer's last message as the candidate. Respond ONLY with what you would say out loud — no labels, no "Candidate:", no preamble.
`.trim());

    const candidateAnswer =
      (candidateRes.content as string).trim() ||
      "Could you clarify what you're looking for?";

    res.json({ candidateAnswer });
  } catch (error) {
    console.error("/graph/auto-candidate error:", error);
    res.status(500).json({ error: String(error) });
  }
});

// ── Startup ───────────────────────────────────────────────────────────────────

async function start() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL is required");

  const checkpointer = PostgresSaver.fromConnString(dbUrl);
  await checkpointer.setup();

  appPool = new pg.Pool({ connectionString: dbUrl });
  await appPool.query(`
    CREATE TABLE IF NOT EXISTS interviews (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     TEXT        NOT NULL,
      thread_id   TEXT        NOT NULL UNIQUE,
      question_title       TEXT,
      question_description TEXT,
      scores               JSONB,
      phase_feedback       JSONB,
      report_markdown      TEXT,
      target_role          TEXT,
      target_company       TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS interviews_user_created
      ON interviews (user_id, created_at DESC);
  `);

  compiledGraph = graph.compile({ checkpointer });

  app.listen(PORT, () => {
    console.log(`Agent server running at http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
