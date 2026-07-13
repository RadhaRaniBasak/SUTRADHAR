import RedisImport from "ioredis";
import { env } from "../config/env.js";

const RedisCtor = (RedisImport as unknown as { default?: any }).default ?? (RedisImport as unknown as any);

export const redisConnection = new RedisCtor(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});
