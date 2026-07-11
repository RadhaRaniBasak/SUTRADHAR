import pino from "pino";
import { env } from "./env.js";

const baseOptions: pino.LoggerOptions = {
  level: env.LOG_LEVEL,
  base: { service: "meeting-to-action-bridge" },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ["req.headers.authorization", "*.token", "*.apiKey", "*.api_key", "*.signingSecret"],
    censor: "[redacted]",
  },
};

export const logger =
  env.NODE_ENV === "development"
    ? pino({
        ...baseOptions,
        transport: { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss.l" } },
      })
    : pino(baseOptions);

export function childLogger(bindings: Record<string, unknown>): pino.Logger {
  return logger.child(bindings);
}