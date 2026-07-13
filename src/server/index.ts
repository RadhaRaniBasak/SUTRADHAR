import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import { logger } from "../config/logger.js";

const app = express();

// Parse JSON body
app.use(express.json());

// Basic health/root routes
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    ok: true,
    service: "meeting-to-action-mcp-bridge",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true });
});

// Slack Events endpoint (URL verification + event ack)
app.post("/slack/events", (req: Request, res: Response) => {
  const body = req.body;

  // Slack URL verification challenge
  if (body?.type === "url_verification" && body?.challenge) {
    return res.status(200).json({ challenge: body.challenge });
  }

  // Acknowledge all event callbacks quickly
  if (body?.type === "event_callback") {
    logger.info(
      {
        eventType: body?.event?.type,
        teamId: body?.team_id,
      },
      "Received Slack event callback",
    );
    return res.status(200).json({ ok: true });
  }

  return res.status(200).json({ ok: true });
});

const port = Number(process.env['PORT'] ?? 3000);
const host = process.env['HOST'] ?? "0.0.0.0";

app.listen(port, host, () => {
  logger.info(
    { env: process.env['NODE_ENV'] ?? "development", host, port },
    "Meeting-to-Action bridge listening",
  );
});