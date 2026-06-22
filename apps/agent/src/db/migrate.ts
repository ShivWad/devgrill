import type pg from "pg";

export async function runMigrations(pool: pg.Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS interviews (
      id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id              TEXT        NOT NULL,
      thread_id            TEXT        NOT NULL UNIQUE,
      question_title       TEXT,
      question_description TEXT,
      scores               JSONB,
      phase_feedback       JSONB,
      report_markdown      TEXT,
      target_role          TEXT,
      target_company       TEXT,
      client_ip            TEXT,
      interview_type       TEXT        DEFAULT 'system_design',
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS interviews_user_created
      ON interviews (user_id, created_at DESC);
  `);
}
