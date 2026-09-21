import express from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import "dotenv/config";
import { Heartbeat, CronRun } from "../lib/models/CronRun.ts";
import { connectDB } from "../lib/config/db.ts";
import { runKeepAlive } from "../lib/keepAlive.ts";

const router = express.Router();

/**
 * Compares two secrets without leaking, through response timing, how much of
 * the guess was right. Both are hashed first so differing lengths don't
 * short-circuit the comparison either.
 */
function secretMatches(provided: string, expected: string) {
  const a = crypto.createHash("sha256").update(provided).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

/** Reads the secret from `x-cron-secret` or `Authorization: Bearer <secret>`. */
function providedSecret(req: express.Request) {
  const header = req.header("x-cron-secret");
  if (header) return header.trim();
  const auth = req.header("Authorization") || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  return "";
}

function requireCronSecret(req: express.Request, res: express.Response, next: express.NextFunction) {
  const expected = process.env.CRON_SECRET;

  // Without a configured secret the endpoint stays shut rather than open.
  if (!expected) {
    console.error("CRON_SECRET is not set — /api/cron is disabled");
    return res.status(503).json({ message: "Cron is not configured" });
  }

  const given = providedSecret(req);
  if (!given || !secretMatches(given, expected)) {
    // Deliberately vague: a caller without the secret learns nothing.
    return res.status(401).json({ message: "Unauthorized" });
  }

  next();
}

/**
 * GET (or POST) /api/cron/keep-alive
 *
 * The same work the built-in scheduler does every 10 minutes (see
 * lib/keepAlive.ts), exposed as an endpoint. The scheduler calls this URL to
 * generate the inbound traffic Render counts, and it's also here for an
 * external scheduler or a manual check.
 */
async function keepAlive(req: express.Request, res: express.Response) {
  const source = String(req.query.source || req.header("user-agent") || "unknown").slice(0, 120);

  try {
    const result = await runKeepAlive(source);
    res.json({ ok: true, ...result });
  } catch (error) {
    console.error("Cron keep-alive failed:", error);
    res.status(500).json({ ok: false, message: "Keep-alive failed" });
  }
}

router.get("/keep-alive", requireCronSecret, keepAlive);
// POST as well, so a scheduler that only sends POSTs works without changes.
router.post("/keep-alive", requireCronSecret, keepAlive);

/** GET /api/cron/status — same secret, but read-only. Handy for debugging. */
router.get("/status", requireCronSecret, async (_req, res) => {
  try {
    await connectDB();
    const heartbeat = await Heartbeat.findOne({ key: "keepalive" }).lean();
    const logged = await CronRun.countDocuments();
    res.json({
      ok: true,
      lastRunAt: heartbeat?.lastRunAt ?? null,
      runs: heartbeat?.runs ?? 0,
      lastSource: heartbeat?.lastSource ?? "",
      loggedRuns: logged,
      db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    });
  } catch (error) {
    console.error("Cron status failed:", error);
    res.status(500).json({ ok: false, message: "Status check failed" });
  }
});

export default router;
