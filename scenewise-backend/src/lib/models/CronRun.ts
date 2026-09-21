import mongoose from "mongoose";

/**
 * Keep-alive bookkeeping for `/api/cron/keep-alive`.
 *
 * Two shapes, on purpose:
 *
 *  - `Heartbeat` is a single document that gets updated on every run. It's the
 *    quick answer to "is anything still running?" — read it and you see the
 *    last run and the total count.
 *  - `CronRun` is one document per run, kept for 7 days. Writing and then
 *    deleting these is what gives MongoDB Atlas genuine read *and* write
 *    activity, rather than an idle connection it might eventually pause.
 */

const heartbeatSchema = new mongoose.Schema(
  {
    // There is only ever one of these.
    key: { type: String, required: true, unique: true, default: "keepalive" },
    lastRunAt: { type: Date, required: true },
    runs: { type: Number, default: 0 },
    lastSource: { type: String, default: "" },
  },
  { timestamps: true },
);

const cronRunSchema = new mongoose.Schema({
  ranAt: { type: Date, required: true, index: true },
  source: { type: String, default: "" },
  durationMs: { type: Number, default: 0 },
  movieCount: { type: Number, default: 0 },
});

export const Heartbeat =
  mongoose.models.Heartbeat || mongoose.model("Heartbeat", heartbeatSchema);

export const CronRun = mongoose.models.CronRun || mongoose.model("CronRun", cronRunSchema);
