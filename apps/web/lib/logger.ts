import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";

// On Vercel, file writes are unreliable across invocations — stdout is
// captured by the platform. In local dev, write to daily rotating files.
const IS_VERCEL = !!process.env.VERCEL;

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const ctx = Object.keys(meta).length ? " " + JSON.stringify(meta) : "";
    return `[${timestamp}] ${level}: ${stack ?? message}${ctx}`;
  }),
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: IS_VERCEL ? jsonFormat : consoleFormat,
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
  }),
];

if (!IS_VERCEL) {
  transports.push(
    new DailyRotateFile({
      dirname: path.join(process.cwd(), "logs"),
      filename: "%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: "30d",
      format: jsonFormat,
      level: "debug",
    }),
  );
}

export const logger = winston.createLogger({
  level: "debug",
  transports,
  exitOnError: false,
});

/**
 * Returns a child logger pre-bound with route/context fields.
 * All logs emitted from the child carry those fields automatically.
 */
export function routeLogger(context: Record<string, string | number | undefined>) {
  return logger.child(context);
}
