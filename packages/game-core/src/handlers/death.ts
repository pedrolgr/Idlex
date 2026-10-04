import type {
  BlessingsStatusMessage,
  DeathFilmOfferMessage,
  DeathHistoryMessage,
  PlayerDiedMessage,
} from "@idlex/protocol";
import type { HuntSession } from "../hunt-session.js";

export function handlePlayerDied(
  session: HuntSession,
  message: PlayerDiedMessage,
): void {
  session.deathInfo.isDead = true;
  session.huntActive = false;
  if (session.playerState.hp !== undefined) {
    session.playerState.hp = 0;
  }
  const diedAt = message.resumedAt ?? message.diedAt ?? Date.now();
  session.deathInfo.diedAt = diedAt;
  if (message.killer) session.deathInfo.killer = message.killer;
  if (message.penalty) {
    if (typeof message.penalty.lostExperience === "number")
      session.deathInfo.lostExperience = message.penalty.lostExperience;
    if (typeof message.penalty.lostLevels === "number")
      session.deathInfo.lostLevels = message.penalty.lostLevels;
    if (typeof message.penalty.blessingsSpent === "number")
      session.deathInfo.blessingsSpent = message.penalty.blessingsSpent;
    if (typeof message.penalty.freeBless === "boolean")
      session.deathInfo.freeBless = message.penalty.freeBless;
    if (Array.isArray(message.penalty.lostItems))
      session.deathInfo.lostItems = message.penalty.lostItems;
  }
  if (Array.isArray(message.hits) && message.hits.length > 0) {
    session.deathInfo.hits = message.hits;
  }
}

export function handleDeathFilmOffer(
  session: HuntSession,
  message: DeathFilmOfferMessage,
): void {
  // Oferta de gravação da morte anterior (pode ser de dias atrás).
  // NÃO define isDead = true. A morte ativa é sinalizada exclusivamente por player-died.
  if (message.diedAt) session.deathInfo.diedAt = message.diedAt;
  if (message.killer) session.deathInfo.killer = message.killer;
  if (message.penalty) {
    if (typeof message.penalty.lostExperience === "number")
      session.deathInfo.lostExperience = message.penalty.lostExperience;
    if (typeof message.penalty.lostLevels === "number")
      session.deathInfo.lostLevels = message.penalty.lostLevels;
    if (typeof message.penalty.blessingsSpent === "number")
      session.deathInfo.blessingsSpent = message.penalty.blessingsSpent;
    if (typeof message.penalty.freeBless === "boolean")
      session.deathInfo.freeBless = message.penalty.freeBless;
    if (Array.isArray(message.penalty.lostItems))
      session.deathInfo.lostItems = message.penalty.lostItems;
  }
}

export function handleDeathHistory(
  session: HuntSession,
  message: DeathHistoryMessage,
): void {
  if (Array.isArray(message.entries) && message.entries.length > 0) {
    const latest = message.entries[0];
    if (latest) {
      if (latest.diedAt) session.deathInfo.diedAt = latest.diedAt;
      if (latest.killer) session.deathInfo.killer = latest.killer;
      if (latest.where) session.deathInfo.where = latest.where;
      if (Array.isArray(latest.skillsLost))
        session.deathInfo.skillsLost = latest.skillsLost;
      if (Array.isArray(latest.hits) && latest.hits.length > 0)
        session.deathInfo.hits = latest.hits;
      if (Array.isArray(latest.blessings))
        session.deathInfo.blessings = latest.blessings;
      if (typeof latest.freeBless === "boolean")
        session.deathInfo.freeBless = latest.freeBless;
      if (Array.isArray(latest.lostItems))
        session.deathInfo.lostItems = latest.lostItems;
      if (typeof latest.levelBefore === "number")
        session.deathInfo.levelBefore = latest.levelBefore;
      if (typeof latest.levelAfter === "number")
        session.deathInfo.levelAfter = latest.levelAfter;
      if (typeof latest.experienceBefore === "number")
        session.deathInfo.experienceBefore = latest.experienceBefore;
      if (typeof latest.experienceAfter === "number")
        session.deathInfo.experienceAfter = latest.experienceAfter;
      if (
        (session.deathInfo.lostExperience === null ||
          session.deathInfo.lostExperience === undefined) &&
        typeof latest.experienceBefore === "number" &&
        typeof latest.experienceAfter === "number"
      ) {
        session.deathInfo.lostExperience = Math.max(
          0,
          latest.experienceBefore - latest.experienceAfter,
        );
      }
      if (
        (session.deathInfo.lostLevels === null ||
          session.deathInfo.lostLevels === undefined) &&
        typeof latest.levelBefore === "number" &&
        typeof latest.levelAfter === "number"
      ) {
        session.deathInfo.lostLevels = Math.max(
          0,
          latest.levelBefore - latest.levelAfter,
        );
      }
    }
  }
}

export function handleBlessingsStatus(
  session: HuntSession,
  message: BlessingsStatusMessage,
): void {
  session.blessings = {
    owned: Array.isArray(message.owned) ? message.owned : [],
    cost: typeof message.cost === "number" ? message.cost : 0,
    freeUntilLevel:
      typeof message.freeUntilLevel === "number" ? message.freeUntilLevel : 80,
    lossReductionPercent:
      typeof message.lossReductionPercent === "number"
        ? message.lossReductionPercent
        : 40,
    equipmentLossPercent:
      typeof message.equipmentLossPercent === "number"
        ? message.equipmentLossPercent
        : 0,
  };
}
