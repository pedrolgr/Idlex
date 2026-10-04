import { Redis } from "ioredis";

let redisInstance: Redis | null = null;
let isRedisAvailable = false;

export interface RedisOptions {
  url?: string;
  maxRetriesPerRequest?: number;
}

export function createRedisClient(options: RedisOptions = {}): Redis {
  if (redisInstance) {
    return redisInstance;
  }

  const url = options.url || process.env.REDIS_URL || "redis://localhost:6379";

  redisInstance = new Redis(url, {
    maxRetriesPerRequest: options.maxRetriesPerRequest ?? 1,
    retryStrategy(times) {
      if (times > 3) {
        return null; // Stop retrying if not available
      }
      return Math.min(times * 200, 1000);
    },
    lazyConnect: true,
    enableOfflineQueue: false,
  });

  redisInstance.on("connect", () => {
    isRedisAvailable = true;
  });

  redisInstance.on("ready", () => {
    isRedisAvailable = true;
  });

  redisInstance.on("error", (err) => {
    isRedisAvailable = false;
    // Suppress noisy unhandled errors in environments where Redis isn't running yet
  });

  redisInstance.on("close", () => {
    isRedisAvailable = false;
  });

  return redisInstance;
}

export function getRedisClient(): Redis {
  return createRedisClient();
}

export async function checkRedisConnection(): Promise<{
  connected: boolean;
  latencyMs?: number;
  error?: string;
}> {
  const client = getRedisClient();
  const start = Date.now();
  try {
    if (client.status === "wait") {
      await client.connect();
    }
    const pong = await client.ping();
    if (pong === "PONG") {
      isRedisAvailable = true;
      return { connected: true, latencyMs: Date.now() - start };
    }
    return { connected: false, error: `Unexpected ping response: ${pong}` };
  } catch (err) {
    isRedisAvailable = false;
    return { connected: false, error: (err as Error).message };
  }
}

export async function closeRedisClient(): Promise<void> {
  if (redisInstance) {
    try {
      if (redisInstance.status !== "end") {
        await redisInstance.quit();
      }
    } catch {}
    redisInstance = null;
    isRedisAvailable = false;
  }
}
