import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import { getEnv, isSaasMode } from "@idlex/config";
import { checkDatabaseConnection, closeDatabasePool } from "@idlex/db";
import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { z } from "zod";
import {
  avatarQuerySchema,
  fetchAvatar,
} from "./modules/assets/avatar.js";
import {
  fetchItemIcon,
  itemIconQuerySchema,
} from "./modules/assets/item-icon.js";
import fastifyCookie from "@fastify/cookie";
import {
  checkRedisConnection,
  closeRedisClient,
} from "./modules/redis/redis-client.js";
import { authPlugin } from "./modules/auth/session.js";
import { authRoutes } from "./modules/auth/routes.js";
import { createAccountsRoutes } from "./modules/accounts/routes.js";
import { SlotManager } from "./modules/slots/slot-manager.js";
import {
  toCompactSlot,
  computeSlotDeltas,
  getCachedCatalog,
  type CompactSlotState,
  type SlotPatch,
} from "./modules/stream/deltas.js";
import { Slot } from "./slot.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolvePublicDir(): string {
  const candidates = [
    path.resolve(__dirname, "../../../public"),
    path.resolve(__dirname, "../../public"),
    path.resolve(process.cwd(), "public"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return path.resolve(process.cwd(), "public");
}

const PUBLIC_DIR = resolvePublicDir();

export async function createServerApp(): Promise<{
  app: FastifyInstance;
  slots: Slot[];
  broadcastSSE: () => void;
  shutdown: () => Promise<void>;
}> {
  const env = getEnv();

  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      redact: [
        "req.headers.cookie",
        "req.headers.authorization",
        "*.password",
        "*.email",
        "*.ticket",
        "*.credentials*",
      ],
    },
    bodyLimit: 65536, // 64 KB
    trustProxy: true,
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (_req, body, done) => {
      const text = typeof body === "string" ? body : body.toString("utf8");
      if (!text || text.trim() === "") {
        return done(null, {});
      }
      try {
        const json = JSON.parse(text);
        done(null, json);
      } catch (err) {
        const parseErr = err as { statusCode?: number };
        parseErr.statusCode = 400;
        done(err as Error, undefined);
      }
    },
  );

  // Security Plugins
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: [
          "'self'",
          "data:",
          "https://gunzot-outfits.gunzo.eu",
          "https://tibiopedia.pl",
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        scriptSrcAttr: ["'self'", "'unsafe-inline'"],
        upgradeInsecureRequests: null,
      },
    },
  });

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const isAllowed =
        origin === env.APP_ORIGIN ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        origin.includes("sslip.io");
      cb(null, isAllowed);
    },
    credentials: true,
  });

  await app.register(fastifyCookie);
  await app.register(authPlugin);

  // Protect slots and streaming telemetry routes (requires main login to access slots)
  app.addHook("preHandler", async (req, reply) => {
    const pathname = req.url.split("?")[0] ?? "";
    if (
      pathname.startsWith("/api/slots") ||
      pathname.startsWith("/api/v1/slots") ||
      pathname.startsWith("/api/events") ||
      pathname.startsWith("/api/v1/events") ||
      pathname.startsWith("/api/stream") ||
      pathname.startsWith("/api/v1/stream")
    ) {
      await app.authenticate(req, reply);
    }
  });

  await app.register(rateLimit, {
    max: 300,
    timeWindow: "1 minute",
    allowList: ["127.0.0.1", "localhost"],
  });

  // Centralized Error Handler
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    const err = error as { statusCode?: number; message?: string; code?: string };
    const statusCode = err.statusCode || 500;
    void reply.status(statusCode).send({
      error: err.message || "Internal Server Error",
      code: err.code || "INTERNAL_ERROR",
      requestId: request.id,
      statusCode,
    });
  });

  // SSE setup
  const sseClients = new Set<FastifyReply>();
  let sseBroadcastTimer: NodeJS.Timeout | null = null;

  function broadcastSSE(): void {
    if (sseBroadcastTimer) return;
    sseBroadcastTimer = setTimeout(() => {
      sseBroadcastTimer = null;
      if (sseClients.size === 0) return;
      const payload = `data: ${JSON.stringify(slots.map((s) => s.toJSON()))}\n\n`;
      for (const reply of sseClients) {
        try {
          reply.raw.write(payload);
        } catch {
          sseClients.delete(reply);
        }
      }
    }, 100);
  }

  const slots = [
    new Slot(1, broadcastSSE),
    new Slot(2, broadcastSSE),
    new Slot(3, broadcastSSE),
    new Slot(4, broadcastSSE),
  ];

  const slotManager = new SlotManager(slots, broadcastSSE);

  const sseInterval = setInterval(broadcastSSE, 1000);

  // Healthcheck endpoints
  app.get("/healthz", async (_req, reply) => {
    return reply.status(200).send({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/readyz", async (_req, reply) => {
    const [dbCheck, redisCheck] = await Promise.all([
      checkDatabaseConnection(),
      checkRedisConnection(),
    ]);

    const isReady = dbCheck.connected;
    const statusCode = isReady ? 200 : 503;

    return reply.status(statusCode).send({
      status: isReady ? "ready" : "not_ready",
      db: dbCheck,
      redis: redisCheck,
      timestamp: new Date().toISOString(),
    });
  });

  // Auth Routes
  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(authRoutes, { prefix: "/api/auth" });

  // Accounts Routes (Phase 4)
  await app.register(createAccountsRoutes(slotManager), { prefix: "/api/v1/accounts" });
  await app.register(createAccountsRoutes(slotManager), { prefix: "/api/accounts" });

  // Catalog cache endpoint (Phase 5 - ETag & immutable caching)
  app.get("/api/v1/catalog/hunts/:hash", async (req, reply) => {
    const { hash } = req.params as { hash: string };
    const catalog = getCachedCatalog(hash);
    if (!catalog) {
      return reply.status(404).send({ error: "Catálogo não encontrado ou expirado" });
    }
    return reply
      .header("Cache-Control", "public, max-age=86400, immutable")
      .header("ETag", `"${hash}"`)
      .send(catalog);
  });

  // Granular SSE Stream clients
  const granularClients = new Set<FastifyReply>();
  let previousSlotsState: CompactSlotState[] = [];

  function broadcastGranularDeltas(): void {
    if (granularClients.size === 0) return;

    const currentSlots = slots.map((s) => toCompactSlot(s.toJSON()));
    const allPatches: SlotPatch[] = [];

    currentSlots.forEach((curr, idx) => {
      const prev = previousSlotsState[idx];
      const patches = computeSlotDeltas(prev, curr);
      allPatches.push(...patches);
    });

    previousSlotsState = currentSlots;

    if (allPatches.length === 0) return;

    const payload = `event: patch\ndata: ${JSON.stringify(allPatches)}\n\n`;
    for (const reply of granularClients) {
      try {
        reply.raw.write(payload);
      } catch {
        granularClients.delete(reply);
      }
    }
  }

  // Hook broadcastSSE to also emit granular deltas
  const originalBroadcast = broadcastSSE;
  function broadcastAll(): void {
    originalBroadcast();
    broadcastGranularDeltas();
  }

  // Re-link slots broadcast to broadcastAll
  slots.forEach((s) => {
    s.onBroadcast = broadcastAll;
  });

  // Modern Granular SSE Stream endpoint
  function handleGranularStream(req: FastifyRequest, reply: FastifyReply) {
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    // Send initial snapshot
    const initialSnapshot = slots.map((s) => toCompactSlot(s.toJSON()));
    reply.raw.write(
      `event: snapshot\ndata: ${JSON.stringify(initialSnapshot)}\n\n`,
    );

    granularClients.add(reply);

    req.raw.on("close", () => {
      granularClients.delete(reply);
    });
  }

  app.get("/api/v1/stream", handleGranularStream);
  app.get("/api/stream", handleGranularStream);

  // SSE route handler (backward compatible full snapshot for legacy frontend)
  function handleSse(req: FastifyRequest, reply: FastifyReply) {
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    reply.raw.write(
      `data: ${JSON.stringify(slots.map((s) => s.toJSON()))}\n\n`,
    );
    sseClients.add(reply);

    req.raw.on("close", () => {
      sseClients.delete(reply);
    });
  }

  app.get("/api/events", handleSse);
  app.get("/api/v1/events", handleSse);

  // Favicon handler
  const faviconPath = path.join(PUBLIC_DIR, "favicon.svg");
  app.get("/favicon.ico", async (_req, reply) => {
    if (fs.existsSync(faviconPath)) {
      const data = fs.readFileSync(faviconPath);
      return reply
        .type("image/svg+xml")
        .header("Cache-Control", "public, max-age=86400")
        .send(data);
    }
    return reply.status(404).send("Not found");
  });

  // Assets endpoints
  async function handleAvatar(req: FastifyRequest, reply: FastifyReply) {
    const parsed = avatarQuerySchema.safeParse(req.query);
    const query = parsed.success ? parsed.data : avatarQuerySchema.parse({});
    const { buffer, contentType, cacheControl } = await fetchAvatar(query);
    return reply
      .type(contentType)
      .header("Cache-Control", cacheControl)
      .send(buffer);
  }

  app.get("/api/avatar", handleAvatar);
  app.get("/api/v1/avatar", handleAvatar);

  async function handleItemIcon(req: FastifyRequest, reply: FastifyReply) {
    const parsed = itemIconQuerySchema.safeParse(req.query);
    const query = parsed.success
      ? parsed.data
      : itemIconQuerySchema.parse({});
    const { buffer, contentType, cacheControl } = await fetchItemIcon(query);
    return reply
      .type(contentType)
      .header("Cache-Control", cacheControl)
      .send(buffer);
  }

  app.get("/api/item-icon", handleItemIcon);
  app.get("/api/v1/item-icon", handleItemIcon);

  // Slots routes
  function registerSlotRoutes(prefix: string) {
    app.get(`${prefix}/slots`, async (_req, reply) => {
      return reply.send(slots.map((s) => s.toJSON()));
    });

    const typedApp = app.withTypeProvider<ZodTypeProvider>();

    typedApp.get(
      `${prefix}/slots/:id`,
      {
        schema: {
          params: z.object({ id: z.coerce.number().min(1).max(4) }),
        },
      },
      async (req, reply) => {
        const slot = slots.find((s) => s.id === req.params.id);
        if (!slot) {
          return reply.status(404).send({ error: "Slot não encontrado" });
        }
        return reply.send(slot.toJSON());
      },
    );

    typedApp.post(
      `${prefix}/slots/:id/login`,
      {
        schema: {
          params: z.object({ id: z.coerce.number().min(1).max(4) }),
          body: z.object({
            email: z.string().email(),
            password: z.string().min(1),
          }),
        },
      },
      async (req, reply) => {
        const slot = slots.find((s) => s.id === req.params.id);
        if (!slot) {
          return reply.status(404).send({ error: "Slot não encontrado" });
        }
        try {
          await slot.login(req.body.email, req.body.password);
          broadcastSSE();
          return reply.send(slot.toJSON());
        } catch (err) {
          broadcastSSE();
          return reply.status(401).send({ error: (err as Error).message });
        }
      },
    );

    typedApp.post(
      `${prefix}/slots/:id/logout`,
      {
        schema: {
          params: z.object({ id: z.coerce.number().min(1).max(4) }),
        },
      },
      async (req, reply) => {
        const slot = slots.find((s) => s.id === req.params.id);
        if (!slot) {
          return reply.status(404).send({ error: "Slot não encontrado" });
        }
        try {
          await slot.disconnect();
        } catch (err) {
          console.error(`[Slot ${slot.id}] Erro ao desconectar:`, err);
        }
        broadcastSSE();
        return reply.send(slot.toJSON());
      },
    );

    typedApp.get(
      `${prefix}/slots/:id/catalog`,
      {
        schema: {
          params: z.object({ id: z.coerce.number().min(1).max(4) }),
        },
      },
      async (req, reply) => {
        const slot = slots.find((s) => s.id === req.params.id);
        if (!slot) {
          return reply.status(404).send({ error: "Slot não encontrado" });
        }
        return reply.send({ hunts: slot.catalog });
      },
    );

    typedApp.post(
      `${prefix}/slots/:id/hunt/start`,
      {
        schema: {
          params: z.object({ id: z.coerce.number().min(1).max(4) }),
          body: z.object({
            huntId: z.string().min(1),
            tier: z.coerce.number().optional().default(0),
          }),
        },
      },
      async (req, reply) => {
        const slot = slots.find((s) => s.id === req.params.id);
        if (!slot) {
          return reply.status(404).send({ error: "Slot não encontrado" });
        }
        try {
          await slot.startHunt(req.body.huntId, req.body.tier);
          broadcastSSE();
          return reply.send(slot.toJSON());
        } catch (err) {
          return reply.status(400).send({ error: (err as Error).message });
        }
      },
    );

    typedApp.post(
      `${prefix}/slots/:id/hunt/leave`,
      {
        schema: {
          params: z.object({ id: z.coerce.number().min(1).max(4) }),
        },
      },
      async (req, reply) => {
        const slot = slots.find((s) => s.id === req.params.id);
        if (!slot) {
          return reply.status(404).send({ error: "Slot não encontrado" });
        }
        try {
          await slot.leaveHunt();
          broadcastSSE();
          return reply.send(slot.toJSON());
        } catch (err) {
          return reply.status(400).send({ error: (err as Error).message });
        }
      },
    );

    typedApp.post(
      `${prefix}/slots/:id/training/start`,
      {
        schema: {
          params: z.object({ id: z.coerce.number().min(1).max(4) }),
          body: z.object({
            skill: z.enum(["sword", "axe", "club", "distance", "magic", "shielding"]),
            repeat: z.boolean().optional().default(false),
          }),
        },
      },
      async (req, reply) => {
        const slot = slots.find((s) => s.id === req.params.id);
        if (!slot) {
          return reply.status(404).send({ error: "Slot não encontrado" });
        }
        try {
          await slot.startTraining(req.body.skill, req.body.repeat);
          broadcastSSE();
          return reply.send(slot.toJSON());
        } catch (err) {
          return reply.status(400).send({ error: (err as Error).message });
        }
      },
    );

    typedApp.post(
      `${prefix}/slots/:id/training/leave`,
      {
        schema: {
          params: z.object({ id: z.coerce.number().min(1).max(4) }),
        },
      },
      async (req, reply) => {
        const slot = slots.find((s) => s.id === req.params.id);
        if (!slot) {
          return reply.status(404).send({ error: "Slot não encontrado" });
        }
        try {
          await slot.leaveTraining();
          broadcastSSE();
          return reply.send(slot.toJSON());
        } catch (err) {
          return reply.status(400).send({ error: (err as Error).message });
        }
      },
    );

    typedApp.post(
      `${prefix}/slots/:id/price-mode`,
      {
        schema: {
          params: z.object({ id: z.coerce.number().min(1).max(4) }),
          body: z.object({
            mode: z.enum(["npc", "auction", "custom"]),
          }),
        },
      },
      async (req, reply) => {
        const slot = slots.find((s) => s.id === req.params.id);
        if (!slot) {
          return reply.status(404).send({ error: "Slot não encontrado" });
        }
        slot.session.setPriceMode(req.body.mode);
        broadcastSSE();
        return reply.send(slot.toJSON());
      },
    );

    typedApp.post(
      `${prefix}/slots/:id/item-price`,
      {
        schema: {
          params: z.object({ id: z.coerce.number().min(1).max(4) }),
          body: z.object({
            itemId: z.coerce.number(),
            price: z.coerce.number().min(0),
          }),
        },
      },
      async (req, reply) => {
        const slot = slots.find((s) => s.id === req.params.id);
        if (!slot) {
          return reply.status(404).send({ error: "Slot não encontrado" });
        }
        slot.session.setCustomPrice(req.body.itemId, req.body.price);
        broadcastSSE();
        return reply.send(slot.toJSON());
      },
    );

    typedApp.post(
      `${prefix}/slots/:id/action-bar/slot`,
      {
        schema: {
          params: z.object({ id: z.coerce.number().min(1).max(4) }),
          body: z.object({
            slot: z.coerce.number().min(0).max(19),
            rule: z.any().optional(),
          }),
        },
      },
      async (req, reply) => {
        const slot = slots.find((s) => s.id === req.params.id);
        if (!slot) {
          return reply.status(404).send({ error: "Slot não encontrado" });
        }
        const slotIndex = req.body.slot;
        if (slot.socket && slot.socket.isOpen()) {
          try {
            slot.socket.send({
              type: "set-action-slot",
              slot: slotIndex,
              rule: req.body.rule ?? null,
            });
          } catch (err) {
            return reply.status(500).send({
              error:
                "Erro ao enviar ao WebSocket: " + (err as Error).message,
            });
          }
        }
        slot.session.setLocalActionSlot(slotIndex, req.body.rule ?? null);
        broadcastSSE();
        return reply.send(slot.toJSON());
      },
    );

    typedApp.post(
      `${prefix}/slots/:id/action-bar/preset`,
      {
        schema: {
          params: z.object({ id: z.coerce.number().min(1).max(4) }),
          body: z.object({
            action: z.enum(["select", "save"]),
            index: z.coerce.number().optional(),
            name: z.string().optional(),
          }),
        },
      },
      async (req, reply) => {
        const slot = slots.find((s) => s.id === req.params.id);
        if (!slot) {
          return reply.status(404).send({ error: "Slot não encontrado" });
        }
        if (slot.socket && slot.socket.isOpen()) {
          try {
            if (req.body.action === "select" && typeof req.body.index === "number") {
              slot.socket.send({
                type: "select-action-bar-preset",
                index: req.body.index,
              });
            } else if (req.body.action === "save" && req.body.name) {
              slot.socket.send({
                type: "save-action-bar-preset",
                name: req.body.name,
              });
            }
          } catch (err) {
            return reply.status(500).send({
              error:
                "Erro ao enviar ao WebSocket: " + (err as Error).message,
            });
          }
        }
        broadcastSSE();
        return reply.send(slot.toJSON());
      },
    );

    typedApp.post(
      `${prefix}/slots/:id/party/invite`,
      {
        schema: {
          params: z.object({ id: z.coerce.number().min(1).max(4) }),
          body: z.object({
            name: z.string().min(1),
          }),
        },
      },
      async (req, reply) => {
        const slot = slots.find((s) => s.id === req.params.id);
        if (!slot) {
          return reply.status(404).send({ error: "Slot não encontrado" });
        }

        const targetName = req.body.name.trim();
        let effectiveSlot = slot;
        const currentParty = slot.session.party;
        if (
          currentParty &&
          currentParty.leaderId !== null &&
          currentParty.leaderId !== undefined
        ) {
          const leaderMember = currentParty.members?.find((m) => m.isLeader);
          const isCurrentSlotLeader =
            currentParty.leaderId === slot.session.gamePlayerId ||
            currentParty.leaderId === slot.character?.id ||
            Boolean(
              leaderMember &&
                slot.character?.name &&
                leaderMember.name.toLowerCase() ===
                  slot.character.name.toLowerCase(),
            );

          if (!isCurrentSlotLeader) {
            const leaderLocalSlot = slots.find((s) => {
              if (s.status !== "connected" && s.status !== "hunting") return false;
              if (
                s.session.gamePlayerId &&
                s.session.gamePlayerId === currentParty.leaderId
              )
                return true;
              if (
                leaderMember &&
                s.character?.name &&
                leaderMember.name.toLowerCase() === s.character.name.toLowerCase()
              )
                return true;
              return false;
            });
            if (leaderLocalSlot && leaderLocalSlot.socket?.isOpen()) {
              effectiveSlot = leaderLocalSlot;
            }
          }
        }

        if (!effectiveSlot.socket || !effectiveSlot.socket.isOpen()) {
          return reply.status(400).send({ error: "Personagem não conectado" });
        }

        try {
          effectiveSlot.socket.send({
            type: "party-invite-name",
            name: targetName,
          });
          broadcastSSE();
          return reply.send({
            success: true,
            message: `Convite enviado para ${targetName}`,
            fromSlot: effectiveSlot.id,
          });
        } catch (err) {
          return reply.status(500).send({
            error: "Erro ao enviar convite: " + (err as Error).message,
          });
        }
      },
    );

    typedApp.post(
      `${prefix}/slots/:id/party/respond`,
      {
        schema: {
          params: z.object({ id: z.coerce.number().min(1).max(4) }),
          body: z.object({
            accept: z.boolean(),
            followLeader: z.boolean().optional(),
          }),
        },
      },
      async (req, reply) => {
        const slot = slots.find((s) => s.id === req.params.id);
        if (!slot) {
          return reply.status(404).send({ error: "Slot não encontrado" });
        }
        if (!slot.socket || !slot.socket.isOpen()) {
          return reply.status(400).send({ error: "Personagem não conectado" });
        }
        try {
          const msg: any = { type: "party-respond", accept: req.body.accept };
          if (req.body.followLeader) {
            msg.followLeader = true;
          }
          slot.socket.send(msg);
          slot.session.partyInvite = null;
          broadcastSSE();
          return reply.send({ success: true, accept: req.body.accept });
        } catch (err) {
          return reply.status(500).send({
            error: "Erro ao responder convite: " + (err as Error).message,
          });
        }
      },
    );

    typedApp.post(
      `${prefix}/slots/:id/party/leave`,
      {
        schema: {
          params: z.object({ id: z.coerce.number().min(1).max(4) }),
        },
      },
      async (req, reply) => {
        const slot = slots.find((s) => s.id === req.params.id);
        if (!slot) {
          return reply.status(404).send({ error: "Slot não encontrado" });
        }
        if (!slot.socket || !slot.socket.isOpen()) {
          return reply.status(400).send({ error: "Personagem não conectado" });
        }
        try {
          slot.socket.send({ type: "party-leave" });
          slot.session.party = null;
          broadcastSSE();
          return reply.send({ success: true });
        } catch (err) {
          return reply.status(500).send({
            error: "Erro ao sair da party: " + (err as Error).message,
          });
        }
      },
    );

    typedApp.post(
      `${prefix}/slots/:id/party/follow-leader`,
      {
        schema: {
          params: z.object({ id: z.coerce.number().min(1).max(4) }),
          body: z.object({
            follow: z.boolean(),
          }),
        },
      },
      async (req, reply) => {
        const slot = slots.find((s) => s.id === req.params.id);
        if (!slot) {
          return reply.status(404).send({ error: "Slot não encontrado" });
        }
        if (!slot.socket || !slot.socket.isOpen()) {
          return reply.status(400).send({ error: "Personagem não conectado" });
        }
        try {
          slot.socket.send({ type: "party-follow-leader", follow: req.body.follow });
          broadcastSSE();
          return reply.send({ success: true, follow: req.body.follow });
        } catch (err) {
          return reply.status(500).send({
            error:
              "Erro ao alternar seguir líder: " + (err as Error).message,
          });
        }
      },
    );

    typedApp.post(
      `${prefix}/slots/:id/party/kick`,
      {
        schema: {
          params: z.object({ id: z.coerce.number().min(1).max(4) }),
          body: z.object({
            playerId: z.coerce.number().optional(),
            id: z.coerce.number().optional(),
          }),
        },
      },
      async (req, reply) => {
        const slot = slots.find((s) => s.id === req.params.id);
        if (!slot) {
          return reply.status(404).send({ error: "Slot não encontrado" });
        }
        const playerId = req.body.playerId || req.body.id;
        if (!playerId) {
          return reply.status(400).send({ error: "ID do jogador é obrigatório" });
        }

        let effectiveSlot = slot;
        const currentParty = slot.session.party;
        if (
          currentParty &&
          currentParty.leaderId !== null &&
          currentParty.leaderId !== undefined
        ) {
          const leaderMember = currentParty.members?.find((m) => m.isLeader);
          const isCurrentSlotLeader =
            currentParty.leaderId === slot.session.gamePlayerId ||
            currentParty.leaderId === slot.character?.id ||
            Boolean(
              leaderMember &&
                slot.character?.name &&
                leaderMember.name.toLowerCase() ===
                  slot.character.name.toLowerCase(),
            );

          if (!isCurrentSlotLeader) {
            const leaderLocalSlot = slots.find((s) => {
              if (s.status !== "connected" && s.status !== "hunting") return false;
              if (
                s.session.gamePlayerId &&
                s.session.gamePlayerId === currentParty.leaderId
              )
                return true;
              if (
                leaderMember &&
                s.character?.name &&
                leaderMember.name.toLowerCase() === s.character.name.toLowerCase()
              )
                return true;
              return false;
            });
            if (leaderLocalSlot && leaderLocalSlot.socket?.isOpen()) {
              effectiveSlot = leaderLocalSlot;
            }
          }
        }

        if (!effectiveSlot.socket || !effectiveSlot.socket.isOpen()) {
          return reply.status(400).send({ error: "Personagem não conectado" });
        }

        try {
          effectiveSlot.socket.send({
            type: "party-kick",
            playerId,
          });
          broadcastSSE();
          return reply.send({ success: true });
        } catch (err) {
          return reply.status(500).send({
            error: "Erro ao expulsar membro: " + (err as Error).message,
          });
        }
      },
    );

    typedApp.post(
      `${prefix}/slots/:id/party/costs-offer`,
      {
        schema: {
          params: z.object({ id: z.coerce.number().min(1).max(4) }),
          body: z.object({
            enabled: z.boolean(),
          }),
        },
      },
      async (req, reply) => {
        const slot = slots.find((s) => s.id === req.params.id);
        if (!slot) {
          return reply.status(404).send({ error: "Slot não encontrado" });
        }
        if (!slot.socket || !slot.socket.isOpen()) {
          return reply.status(400).send({ error: "Personagem não conectado" });
        }
        const party = slot.session.party;
        if (!party) {
          return reply.status(400).send({
            error: "Este personagem não está em nenhuma party.",
          });
        }
        const leaderMember = party.members.find((m) => m.isLeader);
        const isLeader =
          party.leaderId === slot.session.gamePlayerId ||
          party.leaderId === slot.character?.id ||
          Boolean(
            leaderMember &&
              slot.character?.name &&
              leaderMember.name.toLowerCase() === slot.character.name.toLowerCase(),
          );

        if (!isLeader) {
          return reply.status(403).send({
            error:
              "Apenas o líder do grupo pode alterar as configurações de custos da party.",
          });
        }

        try {
          if (req.body.enabled) {
            slot.socket.send({ type: "party-costs-offer", enabled: true });
          } else {
            slot.socket.send({ type: "party-costs-cancel" });
            slot.socket.send({ type: "party-costs-offer", enabled: false });
          }
          broadcastSSE();
          return reply.send({ success: true, enabled: req.body.enabled });
        } catch (err) {
          return reply.status(500).send({
            error:
              "Erro ao alterar custos compartilhados: " +
              (err as Error).message,
          });
        }
      },
    );

    typedApp.post(
      `${prefix}/slots/:id/party/costs-respond`,
      {
        schema: {
          params: z.object({ id: z.coerce.number().min(1).max(4) }),
          body: z.object({
            accept: z.boolean(),
          }),
        },
      },
      async (req, reply) => {
        const slot = slots.find((s) => s.id === req.params.id);
        if (!slot) {
          return reply.status(404).send({ error: "Slot não encontrado" });
        }
        if (!slot.socket || !slot.socket.isOpen()) {
          return reply.status(400).send({ error: "Personagem não conectado" });
        }
        try {
          slot.socket.send({ type: "party-costs-respond", accept: req.body.accept });
          broadcastSSE();
          return reply.send({ success: true, accept: req.body.accept });
        } catch (err) {
          return reply.status(500).send({
            error:
              "Erro ao responder proposta de custos: " + (err as Error).message,
          });
        }
      },
    );

    typedApp.post(
      `${prefix}/slots/:id/party/costs-cancel`,
      {
        schema: {
          params: z.object({ id: z.coerce.number().min(1).max(4) }),
        },
      },
      async (req, reply) => {
        const slot = slots.find((s) => s.id === req.params.id);
        if (!slot) {
          return reply.status(404).send({ error: "Slot não encontrado" });
        }
        if (!slot.socket || !slot.socket.isOpen()) {
          return reply.status(400).send({ error: "Personagem não conectado" });
        }
        try {
          slot.socket.send({ type: "party-costs-cancel" });
          broadcastSSE();
          return reply.send({ success: true });
        } catch (err) {
          return reply.status(500).send({
            error:
              "Erro ao cancelar custos compartilhados: " +
              (err as Error).message,
          });
        }
      },
    );

    typedApp.post(
      `${prefix}/slots/:id/party/transfer-respond`,
      {
        schema: {
          params: z.object({ id: z.coerce.number().min(1).max(4) }),
          body: z.object({
            accept: z.boolean(),
            fromName: z.string().optional(),
          }),
        },
      },
      async (req, reply) => {
        const slot = slots.find((s) => s.id === req.params.id);
        if (!slot) {
          return reply.status(404).send({ error: "Slot não encontrado" });
        }
        const fromName = req.body.fromName || slot.session.transferOffer?.fromName;
        if (!slot.socket || !slot.socket.isOpen()) {
          return reply.status(400).send({ error: "Personagem não conectado" });
        }
        try {
          slot.socket.send({
            type: "transfer-respond",
            fromName,
            accept: req.body.accept,
          });
          slot.session.transferOffer = null;
          broadcastSSE();
          return reply.send({ success: true, accept: req.body.accept });
        } catch (err) {
          return reply.status(500).send({
            error:
              "Erro ao responder transferência de mundo: " +
              (err as Error).message,
          });
        }
      },
    );

    typedApp.post(
      `${prefix}/slots/:id/revive`,
      {
        schema: {
          params: z.object({ id: z.coerce.number().min(1).max(4) }),
        },
      },
      async (req, reply) => {
        const slot = slots.find((s) => s.id === req.params.id);
        if (!slot) {
          return reply.status(404).send({ error: "Slot não encontrado" });
        }
        try {
          await slot.revive();
          broadcastSSE();
          return reply.send(slot.toJSON());
        } catch (err) {
          return reply.status(400).send({ error: (err as Error).message });
        }
      },
    );

    typedApp.post(
      `${prefix}/slots/:id/death/dismiss`,
      {
        schema: {
          params: z.object({ id: z.coerce.number().min(1).max(4) }),
        },
      },
      async (req, reply) => {
        const slot = slots.find((s) => s.id === req.params.id);
        if (!slot) {
          return reply.status(404).send({ error: "Slot não encontrado" });
        }
        try {
          await slot.dismissDeath();
          broadcastSSE();
          return reply.send(slot.toJSON());
        } catch (err) {
          return reply.status(400).send({ error: (err as Error).message });
        }
      },
    );

    typedApp.post(
      `${prefix}/slots/:id/blessings/buy`,
      {
        schema: {
          params: z.object({ id: z.coerce.number().min(1).max(4) }),
          body: z.object({
            id: z.string().optional().default("all"),
          }),
        },
      },
      async (req, reply) => {
        const slot = slots.find((s) => s.id === req.params.id);
        if (!slot) {
          return reply.status(404).send({ error: "Slot não encontrado" });
        }
        try {
          await slot.buyBlessing(req.body.id);
          broadcastSSE();
          return reply.send(slot.toJSON());
        } catch (err) {
          return reply.status(400).send({ error: (err as Error).message });
        }
      },
    );

    typedApp.post(
      `${prefix}/slots/:id/blessings/open`,
      {
        schema: {
          params: z.object({ id: z.coerce.number().min(1).max(4) }),
        },
      },
      async (req, reply) => {
        const slot = slots.find((s) => s.id === req.params.id);
        if (!slot) {
          return reply.status(404).send({ error: "Slot não encontrado" });
        }
        try {
          await slot.openBlessings();
          broadcastSSE();
          return reply.send(slot.toJSON());
        } catch (err) {
          return reply.status(400).send({ error: (err as Error).message });
        }
      },
    );
  }

  registerSlotRoutes("/api");
  registerSlotRoutes("/api/v1");

  // Static files serving for public/
  await app.register(fastifyStatic, {
    root: PUBLIC_DIR,
    prefix: "/",
    wildcard: false,
  });

  // SPA fallback to index.html for non-API routes
  app.setNotFoundHandler(async (req, reply) => {
    if (req.url.startsWith("/api/")) {
      return reply.status(404).send({
        error: "Rota da API não encontrada",
        code: "NOT_FOUND",
        requestId: req.id,
        statusCode: 404,
      });
    }
    const indexHtml = path.join(PUBLIC_DIR, "index.html");
    if (fs.existsSync(indexHtml)) {
      return reply.type("text/html; charset=utf-8").send(fs.readFileSync(indexHtml));
    }
    return reply.status(404).send("Not found");
  });

  async function shutdown(): Promise<void> {
    clearInterval(sseInterval);
    app.log.info("Encerrando servidor e desconectando slots...");
    await slotManager.disconnectAll();
    await app.close();
    await closeDatabasePool();
    await closeRedisClient();
  }

  return { app, slots, broadcastSSE, shutdown };
}
