import { WebClient } from "@slack/web-api";
import { env } from "../../config/env.js";

export const slackClient = new WebClient(env.SLACK_BOT_TOKEN, {
  retryConfig: {
    retries: 4,
    factor: 2,
    minTimeout: 500,
    maxTimeout: 8000,
    randomize: true,
  },
  rejectRateLimitedCalls: false,
});