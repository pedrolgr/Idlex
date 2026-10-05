import type { FastifyPluginAsync } from "fastify";
import { getDb, gameAccounts } from "@idlex/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { SlotManager } from "../slots/slot-manager.js";

const accountSlotParamSchema = z.object({
  slot: z.coerce.number().min(1).max(4),
});

const saveAccountSchema = z.object({
  email: z.string().email(),
  password: z.string().optional(),
  remember: z.boolean().default(false),
});

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}***@${domain}`;
}

export function createAccountsRoutes(slotManager: SlotManager): FastifyPluginAsync {
  return async (app) => {
    // Require authentication for all accounts endpoints
    app.addHook("preHandler", app.authenticate);

    // GET /api/v1/accounts - List 4 slots status and saved accounts for current user
    app.get("/", async (req, reply) => {
      const userId = req.userSession!.userId;
      const db = getDb();

      let savedList: Array<{
        slotIndex: number;
        emailHint: string;
        characterName: string | null;
        rememberCredentials: number;
        desiredState: string;
      }> = [];

      if (db) {
        savedList = await db
          .select({
            slotIndex: gameAccounts.slotIndex,
            emailHint: gameAccounts.emailHint,
            characterName: gameAccounts.characterName,
            rememberCredentials: gameAccounts.rememberCredentials,
            desiredState: gameAccounts.desiredState,
          })
          .from(gameAccounts)
          .where(eq(gameAccounts.userId, userId));
      }

      const activeSlots = slotManager.getSlotsForUser(userId);

      const result = [1, 2, 3, 4].map((slotIdx) => {
        const active = activeSlots.find((s) => s.id === slotIdx);
        const saved = savedList.find((s) => s.slotIndex === slotIdx);

        return {
          slot: slotIdx,
          status: active ? active.status : "idle",
          character: active?.character || null,
          savedAccount: saved
            ? {
                emailHint: saved.emailHint,
                characterName: saved.characterName,
                rememberCredentials: Boolean(saved.rememberCredentials),
              }
            : null,
        };
      });

      return reply.send({ accounts: result });
    });

    // PUT /api/v1/accounts/:slot - Save/update account preferences
    app.put("/:slot", async (req, reply) => {
      const parsedParams = accountSlotParamSchema.safeParse(req.params);
      if (!parsedParams.success) {
        return reply.status(400).send({ error: "Slot deve ser entre 1 e 4" });
      }

      const parsedBody = saveAccountSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return reply.status(400).send({ error: "Dados inválidos" });
      }

      const userId = req.userSession!.userId;
      const slotIndex = parsedParams.data.slot;
      const { email, remember } = parsedBody.data;
      const emailHint = maskEmail(email);
      const db = getDb();

      if (db) {
        const [existing] = await db
          .select()
          .from(gameAccounts)
          .where(
            and(
              eq(gameAccounts.userId, userId),
              eq(gameAccounts.slotIndex, slotIndex),
            ),
          )
          .limit(1);

        if (existing) {
          await db
            .update(gameAccounts)
            .set({
              emailHint,
              rememberCredentials: remember ? 1 : 0,
              updatedAt: new Date(),
            })
            .where(eq(gameAccounts.id, existing.id));
        } else {
          await db.insert(gameAccounts).values({
            userId,
            slotIndex,
            emailHint,
            rememberCredentials: remember ? 1 : 0,
          });
        }
      }

      return reply.send({
        message: "Configuração do slot atualizada com sucesso",
        slot: slotIndex,
        emailHint,
        rememberCredentials: remember,
      });
    });

    // DELETE /api/v1/accounts/:slot - Delete saved account & disconnect active session
    app.delete("/:slot", async (req, reply) => {
      const parsedParams = accountSlotParamSchema.safeParse(req.params);
      if (!parsedParams.success) {
        return reply.status(400).send({ error: "Slot deve ser entre 1 e 4" });
      }

      const userId = req.userSession!.userId;
      const slotIndex = parsedParams.data.slot;

      // Disconnect active slot if running
      const activeSlot = slotManager.getSlot(userId, slotIndex);
      if (activeSlot) {
        await activeSlot.disconnect();
      }

      // Hard delete from DB
      const db = getDb();
      if (db) {
        await db
          .delete(gameAccounts)
          .where(
            and(
              eq(gameAccounts.userId, userId),
              eq(gameAccounts.slotIndex, slotIndex),
            ),
          );
      }

      return reply.send({
        message: `Conta do slot ${slotIndex} removida e desconectada`,
      });
    });
  };
}
