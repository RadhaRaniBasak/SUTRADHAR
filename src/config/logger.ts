import pino from "pino";

const logLevel = process.env["LOG_LEVEL"] ?? "info";

const loggerOptions: pino.LoggerOptions = {
  level: logLevel,
};

if (process.env["NODE_ENV"] !== "production") {
  loggerOptions.transport = {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
    },
  };
}

export const logger = pino(loggerOptions);
