import test from "node:test";
import assert from "node:assert/strict";
import { Slot } from "../apps/api/dist/slot.js";

test("Slot: system-message de desconexão externa desloga slot para idle", async () => {
  let broadcastCount = 0;
  const slot = new Slot(1, () => {
    broadcastCount++;
  });

  slot.status = "hunting";
  slot.session.huntActive = true;
  slot.character = {
    id: 12345,
    name: "Hero",
    level: 50,
    vocation: "knight",
    outfitId: 128,
    outfitColors: { head: 0, body: 0, legs: 0, feet: 0 },
  };

  // Mock socket com listeners
  let messageListener = null;
  const mockSocket = {
    isOpen: () => true,
    onMessage: (fn) => {
      messageListener = fn;
    },
    onClose: () => {},
    onError: () => {},
    send: () => true,
    logout: () => {},
    close: () => {},
  };

  slot.setupSocketEvents(mockSocket);

  // Simula recebimento de mensagem do sistema de login em outro local
  messageListener({
    type: "system-message",
    message: "Você foi desconectado pois seu personagem conectou em outro local.",
  });

  // Aguarda microtask
  await new Promise((resolve) => setTimeout(resolve, 50));

  assert.equal(slot.status, "idle");
  assert.equal(slot.session.huntActive, false);
  assert.ok(slot.errorMessage.includes("outro local"));
  assert.equal(slot.toJSON().status, "idle");
  assert.ok(broadcastCount > 0);
});

test("Slot: close event com código ou motivo de kick desconecta para idle", async () => {
  let broadcastCount = 0;
  const slot = new Slot(2, () => {
    broadcastCount++;
  });

  slot.status = "connected";
  slot.character = {
    id: 999,
    name: "Mage",
    level: 30,
    vocation: "sorcerer",
    outfitId: 130,
    outfitColors: { head: 0, body: 0, legs: 0, feet: 0 },
  };

  let closeListener = null;
  const mockSocket = {
    isOpen: () => true,
    onMessage: () => {},
    onClose: (fn) => {
      closeListener = fn;
    },
    onError: () => {},
    send: () => true,
    logout: () => {},
    close: () => {},
  };

  slot.setupSocketEvents(mockSocket);

  // Simula close event com código 1008 (policy violation / kicked)
  closeListener({ code: 1008, reason: "Duplicate session" });

  await new Promise((resolve) => setTimeout(resolve, 50));

  assert.equal(slot.status, "idle");
  assert.ok(slot.errorMessage.includes("outro local") || slot.errorMessage.includes("Duplicate"));
  assert.equal(slot.toJSON().status, "idle");
  assert.ok(broadcastCount > 0);
});

test("Slot: auto-reconnect aborta imediatamente se personagem já estiver em uso em outro local", async () => {
  let broadcastCount = 0;
  const slot = new Slot(3, () => {
    broadcastCount++;
  });

  slot.status = "hunting";
  slot.session.huntActive = true;
  slot.character = {
    id: 888,
    name: "Archer",
    level: 40,
    vocation: "paladin",
    outfitId: 129,
    outfitColors: { head: 0, body: 0, legs: 0, feet: 0 },
  };

  // Mock ensureSocket que simula rejeição da Huntera por sessão ativa/duplicada
  slot.ensureSocket = async () => {
    const err = new Error("Personagem já está conectado");
    err.status = 409;
    throw err;
  };

  await slot.handleAutoReconnect(false);

  assert.equal(slot.status, "idle");
  assert.equal(slot.reconnecting, false);
  assert.equal(slot.session.huntActive, false);
  assert.ok(slot.errorMessage.includes("outro local") || slot.errorMessage.includes("conectado"));
  assert.equal(slot.toJSON().status, "idle");
  assert.ok(broadcastCount > 0);
});

test("Slot: leaveHunt funciona com segurança mesmo com socket desconectado", async () => {
  const slot = new Slot(4);
  slot.status = "hunting";
  slot.session.huntActive = true;
  slot.socket = null; // Socket desconectado

  const res = await slot.leaveHunt();

  assert.equal(slot.session.huntActive, false);
  assert.equal(res.status, "idle");
  assert.equal(slot.toJSON().status, "idle");
});

test("Slot: toJSON respeita status idle e error mesmo se flag huntActive estiver em memória", async () => {
  const slot = new Slot(1);
  slot.status = "idle";
  slot.errorMessage = "Desconectado por login em outro local.";
  slot.session.huntActive = true; // Se algo anormal deixou flag

  const json = slot.toJSON();
  assert.equal(json.status, "idle");
  assert.equal(json.errorMessage, "Desconectado por login em outro local.");

  slot.status = "error";
  const jsonError = slot.toJSON();
  assert.equal(jsonError.status, "error");
});

test("Slot: detecta que personagem já está em caçada ao conectar e resolve catálogo", async () => {
  let broadcastCount = 0;
  const slot = new Slot(1, () => {
    broadcastCount++;
  });
  slot.status = "connected";
  slot.character = {
    id: 111,
    name: "Hero",
    level: 50,
    vocation: "knight",
    outfitId: 128,
    outfitColors: { head: 0, body: 0, legs: 0, feet: 0 },
  };

  let messageListener = null;
  const mockSocket = {
    isOpen: () => true,
    onMessage: (fn) => {
      messageListener = fn;
    },
    onClose: () => {},
    onError: () => {},
    send: () => true,
  };
  slot.setupSocketEvents(mockSocket);

  // Simula recebimento de catálogo
  messageListener({
    type: "hunt-catalog",
    hunts: [
      { id: "swamp-trolls", name: "Pântano dos Trolls", monsters: [{ name: "Swamp Troll" }] },
    ],
  });

  // Simula servidor avisando que o personagem entrou / já estava na instância da caçada
  messageListener({
    type: "instance-enter",
    instanceId: "swamp-trolls-42",
    scenarioId: "swamp-trolls",
    ambience: "swamp",
  });

  assert.equal(slot.session.huntActive, true);
  assert.equal(slot.session.huntId, "swamp-trolls");
  assert.equal(slot.session.huntName, "Pântano dos Trolls");
  assert.equal(slot.status, "hunting");
  assert.equal(slot.toJSON().status, "hunting");
  assert.ok(broadcastCount > 0);

  // Simula atualização do analisador da caçada em andamento
  messageListener({
    type: "hunt-analyzer-session",
    startedAt: Date.now() - 60000,
    durationMs: 60000,
  });
  messageListener({
    type: "hunt-analyzer-update",
    startedAt: Date.now() - 60000,
    durationMs: 60000,
    kills: 15,
    experience: 5000,
    waste: 200,
    lootValue: 1200,
  });

  assert.equal(slot.session.monsterDeaths, 15);
  assert.equal(slot.session.experienceGained, 5000);
  assert.equal(slot.session.waste, 200);
  assert.equal(slot.session.lootValue, 1200);
});

test("Slot: leaveHunt aguarda confirmação de retorno à cidade antes de transicionar status", async () => {
  const slot = new Slot(2);
  slot.status = "hunting";
  slot.session.huntActive = true;
  slot.session.huntId = "swamp-trolls";

  let sentMessages = [];
  let messageListener = null;
  const mockSocket = {
    isOpen: () => true,
    onMessage: (fn) => {
      messageListener = fn;
    },
    onClose: () => {},
    onError: () => {},
    send: (msg) => {
      sentMessages.push(msg);
      return true;
    },
  };
  slot.setupSocketEvents(mockSocket);
  slot.socket = mockSocket;

  // Inicia leaveHunt
  const leavePromise = slot.leaveHunt();

  // Verifica que enviou mensagem de saída
  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0].type, "leave-hunt");

  // Simula servidor confirmando entrada na cidade após 200ms
  await new Promise((r) => setTimeout(r, 200));
  messageListener({
    type: "instance-enter",
    instanceId: "city-global",
    scenarioId: "main-city",
  });

  const res = await leavePromise;
  assert.equal(slot.session.huntActive, false);
  assert.equal(slot.status, "connected");
  assert.equal(res.status, "connected");
});

