import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import pg from "pg";
import { graph } from "./src/graph/graph";
import { setPool } from "./src/db/pool";
import { createGraphRouter } from "./src/routes/graph";
import { logger } from "./src/utils/logger";

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
  }),
);

app.use(express.json({ limit: "3mb" }));

// Verifies the Clerk JWT from the Authorization: Bearer header.
// @clerk/express reads CLERK_PUBLISHABLE_KEY; fall back to the Next.js
// NEXT_PUBLIC_ variant so both services can share one .env file.
app.use(
  clerkMiddleware({
    publishableKey:
      process.env.CLERK_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  }),
);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// ── Startup ───────────────────────────────────────────────────────────────────

async function start() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL is required");

  // Initialize checkpointer (LangGraph state persistence)
  const checkpointer = PostgresSaver.fromConnString(dbUrl);
  await checkpointer.setup();

  // Initialize the shared DB pool used by interview CRUD operations
  const pool = new pg.Pool({ connectionString: dbUrl });
  setPool(pool);

  await pool.query(`
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
      client_ip            TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS interviews_user_created
      ON interviews (user_id, created_at DESC);
  `);
  // Idempotent migration for existing deployments
  await pool.query(`ALTER TABLE interviews ADD COLUMN IF NOT EXISTS client_ip TEXT;`);

  const compiledGraph = graph.compile({ checkpointer });
  app.use("/graph", createGraphRouter(compiledGraph));

  app.listen(PORT, () => {
    logger.info("Agent server started", { port: PORT });
  });
}

start().catch((err) => {
  logger.error("Failed to start server", { err: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined });
  process.exit(1);
});
