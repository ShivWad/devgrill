import { Router } from "express";
import { Command } from "@langchain/langgraph";
import { getAuth } from "@clerk/express";
import { requireClerkAuth } from "../middleware/auth";
import { requireFields, checkLengths } from "../middleware/validation";
import { createInterview, completeInterview, threadBelongsToUser } from "../db/interviews";
import { interviewerModel } from "../models";
import { sanitizeUserInput } from "../utils/text";
import { logger } from "../utils/logger";
import type { TechInterviewStateType } from "../graph/technical/state";
import type { techGraph } from "../graph/technical/graph";

type CompiledTechGraph = ReturnType<typeof techGraph.compile>;
type AugmentedRequest = import("express").Request & { __effectiveUserId?: string };

function effectiveUserId(req: AugmentedRequest): string {
  return getAuth(req).userId ?? req.__effectiveUserId ?? "";
}

function toTechTurnResponse(state: TechInterviewStateType) {
  const firstMsg = state.messages[0];
  const openingMessage = firstMsg?.role === "interviewer" ? firstMsg.content : null;

  const lastMsg = state.messages.at(-1);
  const interviewerMessage =
    lastMsg?.role === "interviewer" && lastMsg !== firstMsg ? lastMsg.content : null;

  const base = {
    phase: state.currentPhase,
    turnCount: state.turnCount,
    openingMessage,
    interviewerMessage,
    interviewComplete: state.interviewComplete,
    questionTitle: state.question?.title ?? null,
    interviewType: "technical" as const,
  };

  if (!state.interviewComplete) return base;

  return {
    ...base,
    scores: state.scores,
    phaseFeedback: state.phaseFeedback,
    reportMarkdown: state.reportMarkdown,
  };
}

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

export function createTechnicalGraphRouter(compiledGraph: CompiledTechGraph): Router {
  const router = Router();

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

    const safeResume = sanitizeUserInput(resumeText);
    const safeJD = sanitizeUserInput(jdText);
    const safeCompany = sanitizeUserInput(targetCompany);
    const safeRole = sanitizeUserInput(targetRole);

    const log = logger.child({ route: "POST /technical-graph/invoke", threadId });
    try {
      const uid = effectiveUserId(req);
      const clientIp = req.headers["x-client-ip"] as string | undefined;
      log.info("Starting technical interview session", { userId: uid, targetRole: safeRole });
      await createInterview(uid, threadId, safeRole, safeCompany, clientIp, "technical");

      const state = await compiledGraph.invoke(
        { resumeText: safeResume, jdText: safeJD, targetCompany: safeCompany, targetRole: safeRole },
        { configurable: { thread_id: threadId } },
      );

      await completeInterview(threadId, state);
      log.info("Technical interview session invoked successfully");
      res.json(toTechTurnResponse(state));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error("Failed to invoke technical interview", { err: err.message, stack: err.stack });
      res.status(500).json({ error: "Interview failed to start. Please try again." });
    }
  });

  router.post("/resume", requireClerkAuth, async (req, res) => {
    const err =
      requireFields(req.body, ["threadId", "candidateAnswer"]) ??
      checkLengths(req.body);
    if (err) return void res.status(400).json({ error: err });

    const { threadId, candidateAnswer } = req.body as ResumeBody;
    const safeAnswer = sanitizeUserInput(candidateAnswer);

    const log = logger.child({ route: "POST /technical-graph/resume", threadId });
    try {
      const uid = effectiveUserId(req);
      if (!(await threadBelongsToUser(threadId, uid))) {
        log.warn("Ownership check failed on tech resume", { userId: uid });
        return void res.status(403).json({ error: "Forbidden" });
      }
      const state = await compiledGraph.invoke(
        new Command({ resume: safeAnswer }),
        { configurable: { thread_id: threadId } },
      );

      await completeInterview(threadId, state);
      log.info("Technical interview resumed successfully", { phase: state.currentPhase });
      res.json(toTechTurnResponse(state));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error("Failed to resume technical interview", { err: err.message, stack: err.stack });
      res.status(500).json({ error: "Failed to process your answer. Please try again." });
    }
  });

  router.get("/state/:threadId", requireClerkAuth, async (req, res) => {
    const { threadId } = req.params;

    const log = logger.child({ route: "GET /technical-graph/state", threadId });
    try {
      const uid = effectiveUserId(req);
      if (!(await threadBelongsToUser(threadId, uid))) {
        log.warn("Ownership check failed on tech state fetch", { userId: uid });
        return void res.status(403).json({ error: "Forbidden" });
      }
      const snapshot = await compiledGraph.getState({
        configurable: { thread_id: threadId },
      });

      const values = snapshot.values as TechInterviewStateType;
      if (!values || Object.keys(values).length === 0) {
        return void res.status(404).json({ error: "Session not found" });
      }

      res.json({
        phase: values.currentPhase,
        turnCount: values.turnCount,
        interviewComplete: values.interviewComplete,
        question: values.question
          ? { title: values.question.title, description: values.question.description }
          : null,
        messages: values.messages,
        interviewType: "technical",
        ...(values.interviewComplete && {
          scores: values.scores,
          phaseFeedback: values.phaseFeedback,
          reportMarkdown: values.reportMarkdown,
        }),
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error("Failed to retrieve technical session state", { err: err.message, stack: err.stack });
      res.status(500).json({ error: "Failed to retrieve session state." });
    }
  });

  router.post("/auto-candidate", requireClerkAuth, async (req, res) => {
    const err = requireFields(req.body, ["threadId"]);
    if (err) return void res.status(400).json({ error: err });

    const { threadId } = req.body as { threadId: string };

    const log = logger.child({ route: "POST /technical-graph/auto-candidate", threadId });
    try {
      const uid = effectiveUserId(req);
      if (!(await threadBelongsToUser(threadId, uid))) {
        return void res.status(403).json({ error: "Forbidden" });
      }
      const snapshot = await compiledGraph.getState({
        configurable: { thread_id: threadId },
      });
      const state = snapshot.values as TechInterviewStateType;
      const messages = state?.messages;

      if (!messages?.length) {
        return void res.status(404).json({ error: "No active interview found for this session." });
      }

      const transcript = messages
        .map((m) =>
          m.role === "interviewer"
            ? `Interviewer: ${m.content}`
            : `You: ${m.content}`,
        )
        .join("\n");

      const candidateRes = await interviewerModel.invoke(`
You are a software engineer being interviewed for a ${state.targetRole || "Software Engineer"} role${state.targetCompany ? ` at ${state.targetCompany}` : ""}.
This is a TECHNICAL interview — not a system design interview. Questions are about language internals, CS fundamentals, OOP, coding.
You are NOT perfect — you know your stuff but occasionally miss edge cases or use imprecise terminology.
Answer naturally, like a real candidate. Keep answers to 3-6 sentences unless the question genuinely needs more.
You MUST respond with at least one sentence. Never return an empty response.

CONVERSATION SO FAR:
${transcript}

Respond to the interviewer's last message as the candidate. ONLY what you would say out loud — no labels, no preamble.
`.trim());

      const candidateAnswer =
        (candidateRes.content as string).trim() ||
        "Could you clarify what you're looking for?";

      log.info("Tech auto-candidate answer generated");
      res.json({ candidateAnswer });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error("Failed to generate tech auto-candidate answer", { err: err.message, stack: err.stack });
      res.status(500).json({ error: "Failed to generate candidate answer." });
    }
  });

  return router;
}
