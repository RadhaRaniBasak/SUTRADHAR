import type { FastifyReply, FastifyRequest } from "fastify";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env.js";

const SIGNATURE_VERSION = "v0";
const MAX_AGE_SECONDS = 60 * 5;

function computeExpectedSignature(timestamp: number, rawBody: string): Buffer {
  const secret = env.SLACK_SIGNING_SECRET;
  if (!secret) {
    throw new Error("SLACK_SIGNING_SECRET is missing");
  }

  const baseString = `${SIGNATURE_VERSION}:${timestamp}:${rawBody}`;
  const digest = createHmac("sha256", secret).update(baseString, "utf8").digest("hex");
  return Buffer.from(`${SIGNATURE_VERSION}=${digest}`, "utf8");
}

export async function verifySlackSignature(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const timestampHeader = request.headers["x-slack-request-timestamp"];
  const signatureHeader = request.headers["x-slack-signature"];

  if (typeof signatureHeader !== "string") {
    reply.status(401).send({ ok: false, error: "missing_signature" });
    return;
  }

  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp)) {
    reply.status(401).send({ ok: false, error: "invalid_timestamp" });
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > MAX_AGE_SECONDS) {
    reply.status(401).send({ ok: false, error: "stale_request" });
    return;
  }

  const expected = computeExpectedSignature(timestamp, request.rawBody);
  const received = Buffer.from(signatureHeader, "utf8");

  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    reply.status(401).send({ ok: false, error: "invalid_signature" });
  }
}
