import { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";

/**
 * Express middleware that accepts either:
 *   1. A valid Clerk JWT in Authorization: Bearer (signed-in users via Next.js proxy)
 *   2. X-Internal-Secret + X-Guest-Id headers (guest users proxied by Next.js)
 *
 * The effective userId is attached to req.__effectiveUserId for path 2.
 */
export function requireClerkAuth(req: Request, res: Response, next: NextFunction) {
  // Path 1: Clerk JWT (existing signed-in path)
  const { userId } = getAuth(req);
  if (userId) return next();

  // Path 2: trusted Next.js proxy with internal secret + guest ID
  const secret = req.headers["x-internal-secret"];
  const guestId = req.headers["x-guest-id"] as string | undefined;
  if (
    secret &&
    secret === process.env.AGENT_INTERNAL_SECRET &&
    guestId?.startsWith("guest_")
  ) {
    (req as Request & { __effectiveUserId?: string }).__effectiveUserId = guestId;
    return next();
  }

  res.status(401).json({ error: "Unauthorized" });
}
