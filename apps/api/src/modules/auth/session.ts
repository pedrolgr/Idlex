import fs from "node:fs";
import path from "node:path";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { getEnv } from "@idlex/config";
import { getDb, userSessions, users } from "@idlex/db";
import { eq } from "drizzle-orm";
import { getRedisClient } from "../redis/redis-client.js";
import { hashToken } from "./crypto.js";

export interface SessionData {
  userId: string;
  email: string;
  role: string;
  emailVerified: boolean;
  createdAt: string;
  ip?: string;
  userAgent?: string;
}

declare module "fastify" {
  interface FastifyRequest {
    userSession?: SessionData;
  }
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
    optionalAuthenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
    requireVerifiedEmail: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
}

const SESSION_COOKIE_NAME = "idlex_sid";
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

const inMemorySessions = new Map<
  string,
  { session: SessionData; expiresAt: number }
>();

// Persistent file storage for sessions (survives app/server restarts)
const SESSIONS_FILE = path.resolve(process.cwd(), ".sessions.json");

function loadStoredSessions(): void {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8"));
      const now = Date.now();
      for (const [hash, entry] of Object.entries(data)) {
        const item = entry as { session: SessionData; expiresAt: number };
        if (item.expiresAt > now) {
          inMemorySessions.set(hash, item);
        }
      }
    }
  } catch {}
}

function persistStoredSessions(): void {
  try {
    const obj: Record<string, { session: SessionData; expiresAt: number }> = {};
    const now = Date.now();
    for (const [hash, entry] of inMemorySessions.entries()) {
      if (entry.expiresAt > now) {
        obj[hash] = entry;
      }
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(obj, null, 2), "utf-8");
  } catch {}
}

// Load sessions on module initialization
loadStoredSessions();

export async function createSession(
  userId: string,
  token: string,
  metadata: { ip?: string; userAgent?: string; email?: string; role?: string },
): Promise<void> {
  const tokenHash = hashToken(token);
  const redis = getRedisClient();
  const db = getDb();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  // In-memory fallback (useful for standalone mode or offline cache)
  inMemorySessions.set(tokenHash, {
    session: {
      userId,
      email: metadata.email || "",
      role: metadata.role || "user",
      emailVerified: true,
      createdAt: new Date().toISOString(),
      ip: metadata.ip,
      userAgent: metadata.userAgent,
    },
    expiresAt: expiresAt.getTime(),
  });
  persistStoredSessions();

  // 1. Redis
  if (redis) {
    try {
      const payload = JSON.stringify({
        userId,
        email: metadata.email,
        role: metadata.role,
        ip: metadata.ip,
        userAgent: metadata.userAgent,
        createdAt: new Date().toISOString(),
      });
      await redis.setex(`sess:${tokenHash}`, SESSION_TTL_SECONDS, payload);
    } catch (e) {
      // Redis unavailable fallback
    }
  }

  // 2. DB mirror
  if (db) {
    try {
      await db.insert(userSessions).values({
        idHash: tokenHash,
        userId,
        ip: metadata.ip,
        userAgent: metadata.userAgent,
        expiresAt,
      });
    } catch (e) {
      // DB insert error
    }
  }
}

export async function revokeSession(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  inMemorySessions.delete(tokenHash);
  persistStoredSessions();
  const redis = getRedisClient();
  const db = getDb();

  if (redis) {
    try {
      await redis.del(`sess:${tokenHash}`);
    } catch {}
  }

  if (db) {
    try {
      await db
        .update(userSessions)
        .set({ revokedAt: new Date() })
        .where(eq(userSessions.idHash, tokenHash));
    } catch {}
  }
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  for (const [hash, entry] of inMemorySessions.entries()) {
    if (entry.session.userId === userId) {
      inMemorySessions.delete(hash);
    }
  }
  persistStoredSessions();
  const db = getDb();
  if (db) {
    try {
      await db
        .update(userSessions)
        .set({ revokedAt: new Date() })
        .where(eq(userSessions.userId, userId));
    } catch {}
  }
}

export async function getSession(
  token: string,
): Promise<SessionData | null> {
  const tokenHash = hashToken(token);
  const redis = getRedisClient();
  const db = getDb();

  // Try Redis first
  if (redis) {
    try {
      const cached = await redis.get(`sess:${tokenHash}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Fetch user from DB if available
        if (db) {
          const userRecords = await db
            .select()
            .from(users)
            .where(eq(users.id, parsed.userId))
            .limit(1);
          const u = userRecords[0];
          if (u && !u.deletedAt) {
            return {
              userId: u.id,
              email: u.email,
              role: u.role,
              emailVerified: !!u.emailVerifiedAt,
              createdAt: parsed.createdAt,
              ip: parsed.ip,
              userAgent: parsed.userAgent,
            };
          }
        } else {
          return {
            userId: parsed.userId,
            email: "cached@user.local",
            role: "user",
            emailVerified: true,
            createdAt: parsed.createdAt,
            ip: parsed.ip,
            userAgent: parsed.userAgent,
          };
        }
      }
    } catch {}
  }

  // Fallback to DB
  if (db) {
    try {
      const sessionRecords = await db
        .select()
        .from(userSessions)
        .where(eq(userSessions.idHash, tokenHash))
        .limit(1);

      const s = sessionRecords[0];
      if (!s || s.revokedAt || s.expiresAt < new Date()) {
        return null;
      }

      const userRecords = await db
        .select()
        .from(users)
        .where(eq(users.id, s.userId))
        .limit(1);

      const u = userRecords[0];
      if (!u || u.deletedAt) {
        return null;
      }

      return {
        userId: u.id,
        email: u.email,
        role: u.role,
        emailVerified: !!u.emailVerifiedAt,
        createdAt: s.createdAt.toISOString(),
        ip: s.ip ?? undefined,
        userAgent: s.userAgent ?? undefined,
      };
    } catch {
      // DB error fallback
    }
  }

  // 3. Fallback to in-memory session (standalone / offline)
  const inMem = inMemorySessions.get(tokenHash);
  if (inMem && inMem.expiresAt > Date.now()) {
    return inMem.session;
  }

  return null;
}

const authPluginImpl: FastifyPluginAsync = async (app) => {
  const env = getEnv();

  // CSRF validation on mutating methods
  app.addHook("onRequest", async (req, reply) => {
    const isMutating = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
    if (!isMutating) return;

    // Skip webhooks if configured
    if (req.url.startsWith("/api/v1/webhooks")) return;

    const origin = req.headers.origin;
    if (origin) {
      const host = req.headers.host;
      const originHost = origin.replace(/^https?:\/\//, "");
      const isSameHost = host && originHost.toLowerCase() === host.toLowerCase();
      const isAppOrigin = origin === env.APP_ORIGIN;
      const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");

      if (!isSameHost && !isAppOrigin && !isLocalhost) {
        return reply.status(403).send({
          error: "Origem não permitida (CSRF)",
          code: "CSRF_ORIGIN_MISMATCH",
        });
      }
    }
  });

  app.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const cookieSid =
        request.cookies[SESSION_COOKIE_NAME] ||
        (request.headers.authorization?.startsWith("Bearer ")
          ? request.headers.authorization.slice(7)
          : undefined);

      if (!cookieSid) {
        return reply.status(401).send({
          error: "Autenticação obrigatória",
          code: "UNAUTHORIZED",
        });
      }

      const session = await getSession(cookieSid);
      if (!session) {
        return reply.status(401).send({
          error: "Sessão inválida ou expirada",
          code: "SESSION_EXPIRED",
        });
      }

      request.userSession = session;
    },
  );

  app.decorate(
    "optionalAuthenticate",
    async (request: FastifyRequest, _reply: FastifyReply) => {
      const cookieSid =
        request.cookies[SESSION_COOKIE_NAME] ||
        (request.headers.authorization?.startsWith("Bearer ")
          ? request.headers.authorization.slice(7)
          : undefined);

      if (!cookieSid) return;

      const session = await getSession(cookieSid);
      if (session) {
        request.userSession = session;
      }
    },
  );

  app.decorate(
    "requireVerifiedEmail",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.userSession?.emailVerified) {
        return reply.status(403).send({
          error: "Verificação de e-mail obrigatória para esta operação",
          code: "EMAIL_NOT_VERIFIED",
        });
      }
    },
  );
};

export const authPlugin = fp(authPluginImpl, {
  name: "auth-plugin",
});
export { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS };
