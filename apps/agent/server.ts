import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import pg from "pg";
import { graph } from "./src/graph/graph";
import { techGraph } from "./src/graph/technical/graph";
import { setPool } from "./src/db/pool";
import { runMigrations } from "./src/db/migrate";
import { createGraphRouter } from "./src/routes/graph";
import { createTechnicalGraphRouter } from "./src/routes/technical-graph";
import { createAtsRouter } from "./src/routes/ats";
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

app.use("/ats", createAtsRouter());

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

  await runMigrations(pool);

  const compiledGraph = graph.compile({ checkpointer });
  app.use("/graph", createGraphRouter(compiledGraph));

  const compiledTechGraph = techGraph.compile({ checkpointer });
  app.use("/technical-graph", createTechnicalGraphRouter(compiledTechGraph));

  app.listen(PORT, () => {
    logger.info("Agent server started", { port: PORT });
  });
}

start().catch((err) => {
  logger.error("Failed to start server", { err: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined });
  process.exit(1);
});
