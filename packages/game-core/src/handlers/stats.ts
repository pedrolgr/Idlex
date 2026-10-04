import type {
  BestiaryProgressMessage,
  ExperienceGainMessage,
  PlayerStatsMessage,
  PlayerVitalsMessage,
} from "@idlex/protocol";
import type { HuntSession } from "../hunt-session.js";

export function handleExperienceGain(
  session: HuntSession,
  message: ExperienceGainMessage,
): void {
  if (typeof message.value === "number") {
    session.experienceGained += message.value;
  }
}

export function handlePlayerStats(
  session: HuntSession,
  message: PlayerStatsMessage,
): void {
  if (typeof message.level === "number") {
    session.playerState.level = message.level;
  }
  if (typeof message.huntSessionRemainingMs === "number") {
    session.huntSessionRemainingMs = message.huntSessionRemainingMs;
  }
  if (typeof message.mana === "number") session.playerState.mana = message.mana;
  if (typeof message.maxMana === "number")
    session.playerState.maxMana = message.maxMana;
  if (typeof message.health === "number")
    session.playerState.hp = message.health;
  if (typeof message.maxHealth === "number")
    session.playerState.maxHp = message.maxHealth;
  if (typeof message.hp === "number") session.playerState.hp = message.hp;
  if (typeof message.maxHp === "number")
    session.playerState.maxHp = message.maxHp;
  if (typeof message.staminaMs === "number")
    session.playerState.staminaMs = message.staminaMs;
  if (typeof message.staminaDraining === "boolean")
    session.playerState.staminaDraining = message.staminaDraining;

  // XP e Nível
  if (typeof message.experience === "number")
    session.experience = message.experience;
  if (typeof message.experienceNeeded === "number")
    session.experienceNeeded = message.experienceNeeded;

  // Magic Level
  if (typeof message.magicLevel === "number")
    session.magicLevel = message.magicLevel;
  if (typeof message.magicProgress === "number")
    session.magicProgress = message.magicProgress;
  if (typeof message.magicProgressNeeded === "number")
    session.magicProgressNeeded = message.magicProgressNeeded;

  // Habilidades (Skills)
  if (message.skills && typeof message.skills === "object") {
    session.skills = { ...session.skills, ...message.skills };
  }
  if (message.skillProgress && typeof message.skillProgress === "object") {
    session.skillProgress = { ...session.skillProgress, ...message.skillProgress };
  }
  if (
    message.skillProgressNeeded &&
    typeof message.skillProgressNeeded === "object"
  ) {
    session.skillProgressNeeded = {
      ...session.skillProgressNeeded,
      ...message.skillProgressNeeded,
    };
  }
}

export function handlePlayerVitals(
  session: HuntSession,
  message: PlayerVitalsMessage,
): void {
  if (typeof message.hp === "number") session.playerState.hp = message.hp;
  if (typeof message.maxHp === "number") session.playerState.maxHp = message.maxHp;
  if (typeof message.health === "number") session.playerState.hp = message.health;
  if (typeof message.maxHealth === "number")
    session.playerState.maxHp = message.maxHealth;
  if (typeof message.mana === "number") session.playerState.mana = message.mana;
  if (typeof message.maxMana === "number")
    session.playerState.maxMana = message.maxMana;
}

export function handleBestiaryProgress(
  session: HuntSession,
  message: BestiaryProgressMessage,
): void {
  if (message.kills && typeof message.kills === "object") {
    for (const [monster, count] of Object.entries(message.kills)) {
      const clean = monster.toLowerCase().replace(/[^a-z0-9]/g, "");
      session.bestiaryKills.set(clean, count);
    }
  }
  if (typeof message.completed === "number")
    session.bestiarySummary.completed = message.completed;
  if (typeof message.total === "number")
    session.bestiarySummary.total = message.total;
  if (typeof message.bonusPercent === "number")
    session.bestiarySummary.bonusPercent = message.bonusPercent;
}
