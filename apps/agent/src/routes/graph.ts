import { Router } from "express";
import { Command } from "@langchain/langgraph";
import { getAuth } from "@clerk/express";
import { requireClerkAuth } from "../middleware/auth";
import { requireFields, checkLengths, toTurnResponse } from "../middleware/validation";
import { createInterview, completeInterview, threadBelongsToUser } from "../db/interviews";
import { interviewerModel } from "../models";
import { sanitizeUserInput } from "../utils/text";
import { logger } from "../utils/logger";
import type { InterviewStateType } from "../graph/state";
import type { graph } from "../graph/graph";

// The compiled graph is injected at startup via createGraphRouter().
// Using a factory keeps this module testable and avoids module-level side effects.
type CompiledGraph = ReturnType<typeof graph.compile>;

type InvokeBody = {
  threadId: string;
  resumeText: string;
  jdText: string;
  targetCompany?: string;
  targetRole?: string;
};

type ResumeBody = {
  threadId: string;
  candidateAnswer: string;
};

/**
 * Creates and returns the Express router for all /graph/* routes.
 * @param compiledGraph The compiled LangGraph instance (created after DB init).
 */
type AugmentedRequest = import("express").Request & { __effectiveUserId?: string };

/** Returns the authenticated userId from Clerk JWT or the guest ID set by requireClerkAuth. */
function effectiveUserId(req: AugmentedRequest): string {
  return getAuth(req).userId ?? req.__effectiveUserId ?? "";
}

export function createGraphRouter(compiledGraph: CompiledGraph): Router {
  const router = Router();

  // ── Start a new interview session ─────────────────────────────────────────
  router.post("/invoke", requireClerkAuth, async (req, res) => {
    const err =
      requireFields(req.body, ["threadId", "resumeText", "jdText"]) ??
      checkLengths(req.body);
    if (err) return void res.status(400).json({ error: err });

    const {
      threadId,
      resumeText,
      jdText,
      targetCompany = "",
      targetRole = "",
    } = req.body as InvokeBody;

    // Sanitize all user-supplied text before it enters graph state or prompts.
    const safeResume = sanitizeUserInput(resumeText);
    const safeJD = sanitizeUserInput(jdText);
    const safeCompany = sanitizeUserInput(targetCompany);
    const safeRole = sanitizeUserInput(targetRole);

    const log = logger.child({ route: "POST /graph/invoke", threadId });
    try {
      const uid = effectiveUserId(req);
      const clientIp = req.headers["x-client-ip"] as string | undefined;
      log.info("Starting interview session", { userId: uid, targetRole: safeRole, targetCompany: safeCompany });
      await createInterview(uid, threadId, safeRole, safeCompany, clientIp);

      const state = await compiledGraph.invoke(
        { resumeText: safeResume, jdText: safeJD, targetCompany: safeCompany, targetRole: safeRole },
        { configurable: { thread_id: threadId } },
      );

      await completeInterview(threadId, state);
      log.info("Interview session invoked successfully", { interviewComplete: state.interviewComplete });
      res.json(toTurnResponse(state));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error("Failed to invoke interview", { err: err.message, stack: err.stack });
      res.status(500).json({ error: "Interview failed to start. Please try again." });
    }
  });

  // ── Resume after a human_input interrupt ─────────────────────────────────
  router.post("/resume", requireClerkAuth, async (req, res) => {
    const err =
      requireFields(req.body, ["threadId", "candidateAnswer"]) ??
      checkLengths(req.body);
    if (err) return void res.status(400).json({ error: err });

    const { threadId, candidateAnswer } = req.body as ResumeBody;
    const safeAnswer = sanitizeUserInput(candidateAnswer);

    const log = logger.child({ route: "POST /graph/resume", threadId });
    try {
      const uid = effectiveUserId(req);
      if (!(await threadBelongsToUser(threadId, uid))) {
        log.warn("Ownership check failed on resume", { userId: uid });
        return void res.status(403).json({ error: "Forbidden" });
      }
      log.debug("Resuming interview with candidate answer", { answerLength: safeAnswer.length });
      const state = await compiledGraph.invoke(
        new Command({ resume: safeAnswer }),
        { configurable: { thread_id: threadId } },
      );

      await completeInterview(threadId, state);
      log.info("Interview resumed successfully", { phase: state.currentPhase, interviewComplete: state.interviewComplete });
      res.json(toTurnResponse(state));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error("Failed to resume interview", { err: err.message, stack: err.stack });
      res.status(500).json({ error: "Failed to process your answer. Please try again." });
    }
  });

  // ── Get full state snapshot for session restore ───────────────────────────
  // Returns enough to reconnect a live session: messages, question title, phase.
  // Excludes raw resume/JD text.
  router.get("/state/:threadId", requireClerkAuth, async (req, res) => {
    const { threadId } = req.params;

    const log = logger.child({ route: "GET /graph/state", threadId });
    try {
      const uid = effectiveUserId(req);
      if (!(await threadBelongsToUser(threadId, uid))) {
        log.warn("Ownership check failed on state fetch", { userId: uid });
        return void res.status(403).json({ error: "Forbidden" });
      }
      const snapshot = await compiledGraph.getState({
        configurable: { thread_id: threadId },
      });

      const values = snapshot.values as InterviewStateType;
      if (!values || Object.keys(values).length === 0) {
        log.warn("Session not found", { threadId });
        return void res.status(404).json({ error: "Session not found" });
      }

      log.debug("State snapshot retrieved", { phase: values.currentPhase, turnCount: values.turnCount });
      res.json({
        phase: values.currentPhase,
        turnCount: values.turnCount,
        interviewComplete: values.interviewComplete,
        question: values.question
          ? { title: values.question.title, description: values.question.description }
          : null,
        messages: values.messages,
        ...(values.interviewComplete && {
          scores: values.scores,
          phaseFeedback: values.phaseFeedback,
          reportMarkdown: values.reportMarkdown,
        }),
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error("Failed to retrieve session state", { err: err.message, stack: err.stack });
      res.status(500).json({ error: "Failed to retrieve session state." });
    }
  });

  // ── Find the most recent active session for this user ─────────────────────
  // The frontend calls this on mount to reconnect after a page reload.
  router.get("/active-session", requireClerkAuth, async (req, res) => {
    const { userId } = getAuth(req);
    const log = logger.child({ route: "GET /graph/active-session", userId: userId ?? "unknown" });
    try {
      const { getPool } = await import("../db/pool");
      const result = await getPool().query(
        `SELECT thread_id, target_role, target_company
         FROM interviews
         WHERE user_id = $1 AND scores IS NULL
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId],
      );

      if (result.rows.length === 0) {
        log.debug("No active session found");
        return void res.json({ threadId: null });
      }

      const row = result.rows[0];
      log.info("Active session found", { threadId: row.thread_id });
      res.json({
        threadId: row.thread_id,
        targetRole: row.target_role,
        targetCompany: row.target_company,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error("Failed to retrieve active session", { err: err.message, stack: err.stack });
      res.status(500).json({ error: "Failed to retrieve active session." });
    }
  });

  // ── Generate an LLM candidate answer (used for auto-testing) ─────────────
  router.post("/auto-candidate", requireClerkAuth, async (req, res) => {
    const err = requireFields(req.body, ["threadId"]);
    if (err) return void res.status(400).json({ error: err });

    const { threadId } = req.body as { threadId: string };

    const log = logger.child({ route: "POST /graph/auto-candidate", threadId });
    try {
      const uid = effectiveUserId(req);
      if (!(await threadBelongsToUser(threadId, uid))) {
        log.warn("Ownership check failed on auto-candidate", { userId: uid });
        return void res.status(403).json({ error: "Forbidden" });
      }
      const snapshot = await compiledGraph.getState({
        configurable: { thread_id: threadId },
      });
      const state = snapshot.values as InterviewStateType;
      const messages = state?.messages;

      if (!messages?.length) {
        log.warn("Auto-candidate requested but no messages found", { threadId });
        return void res.status(404).json({ error: "No active interview found for this session." });
      }

      const transcript = messages
        .map((m) =>
          m.role === "interviewer"
            ? `Interviewer: ${m.content}`
            : `You: ${m.content}`,
        )
        .join("\n");

      log.debug("Generating auto-candidate answer", { messageCount: messages.length });

      // Simulates a real (imperfect) candidate — not a model answer
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

      log.info("Auto-candidate answer generated successfully");
      res.json({ candidateAnswer });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error("Failed to generate auto-candidate answer", { err: err.message, stack: err.stack });
      res.status(500).json({ error: "Failed to generate candidate answer." });
    }
  });

  return router;
}
