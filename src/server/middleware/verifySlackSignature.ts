import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

const SIGNATURE_VERSION = "v0";
const MAX_TIMESTAMP_SKEW_SECONDS = 60 * 5;

class SlackSignatureError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "SlackSignatureError";
  }
}

function assertFreshTimestamp(timestampHeader: string): number {
  const timestamp = Number.parseInt(timestampHeader, 10);
  if (!Number.isFinite(timestamp)) {
    throw new SlackSignatureError("x-slack-request-timestamp is not a valid integer", 400);
  }

  const skewSeconds = Math.abs(Date.now() / 1000 - timestamp);
  if (skewSeconds > MAX_TIMESTAMP_SKEW_SECONDS) {
    throw new SlackSignatureError("Request timestamp outside of allowed tolerance", 401);
  }

  return timestamp;
}

function computeExpectedSignature(timestamp: number, rawBody: string): Buffer {
  const baseString = `${SIGNATURE_VERSION}:${timestamp}:${rawBody}`;
  const digest = createHmac("sha256", env.SLACK_SIGNING_SECRET).update(baseString, "utf8").digest("hex");
  return Buffer.from(`${SIGNATURE_VERSION}=${digest}`, "utf8");
}

export async function verifySlackSignature(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const signatureHeader = request.headers["x-slack-signature"];
  const timestampHeader = request.headers["x-slack-request-timestamp"];

  if (typeof signatureHeader !== "string" || typeof timestampHeader !== "string") {
    logger.warn({ path: request.url }, "Missing Slack signature headers");
    await reply.code(400).send({ error: "Missing required Slack signature headers" });
    return;
  }

  try {
    const timestamp = assertFreshTimestamp(timestampHeader);
    const expected = computeExpectedSignature(timestamp, request.rawBody);
    const received = Buffer.from(signatureHeader, "utf8");

    const isValid = expected.length === received.length && timingSafeEqual(expected, received);
    if (!isValid) {
      throw new SlackSignatureError("Signature mismatch", 401);
    }
  } catch (error) {
    if (error instanceof SlackSignatureError) {
      logger.warn({ path: request.url, reason: error.message }, "Rejected Slack request");
      await reply.code(error.statusCode).send({ error: error.message });
      return;
    }
    throw error;
  }
}