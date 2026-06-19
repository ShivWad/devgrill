import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.resolve(__dirname, "../../logs");

// ── Formats ──────────────────────────────────────────────────────────────────

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const ctx = Object.keys(meta).length
      ? " " + JSON.stringify(meta)
      : "";
    return `[${timestamp}] ${level}: ${stack ?? message}${ctx}`;
  }),
);

// ── Transports ────────────────────────────────────────────────────────────────

const dailyFileTransport = new DailyRotateFile({
  dirname: LOG_DIR,
  filename: "%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxFiles: "30d",
  format: jsonFormat,
  level: "debug",
});

const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
});

// ── Logger instance ───────────────────────────────────────────────────────────

export const logger = winston.createLogger({
  level: "debug",
  transports: [dailyFileTransport, consoleTransport],
  exitOnError: false,
});

/**
 * Returns a child logger pre-bound with context fields (e.g. threadId, node).
 * All logs emitted from the child carry those fields automatically.
 */
export function childLogger(context: Record<string, string | number | undefined>) {
  return logger.child(context);
}

// ── Process-level safety net ──────────────────────────────────────────────────

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception — process will exit", { err: err.message, stack: err.stack });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  logger.error("Unhandled promise rejection", { err: msg, stack });
});
