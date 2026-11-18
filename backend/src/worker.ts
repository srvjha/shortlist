import { pool } from "./db/index.js";
import { type MaintenanceTask, maintenanceTasks } from "./jobs/maintenance.js";
import { createHash } from "node:crypto";
import { flushAnalytics, trackServer } from "./lib/analytics.js";
import { logger } from "./lib/logger.js";

// Runs scheduled maintenance. Start one instance alongside the API: `pnpm worker`.
// Every task is an idempotent sweep, so each also runs once at startup to catch up on missed runs.

type Schedule = { minute: number; hour?: number }; // No hour = every hour.

const schedules: Record<MaintenanceTask, Schedule> = {
  "expire-subscriptions": { minute: 0 },
  "purge-deleted-resumes": { hour: 2, minute: 30 },
  "purge-old-uploads": { hour: 2, minute: 45 },
  "purge-compiled-pdfs": { hour: 3, minute: 0 },
  "purge-guest-users": { hour: 3, minute: 0 },
};

const clock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
});

function isDue(schedule: Schedule, now: Date) {
  const parts = Object.fromEntries(clock.formatToParts(now).map((part) => [part.type, Number(part.value)]));
  return parts.minute === schedule.minute && (schedule.hour === undefined || parts.hour === schedule.hour);
}

// A Postgres advisory lock per task, so two workers never run the same task at once.
async function run(task: MaintenanceTask) {
  // A failed connect is logged like a failed task, so a database blip never kills the worker.
  const client = await pool.connect().catch((err: unknown) => {
    logger.error({ err, task }, "Maintenance task failed");
  });
  if (!client) return;
  try {
    const { rows } = await client.query<{ locked: boolean }>("select pg_try_advisory_lock(hashtext($1)) as locked", [
      `maintenance:${task}`,
    ]);
    if (!rows[0]?.locked) return;
    try {
      await maintenanceTasks[task]();
    } finally {
      await client.query("select pg_advisory_unlock(hashtext($1))", [`maintenance:${task}`]);
    }
  } catch (err) {
    logger.error({ err, task }, "Maintenance task failed");
  } finally {
    client.release();
  }
}

const tasks = Object.keys(schedules) as MaintenanceTask[];
for (const task of tasks) await run(task);

// Checked twice a minute so timer drift can't skip a due minute; lastRun stops a second run in the same minute.
const lastRun = new Map<MaintenanceTask, number>();
let running = false;
const timer = setInterval(async () => {
  if (running) return;
  running = true;
  const now = new Date();
  const minute = Math.floor(now.getTime() / 60_000);
  for (const task of tasks) {
    if (isDue(schedules[task], now) && lastRun.get(task) !== minute) {
      lastRun.set(task, minute);
      await run(task);
    }
  }
  running = false;
}, 30_000);

// The same fixed work, timed every 5 minutes. Contabo doesn't report CPU steal, so this is how a slower host
// shows up, next to compile_ms in PostHog. About 0.1 s of CPU on a healthy core.
const probeData = Buffer.alloc(1 << 20);
function cpuProbe() {
  const cpu = process.cpuUsage();
  const started = performance.now();
  for (let i = 0; i < 300; i++) createHash("sha256").update(probeData).digest();
  const used = process.cpuUsage(cpu);
  trackServer("cpu_probe", {
    wall_ms: Math.round(performance.now() - started),
    cpu_ms: Math.round((used.user + used.system) / 1000),
  });
}
cpuProbe();
const probeTimer = setInterval(cpuProbe, 5 * 60_000);

logger.info("Worker started");

async function shutdown() {
  clearInterval(timer);
  clearInterval(probeTimer);
  await flushAnalytics();
  await pool.end();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
