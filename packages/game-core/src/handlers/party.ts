import type {
  PartyCostsCancelledMessage,
  PartyInviteConfirmMessage,
  PartyInvitedMessage,
  PartyUpdateMessage,
  TransferBeginMessage,
  TransferOfferMessage,
} from "@idlex/protocol";
import type { HuntSession } from "../hunt-session.js";

export function handlePartyUpdate(
  session: HuntSession,
  message: PartyUpdateMessage,
): void {
  if (
    message.leaderId === null ||
    message.leaderId === undefined ||
    !message.members ||
    message.members.length === 0
  ) {
    session.party = null;
  } else {
    session.party = {
      leaderId: message.leaderId,
      sharedCosts: message.sharedCosts || null,
      members: (message.members || []).map((m) => ({
        id: m.id,
        name: m.name,
        level: m.level,
        vocation: m.vocation ?? "none",
        healthPercent: m.healthPercent ?? 100,
        manaPercent: m.manaPercent ?? 100,
        isLeader: m.id === message.leaderId,
        staminaMinutes: m.staminaMinutes ?? null,
        followsLeader: Boolean(m.followsLeader),
        dps: typeof m.dps === "number" ? m.dps : null,
        damageTotal: typeof m.damageTotal === "number" ? m.damageTotal : null,
        hps: typeof m.hps === "number" ? m.hps : null,
        healTotal: typeof m.healTotal === "number" ? m.healTotal : null,
      })),
    };

    // Sincroniza HP e Mana do jogador a partir do update da party
    const me = (message.members || []).find(
      (m) =>
        m.id === session.playerId ||
        m.id === session.gamePlayerId ||
        (session.playerName &&
          m.name &&
          m.name.toLowerCase() === session.playerName.toLowerCase()),
    );
    if (me) {
      if (typeof me.healthPercent === "number" && session.playerState.maxHp) {
        session.playerState.hp = Math.round(
          (session.playerState.maxHp * me.healthPercent) / 100,
        );
      }
      if (typeof me.manaPercent === "number" && session.playerState.maxMana) {
        session.playerState.mana = Math.round(
          (session.playerState.maxMana * me.manaPercent) / 100,
        );
      }
    }
  }
}

export function handlePartyInvited(
  session: HuntSession,
  message: PartyInvitedMessage,
): void {
  if (message.fromName) {
    session.partyInvite = {
      fromId: message.fromId,
      fromName: message.fromName,
      members: Array.isArray(message.members) ? message.members : [],
      receivedAt: Date.now(),
    };
  }
}

export function handleTransferOffer(
  session: HuntSession,
  message: TransferOfferMessage,
): void {
  if (message.fromName) {
    session.transferOffer = {
      fromName: message.fromName,
      receivedAt: Date.now(),
    };
  }
}

export function handleTransferBegin(
  session: HuntSession,
  _message: TransferBeginMessage,
): void {
  session.transferOffer = null;
}

export function handlePartyCostsCancelled(
  session: HuntSession,
  _message: PartyCostsCancelledMessage,
): void {
  if (session.party?.sharedCosts && typeof session.party.sharedCosts === "object") {
    (session.party.sharedCosts as Record<string, unknown>).offerPending = false;
  }
}

export function handlePartyInviteConfirm(
  _session: HuntSession,
  _message: PartyInviteConfirmMessage,
): void {
  // Confirmação de que o convite enviado foi entregue ao alvo
}
