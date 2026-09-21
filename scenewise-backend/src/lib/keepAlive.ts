import mongoose from "mongoose";
import "dotenv/config";
import Movie from "./models/Movie.ts";
import { Heartbeat, CronRun } from "./models/CronRun.ts";
import { connectDB } from "./config/db.ts";

// How long a run-log entry is kept before a later run deletes it.
const LOG_RETENTION_DAYS = 7;

// How often the built-in scheduler runs. Render's free instances sleep after
// ~15 minutes without inbound traffic, so 10 leaves room for a missed tick.
// Override with KEEP_ALIVE_INTERVAL_MS / KEEP_ALIVE_FIRST_DELAY_MS.
const INTERVAL_MS = Number(process.env.KEEP_ALIVE_INTERVAL_MS) || 10 * 60 * 1000;
const FIRST_DELAY_MS = Number(process.env.KEEP_ALIVE_FIRST_DELAY_MS) || 30 * 1000;

export type KeepAliveResult = {
  ranAt: Date;
  runs: number;
  movieCount: number;
  log: { kept: number; deleted: number; retentionDays: number };
  db: "connected" | "disconnected";
  durationMs: number;
};

/**
 * One keep-alive pass. Real database work, not just an open connection, so
 * MongoDB Atlas counts the cluster as active:
 *
 *   1. update the single heartbeat document
 *   2. read a count from the movies collection
 *   3. insert one run-log document
 *   4. delete run-log documents older than a week
 *
 * Nothing user-facing is touched — movies, reviews, likes and shelves are
 * never written here.
 */
export async function runKeepAlive(source: string): Promise<KeepAliveResult> {
  const startedAt = Date.now();
  await connectDB();

  const ranAt = new Date();
  const cutoff = new Date(ranAt.getTime() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const heartbeat = await Heartbeat.findOneAndUpdate(
    { key: "keepalive" },
    { $set: { lastRunAt: ranAt, lastSource: source }, $inc: { runs: 1 } },
    { upsert: true, new: true },
  );

  const movieCount = await Movie.estimatedDocumentCount();

  await CronRun.create({ ranAt, source, movieCount, durationMs: Date.now() - startedAt });

  const { deletedCount } = await CronRun.deleteMany({ ranAt: { $lt: cutoff } });
  const kept = await CronRun.countDocuments();

  return {
    ranAt,
    runs: heartbeat.runs,
    movieCount,
    log: { kept, deleted: deletedCount ?? 0, retentionDays: LOG_RETENTION_DAYS },
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    durationMs: Date.now() - startedAt,
  };
}

/**
 * The built-in scheduler — this is why no external cron service is needed.
 *
 * Every 10 minutes it does the database work above, then makes an HTTP request
 * to the service's own public URL. That second part matters on Render: the
 * free tier sleeps based on *inbound* traffic, and a request to the public URL
 * arrives through Render's load balancer, so it counts. A purely internal
 * timer would keep the database warm but not the instance.
 *
 * The honest limit: a timer inside the process can't run while the process is
 * asleep. If the instance ever does sleep — a deploy, a crash, a missed tick —
 * the next real visitor wakes it and the schedule resumes from there. For a
 * portfolio app that's a fine trade; if you ever need a guarantee, an external
 * scheduler hitting /api/cron/keep-alive is the belt-and-braces version.
 */
export function startKeepAliveScheduler() {
  if (process.env.KEEP_ALIVE_DISABLED === "true") {
    console.log("Keep-alive scheduler disabled (KEEP_ALIVE_DISABLED=true)");
    return;
  }

  // Render sets this to e.g. https://scenewise.onrender.com
  const publicUrl = process.env.RENDER_EXTERNAL_URL?.replace(/\/+$/, "");
  const secret = process.env.CRON_SECRET;

  const tick = async () => {
    try {
      const result = await runKeepAlive("internal-scheduler");
      console.log(
        `Keep-alive run #${result.runs} in ${result.durationMs}ms ` +
          `(log: ${result.log.kept} kept, ${result.log.deleted} deleted)`,
      );
    } catch (error) {
      console.error("Keep-alive run failed:", error);
    }

    // Self-ping, so Render sees inbound traffic and doesn't spin the instance
    // down. Locally there's no public URL, so this is skipped.
    if (!publicUrl || !secret) return;
    try {
      const response = await fetch(`${publicUrl}/api/cron/keep-alive?source=self-ping`, {
        headers: { "x-cron-secret": secret },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) console.warn(`Self-ping returned ${response.status}`);
    } catch (error) {
      console.warn("Self-ping failed:", error instanceof Error ? error.message : error);
    }
  };

  // First pass shortly after boot, then every interval. `unref()` keeps the
  // timer from holding the process open during shutdown.
  setTimeout(tick, FIRST_DELAY_MS).unref();
  setInterval(tick, INTERVAL_MS).unref();

  console.log(
    `Keep-alive scheduler started — every ${INTERVAL_MS / 60000} minutes` +
      (publicUrl ? ` (self-pinging ${publicUrl})` : " (no public URL; database only)"),
  );
}
