import { Router } from "express";
import { requireClerkAuth } from "../middleware/auth";
import { analyzeResume } from "../ats/analyze";
import { sanitizeUserInput } from "../utils/text";
import { logger } from "../utils/logger";

const MAX_RESUME_CHARS = 50_000;
const MAX_JD_CHARS = 20_000;

export function createAtsRouter(): Router {
  const router = Router();

  router.post("/analyze", requireClerkAuth, async (req, res) => {
    const { resumeText, jdText } = req.body;

    if (!resumeText || typeof resumeText !== "string" || !resumeText.trim()) {
      return void res.status(400).json({ error: "resumeText is required" });
    }
    if (!jdText || typeof jdText !== "string" || !jdText.trim()) {
      return void res.status(400).json({ error: "jdText is required" });
    }
    if (resumeText.length > MAX_RESUME_CHARS) {
      return void res
        .status(400)
        .json({ error: `resumeText exceeds ${MAX_RESUME_CHARS} character limit` });
    }
    if (jdText.length > MAX_JD_CHARS) {
      return void res
        .status(400)
        .json({ error: `jdText exceeds ${MAX_JD_CHARS} character limit` });
    }

    const log = logger.child({ route: "POST /ats/analyze" });
    log.info("ATS analysis requested");

    // Sanitize at the route boundary before passing deeper — analyzeResume
    // also sanitizes internally, but defense-in-depth catches anything
    // injected via body parsing quirks or future refactors.
    const safeResume = sanitizeUserInput(resumeText);
    const safeJD = sanitizeUserInput(jdText);

    try {
      const result = await analyzeResume(safeResume, safeJD);
      log.info("ATS analysis complete", { overallScore: result.overallScore });
      res.json(result);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error("ATS analysis failed", { err: err.message, stack: err.stack });
      res.status(500).json({ error: "Analysis failed. Please try again." });
    }
  });

  return router;
}
