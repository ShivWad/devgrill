import { getPool } from "./pool";
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
  try {
    await getPool().query(
      `INSERT INTO interviews (user_id, thread_id, target_role, target_company, client_ip)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (thread_id) DO NOTHING`,
      [userId, threadId, targetRole || null, targetCompany || null, clientIp ?? null],
    );
  } catch (err) {
    console.error("createInterview failed:", err);
  }
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
  } catch (err) {
    console.error("completeInterview failed:", err);
  }
}
