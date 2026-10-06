import { z } from "zod";

export const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  APP_ORIGIN: z.string().default("http://localhost:3000"),
  DATABASE_URL: z
    .string()
    .default("postgresql://idlex:idlex@localhost:5432/idlex"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),

  HUNTERA_USERNAME: z.string().optional(),
  HUNTERA_PASSWORD: z.string().optional(),
  HUNTERA_HUNT_TIER: z.coerce.number().int().min(0).max(2).default(0),

  SESSION_SECRET: z
    .string()
    .min(16)
    .default("dev-secret-session-key-at-least-16-bytes"),

  APP_MODE: z
    .string()
    .default("standalone")
    .transform((val) => val.trim().toLowerCase()),
  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function resetCachedEnv(): void {
  cachedEnv = null;
}

export function getAdminCredentials(env: Env = getEnv()): { email: string; password: string } {
  const email = (env.ADMIN_EMAIL || env.HUNTERA_USERNAME || "admin@idlex.local").trim();
  const password = env.ADMIN_PASSWORD || env.HUNTERA_PASSWORD || "admin123";
  return { email, password };
}

export function isSaasMode(env: Env = getEnv()): boolean {
  return env.APP_MODE === "saas";
}

export function getEnv(override?: Record<string, unknown>): Env {
  if (override) {
    return envSchema.parse({ ...process.env, ...override });
  }
  if (!cachedEnv) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.error(
        "❌ Invalid environment variables:",
        JSON.stringify(result.error.format(), null, 2),
      );
      throw new Error("Invalid environment variables");
    }
    cachedEnv = result.data;
  }
  return cachedEnv;
}

