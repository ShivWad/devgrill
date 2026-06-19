import { getPool } from "./pool";
import { logger } from "../utils/logger";
import type { InterviewStateType } from "../graph/state";

/**
 * Inserts a new interview row when a session starts.
 * Uses ON CONFLICT DO NOTHING so retrying an interrupted request is safe.
 */
export async function createInterview(
  userId: string,
  threadId: string,
  targetRole: string,
  targetCompany: string,
  clientIp?: string,
) {
  const log = logger.child({ fn: "createInterview", threadId, userId });
  try {
    await getPool().query(
      `INSERT INTO interviews (user_id, thread_id, target_role, target_company, client_ip)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (thread_id) DO NOTHING`,
      [userId, threadId, targetRole || null, targetCompany || null, clientIp ?? null],
    );
    log.info("Interview row created");
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    log.error("DB insert failed for createInterview", { err: error.message, stack: error.stack });
  }
}

/**
 * Returns true if the thread belongs to the given user. Returns false if not
 * found or owned by someone else. Used to gate state/resume/auto-candidate.
 */
export async function threadBelongsToUser(
  threadId: string,
  userId: string,
): Promise<boolean> {
  const result = await getPool().query(
    `SELECT 1 FROM interviews WHERE thread_id = $1 AND user_id = $2 LIMIT 1`,
    [threadId, userId],
  );
  return result.rowCount > 0;
}

/**
 * Updates the interview row with scores and report once all phases complete.
 * No-ops if the interview is not yet complete.
 */
export async function completeInterview(
  threadId: string,
  state: InterviewStateType,
) {
  if (!state.interviewComplete) return;
  const log = logger.child({ fn: "completeInterview", threadId });
  try {
    await getPool().query(
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
      ],
    );
    log.info("Interview row completed with scores and report");
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    log.error("DB update failed for completeInterview", { err: error.message, stack: error.stack });
  }
}
