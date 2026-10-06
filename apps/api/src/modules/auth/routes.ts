import type { FastifyPluginAsync } from "fastify";
import { getDb, users, userSessions, verificationTokens, auditLogs, subscriptions, plans } from "@idlex/db";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import {
  hashPassword,
  verifyPassword,
  dummyVerifyPassword,
  generateSessionToken,
  hashToken,
} from "./crypto.js";
import {
  createSession,
  revokeSession,
  revokeAllUserSessions,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
} from "./session.js";
import {
  generateTotpSetup,
  verifyTotpToken,
  encryptTotpSecret,
  decryptTotpSecret,
} from "./totp.js";
import { getEnv, getAdminCredentials, isSaasMode } from "@idlex/config";

const STANDALONE_ADMIN_ID = "00000000-0000-4000-8000-000000000001";

const registerSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(10, "A senha deve conter no mínimo 10 caracteres"),
});

const loginSchema = z.object({
  email: z.string().min(1, "E-mail ou usuário obrigatório").trim(),
  password: z.string().min(1, "Senha obrigatória"),
  totpCode: z.string().optional(),
});


const verifyEmailSchema = z.object({
  token: z.string().min(16),
});

const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(16),
  newPassword: z.string().min(10, "A senha deve conter no mínimo 10 caracteres"),
});

const enableTotpSchema = z.object({
  secret: z.string().min(16),
  code: z.string().length(6),
});

const disableTotpSchema = z.object({
  code: z.string().length(6),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  const env = getEnv();

  // Rate limits per route configuration
  const registerRateLimit = {
    max: 5,
    timeWindow: "1 hour",
  };

  const loginRateLimit = {
    max: 10,
    timeWindow: "15 minutes",
  };

  // GET /config - Public configuration
  app.get("/config", async (_req, reply) => {
    return reply.status(200).send({
      mode: env.APP_MODE,
      registrationEnabled: isSaasMode(env),
    });
  });

  // POST /register
  app.post(
    "/register",
    {
      config: {
        rateLimit: registerRateLimit,
      },
    },
    async (req, reply) => {
      if (!isSaasMode(env)) {
        return reply.status(403).send({
          error: "O registro de novos usuários está desativado no modo standalone.",
          code: "REGISTRATION_DISABLED",
        });
      }

      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Dados de registro inválidos",
          details: parsed.error.issues,
        });
      }

      const { email, password } = parsed.data;
      const db = getDb();
      if (!db) {
        return reply.status(503).send({ error: "Banco de dados indisponível" });
      }

      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existing.length > 0) {
        // Return 200 or generic response to prevent email enumeration
        return reply.status(200).send({
          message:
            "Se o e-mail não estiver cadastrado, as instruções de verificação foram enviadas.",
        });
      }

      const passwordHash = await hashPassword(password);
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          passwordHash,
        })
        .returning();

      if (!newUser) {
        return reply.status(500).send({ error: "Falha ao criar usuário" });
      }

      // Generate verification token
      const rawVerificationToken = generateSessionToken();
      const tokenHash = hashToken(rawVerificationToken);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await db.insert(verificationTokens).values({
        tokenHash,
        userId: newUser.id,
        type: "email_verification",
        expiresAt,
      });

      // Audit log
      await db.insert(auditLogs).values({
        userId: newUser.id,
        action: "user.register",
        ip: req.ip,
        metadata: { email },
      });

      app.log.info({ userId: newUser.id, email }, "Novo usuário cadastrado");

      // In production: send email via worker/resend. Emitting token in debug mode if not production
      return reply.status(200).send({
        message:
          "Se o e-mail não estiver cadastrado, as instruções de verificação foram enviadas.",
        verificationToken: env.NODE_ENV === "production" ? undefined : rawVerificationToken,
      });
    },
  );

  // POST /verify-email
  app.post("/verify-email", async (req, reply) => {
    const parsed = verifyEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Token de verificação inválido" });
    }

    const { token } = parsed.data;
    const db = getDb();
    if (!db) return reply.status(503).send({ error: "Banco de dados indisponível" });

    const tokenHash = hashToken(token);
    const [tokenRecord] = await db
      .select()
      .from(verificationTokens)
      .where(
        and(
          eq(verificationTokens.tokenHash, tokenHash),
          eq(verificationTokens.type, "email_verification"),
        ),
      )
      .limit(1);

    if (
      !tokenRecord ||
      tokenRecord.usedAt ||
      tokenRecord.expiresAt < new Date()
    ) {
      return reply.status(400).send({ error: "Token inválido ou expirado" });
    }

    await db
      .update(verificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(verificationTokens.tokenHash, tokenHash));

    await db
      .update(users)
      .set({ emailVerifiedAt: new Date() })
      .where(eq(users.id, tokenRecord.userId));

    await db.insert(auditLogs).values({
      userId: tokenRecord.userId,
      action: "user.verify_email",
      ip: req.ip,
    });

    return reply.status(200).send({ message: "E-mail verificado com sucesso!" });
  });

  // POST /login
  app.post(
    "/login",
    {
      config: {
        rateLimit: loginRateLimit,
      },
    },
    async (req, reply) => {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Credenciais inválidas" });
      }

      const { email, password, totpCode } = parsed.data;

      // === STANDALONE MODE: Single user authenticated against environment ===
      if (!isSaasMode(env)) {
        const { email: adminEmail, password: adminPassword } = getAdminCredentials(env);
        const normInput = email.toLowerCase().trim();
        const normAdmin = adminEmail.toLowerCase().trim();

        const isMatch = normAdmin && normInput === normAdmin;

        if (!isMatch || !password || password !== adminPassword) {
          await dummyVerifyPassword(password);
          return reply.status(401).send({ error: "Credenciais inválidas" });
        }


        let adminUserId = STANDALONE_ADMIN_ID;
        const db = getDb();
        if (db) {
          try {
            const existing = await db
              .select()
              .from(users)
              .where(eq(users.email, normAdmin))
              .limit(1);

            if (existing[0]) {
              adminUserId = existing[0].id;
            } else {
              const passHash = await hashPassword(adminPassword);
              const [created] = await db
                .insert(users)
                .values({
                  id: STANDALONE_ADMIN_ID,
                  email: normAdmin,
                  passwordHash: passHash,
                  role: "admin",
                  emailVerifiedAt: new Date(),
                })
                .returning();
              if (created) adminUserId = created.id;
            }
          } catch (e) {
            // DB fallback
          }
        }

        const sessionToken = generateSessionToken();
        await createSession(adminUserId, sessionToken, {
          ip: req.ip,
          userAgent: req.headers["user-agent"],
          email: normAdmin,
          role: "admin",
        });

        const isProduction = env.NODE_ENV === "production";
        reply.setCookie(SESSION_COOKIE_NAME, sessionToken, {
          path: "/",
          httpOnly: true,
          secure: isProduction,
          sameSite: "lax",
          maxAge: SESSION_TTL_SECONDS,
        });

        return reply.status(200).send({
          message: "Login realizado com sucesso",
          token: sessionToken,
          user: {
            id: adminUserId,
            email: normAdmin,
            role: "admin",
            emailVerified: true,
            twoFactorEnabled: false,
            screens: 4,
            plan: "standalone",
          },
        });
      }

      // === SAAS MODE: Multi-user database authentication ===
      const db = getDb();
      if (!db) return reply.status(503).send({ error: "Banco de dados indisponível" });

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user || user.deletedAt) {
        // Run dummy verification to match timing attack profile
        await dummyVerifyPassword(password);
        return reply.status(401).send({ error: "Credenciais inválidas" });
      }

      const passwordOk = await verifyPassword(user.passwordHash, password);
      if (!passwordOk) {
        await db.insert(auditLogs).values({
          userId: user.id,
          action: "user.login_failed",
          ip: req.ip,
          metadata: { reason: "bad_password" },
        });
        return reply.status(401).send({ error: "Credenciais inválidas" });
      }

      // 2FA check if enabled
      if (user.totpSecretEnc) {
        if (!totpCode) {
          return reply.status(403).send({
            error: "Código 2FA obrigatório",
            code: "MFA_REQUIRED",
          });
        }
        const secret = decryptTotpSecret(user.totpSecretEnc, env.SESSION_SECRET);
        if (!secret || !verifyTotpToken(totpCode, secret)) {
          return reply.status(401).send({ error: "Código 2FA inválido" });
        }
      }

      // Generate session
      const sessionToken = generateSessionToken();
      await createSession(user.id, sessionToken, {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });

      // Set HttpOnly, Secure, SameSite=Lax cookie
      const isProduction = env.NODE_ENV === "production";
      reply.setCookie(SESSION_COOKIE_NAME, sessionToken, {
        path: "/",
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: SESSION_TTL_SECONDS,
      });

      await db.insert(auditLogs).values({
        userId: user.id,
        action: "user.login",
        ip: req.ip,
      });

      return reply.status(200).send({
        message: "Login realizado com sucesso",
        token: sessionToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          emailVerified: !!user.emailVerifiedAt,
          twoFactorEnabled: !!user.totpSecretEnc,
        },
      });
    },
  );

  // POST /logout
  app.post("/logout", async (req, reply) => {
    const token =
      req.cookies[SESSION_COOKIE_NAME] ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : undefined);

    if (token) {
      await revokeSession(token);
    }

    reply.clearCookie(SESSION_COOKIE_NAME, {
      path: "/",
    });

    return reply.status(200).send({ message: "Desconectado com sucesso" });
  });

  // POST /forgot-password
  app.post("/forgot-password", async (req, reply) => {
    if (!isSaasMode(env)) {
      return reply.status(403).send({
        error:
          "Recuperação de senha não disponível no modo standalone. Altere as credenciais nas variáveis de ambiente da VM.",
        code: "PASSWORD_RESET_DISABLED",
      });
    }

    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(200).send({
        message: "Se o e-mail existir, um link de redefinição foi enviado.",
      });
    }

    const { email } = parsed.data;
    const db = getDb();
    if (db) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (user && !user.deletedAt) {
        const rawToken = generateSessionToken();
        const tokenHash = hashToken(rawToken);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await db.insert(verificationTokens).values({
          tokenHash,
          userId: user.id,
          type: "password_reset",
          expiresAt,
        });

        await db.insert(auditLogs).values({
          userId: user.id,
          action: "user.forgot_password",
          ip: req.ip,
        });
      }
    }

    return reply.status(200).send({
      message: "Se o e-mail existir, um link de redefinição foi enviado.",
    });
  });

  // POST /reset-password
  app.post("/reset-password", async (req, reply) => {
    if (!isSaasMode(env)) {
      return reply.status(403).send({
        error:
          "Redefinição de senha não disponível no modo standalone.",
        code: "PASSWORD_RESET_DISABLED",
      });
    }

    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Dados inválidos",
        details: parsed.error.issues,
      });
    }

    const { token, newPassword } = parsed.data;
    const db = getDb();
    if (!db) return reply.status(503).send({ error: "Banco de dados indisponível" });

    const tokenHash = hashToken(token);
    const [tokenRecord] = await db
      .select()
      .from(verificationTokens)
      .where(
        and(
          eq(verificationTokens.tokenHash, tokenHash),
          eq(verificationTokens.type, "password_reset"),
        ),
      )
      .limit(1);

    if (
      !tokenRecord ||
      tokenRecord.usedAt ||
      tokenRecord.expiresAt < new Date()
    ) {
      return reply.status(400).send({ error: "Token inválido ou expirado" });
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    await db
      .update(verificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(verificationTokens.tokenHash, tokenHash));

    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, tokenRecord.userId));

    // Invalidate all active sessions for security
    await revokeAllUserSessions(tokenRecord.userId);

    await db.insert(auditLogs).values({
      userId: tokenRecord.userId,
      action: "user.reset_password",
      ip: req.ip,
    });

    return reply.status(200).send({
      message:
        "Senha redefinida com sucesso. Faça login com suas novas credenciais.",
    });
  });

  // GET /me (requires auth)
  app.get(
    "/me",
    {
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      const session = req.userSession!;

      if (!isSaasMode(env)) {
        return reply.status(200).send({
          user: {
            id: session.userId,
            email: session.email,
            role: session.role || "admin",
            emailVerified: true,
            plan: "standalone",
            screens: 4,
          },
        });
      }

      const db = getDb();

      let screens = 1;
      let planId = "screens1";

      if (db) {
        // Query user active subscription
        const subs = await db
          .select({
            planId: subscriptions.planId,
            screens: plans.screens,
            status: subscriptions.status,
          })
          .from(subscriptions)
          .innerJoin(plans, eq(subscriptions.planId, plans.id))
          .where(
            and(
              eq(subscriptions.userId, session.userId),
              eq(subscriptions.status, "active"),
            ),
          )
          .limit(1);

        if (subs[0]) {
          screens = subs[0].screens;
          planId = subs[0].planId;
        }
      }

      return reply.status(200).send({
        user: {
          id: session.userId,
          email: session.email,
          role: session.role,
          emailVerified: session.emailVerified,
          plan: planId,
          screens,
        },
      });
    },
  );

  // GET /sessions (requires auth)
  app.get(
    "/sessions",
    {
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      const session = req.userSession!;
      const db = getDb();
      if (!db) return reply.status(503).send({ error: "Banco de dados indisponível" });

      const sessionsList = await db
        .select({
          idHash: userSessions.idHash,
          ip: userSessions.ip,
          userAgent: userSessions.userAgent,
          createdAt: userSessions.createdAt,
          expiresAt: userSessions.expiresAt,
          revokedAt: userSessions.revokedAt,
        })
        .from(userSessions)
        .where(eq(userSessions.userId, session.userId))
        .orderBy(desc(userSessions.createdAt))
        .limit(20);

      return reply.status(200).send({
        sessions: sessionsList.map((s) => ({
          id: s.idHash.slice(0, 16), // Masked ID
          ip: s.ip,
          userAgent: s.userAgent,
          createdAt: s.createdAt,
          expiresAt: s.expiresAt,
          active: !s.revokedAt && s.expiresAt > new Date(),
        })),
      });
    },
  );

  // POST /2fa/setup (requires auth)
  app.post(
    "/2fa/setup",
    {
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      const session = req.userSession!;
      const setup = await generateTotpSetup(session.email, "Idlex Huntera");
      return reply.status(200).send({
        secret: setup.secret,
        otpauthUrl: setup.otpauthUrl,
        qrCode: setup.qrCodeDataUrl,
      });
    },
  );

  // POST /2fa/enable (requires auth)
  app.post(
    "/2fa/enable",
    {
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      const parsed = enableTotpSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Código ou chave inválidos" });
      }

      const { secret, code } = parsed.data;
      const isValid = verifyTotpToken(code, secret);
      if (!isValid) {
        return reply.status(400).send({ error: "Código TOTP inválido" });
      }

      const session = req.userSession!;
      const db = getDb();
      if (!db) return reply.status(503).send({ error: "Banco de dados indisponível" });

      const encryptedSecret = encryptTotpSecret(secret, env.SESSION_SECRET);
      await db
        .update(users)
        .set({ totpSecretEnc: encryptedSecret })
        .where(eq(users.id, session.userId));

      await db.insert(auditLogs).values({
        userId: session.userId,
        action: "user.2fa_enabled",
        ip: req.ip,
      });

      return reply.status(200).send({ message: "2FA ativado com sucesso!" });
    },
  );

  // POST /2fa/disable (requires auth)
  app.post(
    "/2fa/disable",
    {
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      const parsed = disableTotpSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Código inválido" });
      }

      const session = req.userSession!;
      const db = getDb();
      if (!db) return reply.status(503).send({ error: "Banco de dados indisponível" });

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);

      if (!user?.totpSecretEnc) {
        return reply.status(400).send({ error: "2FA não está ativo" });
      }

      const secret = decryptTotpSecret(user.totpSecretEnc, env.SESSION_SECRET);
      if (!secret || !verifyTotpToken(parsed.data.code, secret)) {
        return reply.status(400).send({ error: "Código TOTP incorreto" });
      }

      await db
        .update(users)
        .set({ totpSecretEnc: null })
        .where(eq(users.id, session.userId));

      await db.insert(auditLogs).values({
        userId: session.userId,
        action: "user.2fa_disabled",
        ip: req.ip,
      });

      return reply.status(200).send({ message: "2FA desativado com sucesso!" });
    },
  );
};
