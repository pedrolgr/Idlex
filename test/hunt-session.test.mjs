import test from "node:test";
import assert from "node:assert/strict";
import { Writable } from "node:stream";
import { HuntSession, searchHunts, parseHuntTier, formatDuration, formatStamina, getStaminaTier, formatEstimatedTime } from "@idlex/game-core";

test("HuntSession: tracks kills across multiple monster types", () => {
  const session = new HuntSession({ huntId: "folda-hunt", huntName: "Folda Icefields", tier: 0 });

  // 1. Jogador aparece
  session.handleMessage({
    type: "creature-appear",
    creature: { id: 100, kind: "player", name: "Gatonet", level: 58 },
  });

  // 2. Monstros de tipos diferentes aparecem
  session.handleMessage({
    type: "creature-appear",
    creature: { id: 101, kind: "monster", name: "Frost Troll" },
  });
  session.handleMessage({
    type: "creature-appear",
    creature: { id: 102, kind: "monster", name: "Frost Troll" },
  });
  session.handleMessage({
    type: "creature-appear",
    creature: { id: 103, kind: "monster", name: "Polar Bear" },
  });
  session.handleMessage({
    type: "creature-appear",
    creature: { id: 104, kind: "monster", name: "Winter Wolf" },
  });

  // 3. Monstros morrem (creature-disappear)
  session.handleMessage({ type: "creature-disappear", id: 101 }); // Frost Troll #1
  session.handleMessage({ type: "creature-disappear", id: 102 }); // Frost Troll #2
  session.handleMessage({ type: "creature-disappear", id: 103 }); // Polar Bear
  session.handleMessage({ type: "creature-disappear", id: 100 }); // Jogador desaparece (NÃO deve contar como kill!)
  session.handleMessage({ type: "creature-disappear", id: 999 }); // Criatura desconhecida (NÃO deve quebrar nem contar)

  // Verificações
  assert.equal(session.monsterDeaths, 3, "Total de monstros mortos deve ser 3");
  assert.equal(session.killsByName.get("Frost Troll"), 2, "2 Frost Trolls mortos");
  assert.equal(session.killsByName.get("Polar Bear"), 1, "1 Polar Bear morto");
  assert.equal(session.killsByName.get("Winter Wolf"), undefined, "Winter Wolf ainda não morreu");
  assert.equal(session.killsByName.get("Gatonet"), undefined, "Jogador não pode constar como kill");
});

test("HuntSession: completely ignores statues (Kamegord, Duth, Donato), NPCs, and city entities", () => {
  const session = new HuntSession();

  // 1. O jogador está no templo antes de entrar na hunt. Aparecem estátuas de pódio, NPCs e jogadores.
  session.handleMessage({
    type: "creature-appear",
    creature: { id: 301, kind: "statue", name: "Kamegord", podiumRank: 1 },
  });
  session.handleMessage({
    type: "creature-appear",
    creature: { id: 302, kind: "statue", name: "Duth", podiumRank: 2 },
  });
  session.handleMessage({
    type: "creature-appear",
    creature: { id: 303, kind: "statue", name: "Donato", podiumRank: 3 },
  });
  session.handleMessage({
    type: "creature-appear",
    creature: { id: 304, kind: "npc", name: "Eremo" },
  });
  session.handleMessage({
    type: "creature-appear",
    creature: { id: 305, kind: "player", name: "Haslam" },
  });

  // 2. Entra na caçada de ratos (validMonsters: ["Rat"])
  session.setHunt("rat-hunt", "Rat Cellars", ["Rat"]);

  // 3. Ao ser teleportado para a arena, as entidades da cidade recebem creature-disappear
  session.handleMessage({ type: "creature-disappear", id: 301 }); // Kamegord (estátua)
  session.handleMessage({ type: "creature-disappear", id: 302 }); // Duth (estátua)
  session.handleMessage({ type: "creature-disappear", id: 303 }); // Donato (estátua)
  session.handleMessage({ type: "creature-disappear", id: 304 }); // Eremo (NPC)
  session.handleMessage({ type: "creature-disappear", id: 305 }); // Haslam (player)

  // 4. Verificação: ZERO mortes contabilizadas
  assert.equal(session.monsterDeaths, 0, "Nenhuma estátua, NPC ou jogador pode ser contado como monstro");
  assert.equal(session.killsByName.size, 0);

  // 5. Monstro real da caçada aparece e morre
  session.handleMessage({
    type: "creature-appear",
    creature: { id: 401, kind: "monster", name: "Rat" },
  });
  session.handleMessage({ type: "creature-disappear", id: 401 });

  assert.equal(session.monsterDeaths, 1);
  assert.equal(session.killsByName.get("Rat"), 1);
});

test("HuntSession: tracks experience, stats and vitals", () => {
  const session = new HuntSession({ huntId: "rat-hunt", huntName: "Rat Cellars" });

  session.handleMessage({ type: "experience-gain", value: 150 });
  session.handleMessage({ type: "experience-gain", value: 200 });
  session.handleMessage({ type: "player-stats", level: 59, huntSessionRemainingMs: 3600000 });
  session.handleMessage({ type: "player-vitals", hp: 850, maxHp: 1120 });
  session.handleMessage({ type: "hunt-pending", remainingMs: 45000 });

  assert.equal(session.experienceGained, 350);
  assert.equal(session.playerState.level, 59);
  assert.equal(session.playerState.hp, 850);
  assert.equal(session.playerState.maxHp, 1120);
  assert.equal(session.huntPending, true);
  assert.equal(session.huntSessionRemainingMs, 45000);
});

test("HuntSession: processes hunt-analyzer-update with profit, waste, loot and supplies", () => {
  const session = new HuntSession({ huntId: "dwarf-hunt", huntName: "Dwarf Mines" });

  session.handleMessage({
    type: "hunt-analyzer-update",
    startedAt: Date.now() - 60000,
    durationMs: 60000,
    kills: 42,
    experience: 25000,
    lootValue: 8500,
    waste: 2100,
    supplies: [
      { itemId: 268, name: "mana potion", count: 14, value: 700 },
      { itemId: 266, name: "health potion", count: 28, value: 1400 },
    ],
    loot: [
      { itemId: 3031, name: "gold coin", count: 3200, value: 3200 },
      { itemId: 3274, name: "axe", count: 2, value: 300 },
      { itemId: 5880, name: "iron ore", count: 5, value: 5000 },
    ],
  });

  assert.equal(session.monsterDeaths, 42);
  assert.equal(session.experienceGained, 25000);
  assert.equal(session.lootValue, 8500);
  assert.equal(session.waste, 2100);
  assert.equal(session.balance, 6400, "Lucro deve ser 8500 - 2100 = 6400");
  assert.equal(session.supplies.length, 2);
  assert.equal(session.loot.length, 3);

  // Testa visualização detalhada
  assert.equal(session.showDetails, false);
  session.toggleDetails();
  assert.equal(session.showDetails, true);

  const lines = session.formatStatusLines();
  const fullText = lines.join("\n");
  assert.ok(fullText.includes("Lucro: +6.400 gp"));
  assert.ok(fullText.includes("iron ore x5"));
  assert.ok(fullText.includes("mana potion x14"));
});

test("HuntSession: handles hunt-leave-pending and resetSession", () => {
  const session = new HuntSession();
  session.setHunt("orc-hunt", "Orc Camp");
  assert.equal(session.huntActive, true);

  session.handleMessage({ type: "hunt-leave-pending", remainingMs: 5000 });
  assert.equal(session.leavePendingMs, 5000);

  const lines = session.formatStatusLines();
  assert.ok(lines.some((l) => l.includes("Saindo da caçada em 5s")));

  session.resetSession();
  assert.equal(session.huntActive, false);
  assert.equal(session.huntId, null);
  assert.equal(session.monsterDeaths, 0);
  assert.equal(session.lootValue, 0);
  assert.equal(session.waste, 0);
});

test("HuntSession: renderStatus renders without ReferenceError or exceptions", () => {
  const session = new HuntSession({ huntId: "folda-hunt", huntName: "Folda Icefields" });

  session.handleMessage({
    type: "creature-appear",
    creature: { id: 201, kind: "monster", name: "Frost Troll" },
  });
  session.handleMessage({ type: "creature-disappear", id: 201 });

  let output = "";
  const mockStream = new Writable({
    write(chunk, encoding, callback) {
      output += chunk.toString();
      callback();
    },
  });
  mockStream.isTTY = true;

  // Primeiro render
  assert.doesNotThrow(() => session.renderStatus(mockStream));
  assert.ok(output.includes("Folda Icefields"));
  assert.ok(output.includes("Frost Troll: 1"));

  // Segundo render (testa caminho com lastStatusLines > 0)
  assert.doesNotThrow(() => session.renderStatus(mockStream));
});

test("formatDuration: formats milliseconds to friendly string", () => {
  assert.equal(formatDuration(0), "00s");
  assert.equal(formatDuration(45000), "0m 45s");
  assert.equal(formatDuration(125000), "2m 05s");
  assert.equal(formatDuration(3665000), "1h 01m 05s");
});

test("searchHunts: finds hunts by partial name, displayName or id", () => {
  const catalog = [
    { id: "rat-hunt", name: "Rat Cellars" },
    { id: "folda-hunt", name: "Folda Icefields" },
    { id: "cyclops-hunt", displayName: "Cyclops Plains" },
    { id: "dragon-lair", name: "Dragon Lair" },
  ];

  // Match exato por id
  assert.deepEqual(searchHunts(catalog, "folda-hunt"), [{ id: "folda-hunt", name: "Folda Icefields" }]);

  // Match parcial por nome (case insensitive)
  assert.deepEqual(searchHunts(catalog, "icefields"), [{ id: "folda-hunt", name: "Folda Icefields" }]);
  assert.deepEqual(searchHunts(catalog, "FOLDA"), [{ id: "folda-hunt", name: "Folda Icefields" }]);

  // Match por displayName
  assert.deepEqual(searchHunts(catalog, "plains"), [{ id: "cyclops-hunt", displayName: "Cyclops Plains" }]);

  // Múltiplos matches
  const multiple = searchHunts(catalog, "hunt");
  assert.equal(multiple.length, 3);

  // Sem match
  assert.deepEqual(searchHunts(catalog, "demon"), []);
  assert.deepEqual(searchHunts(catalog, ""), []);
  assert.deepEqual(searchHunts(null, "rat"), []);
});

test("parseHuntTier: handles tiers properly", () => {
  assert.equal(parseHuntTier("0"), 0);
  assert.equal(parseHuntTier("1"), 1);
  assert.equal(parseHuntTier("2"), 2);
  assert.equal(parseHuntTier(undefined), 0);
  assert.equal(parseHuntTier(""), 0);
  assert.equal(parseHuntTier("99"), 0);
  assert.equal(parseHuntTier("invalid"), 0);
});

test("character outfit: builds valid URL and fallback structure", () => {
  const char = {
    id: "42204",
    name: "Gatonet",
    level: 58,
    vocation: "knight",
    outfitId: 128,
    outfitColors: { head: 0, body: 0, legs: 114, feet: 41 },
  };

  const outfitId = char.outfitId || 128;
  const colors = char.outfitColors || {};
  const voc = char.vocation || "none";
  const url = `/api/avatar?outfitId=${outfitId}&head=${colors.head || 0}&body=${colors.body || 0}&legs=${colors.legs || 0}&feet=${colors.feet || 0}&vocation=${encodeURIComponent(voc)}`;

  assert.equal(url, "/api/avatar?outfitId=128&head=0&body=0&legs=114&feet=41&vocation=knight");
  assert.equal(char.vocation, "knight");
});

test("HuntSession: tracks supplies and calculates waste using official Huntera prices", () => {
  const session = new HuntSession({ huntId: "mummy-hunt", huntName: "Burial Chambers" });
  session.setPlayerId(12345);

  // Usa 2 Health Potions (itemId 266, 50 gp cada)
  session.handleMessage({ type: "creature-speech", id: 12345, kind: "spell", text: "Aaaah...", itemId: 266 });
  session.handleMessage({ type: "creature-speech", id: 12345, kind: "spell", text: "Aaaah...", itemId: 266 });

  // Usa 3 Mana Potions (itemId 268, 56 gp cada)
  session.handleMessage({ type: "creature-speech", id: 12345, kind: "spell", text: "Aaaah...", itemId: 268 });
  session.handleMessage({ type: "creature-speech", id: 12345, kind: "spell", text: "Aaaah...", itemId: 268 });
  session.handleMessage({ type: "creature-speech", id: 12345, kind: "spell", text: "Aaaah...", itemId: 268 });

  // Usa 1 Great Fireball Rune (itemId 3191, 60 gp cada)
  session.handleMessage({ type: "creature-speech", id: 12345, kind: "spell", text: "Great Fireball", itemId: 3191 });

  // Gasto esperado: (2 * 50) + (3 * 56) + (1 * 60) = 100 + 168 + 60 = 328 gp
  assert.equal(session.realtimeWaste, 328);
  assert.equal(session.waste, 328);

  const json = session.toJSON();
  assert.equal(json.totalSuppliesCost, 328);
  assert.equal(json.suppliesUsed.length, 3);

  const manaPot = json.suppliesUsed.find((s) => s.itemId === 268);
  assert.ok(manaPot);
  assert.equal(manaPot.count, 3);
  assert.equal(manaPot.unitPrice, 56);
  assert.equal(manaPot.totalCost, 168);

  const hpPot = json.suppliesUsed.find((s) => s.itemId === 266);
  assert.ok(hpPot);
  assert.equal(hpPot.count, 2);
  assert.equal(hpPot.unitPrice, 50);
  assert.equal(hpPot.totalCost, 100);

  const gfb = json.suppliesUsed.find((s) => s.itemId === 3191);
  assert.ok(gfb);
  assert.equal(gfb.count, 1);
  assert.equal(gfb.unitPrice, 60);
  assert.equal(gfb.totalCost, 60);
});

test("HuntSession: updates inventory and gold via inventory-update and equipped-items", () => {
  const session = new HuntSession({ huntId: "rat-hunt" });

  session.handleMessage({
    type: "inventory-update",
    gold: 306063,
    slotCount: 20,
    satchelCount: 5,
    changes: [
      { container: "backpack", index: 0, item: { itemId: 3031, count: 100, name: "gold coin" } },
      { container: "backpack", index: 1, item: { itemId: 3607, count: 86, name: "cheese" } },
    ],
  });

  const json = session.toJSON();
  assert.equal(json.inventory.gold, 306063);
  assert.equal(json.inventory.backpack.length, 2);
  assert.equal(json.inventory.backpack[0].name, "gold coin");
  assert.equal(json.inventory.backpack[1].count, 86);
});

test("HuntSession: collects drops and updates loot in real time", () => {
  const session = new HuntSession({ huntId: "mummy-hunt" });

  session.handleMessage({
    type: "item-on-ground",
    item: { itemId: 3031, name: "gold coin", count: 62 },
  });

  session.handleMessage({
    type: "loot-add",
    item: { itemId: 3492, name: "worm", count: 2 },
  });

  const json = session.toJSON();
  assert.equal(json.loot.length, 2);
  const gold = json.loot.find((l) => l.name === "gold coin");
  assert.ok(gold);
  assert.equal(gold.count, 62);

  const worm = json.loot.find((l) => l.name === "worm");
  assert.ok(worm);
  assert.equal(worm.count, 2);
});

test("formatStamina and getStaminaTier: formats hours/minutes and calculates correct tiers", () => {
  assert.equal(formatStamina(42455050), "11h 47m");
  assert.equal(getStaminaTier(42455050), "red");

  // 42 horas completas
  assert.equal(formatStamina(42 * 3600000), "42h 00m");
  assert.equal(getStaminaTier(42 * 3600000), "green");

  // 40 horas e 30 minutos (green)
  assert.equal(formatStamina(40.5 * 3600000), "40h 30m");
  assert.equal(getStaminaTier(40.5 * 3600000), "green");

  // 25 horas (orange)
  assert.equal(formatStamina(25 * 3600000), "25h 00m");
  assert.equal(getStaminaTier(25 * 3600000), "orange");

  // 14 horas exatas (orange)
  assert.equal(formatStamina(14 * 3600000), "14h 00m");
  assert.equal(getStaminaTier(14 * 3600000), "orange");

  // 13 horas e 59 minutos (red)
  assert.equal(formatStamina(13.98 * 3600000), "13h 58m");
  assert.equal(getStaminaTier(13.98 * 3600000), "red");

  // Casos nulos ou zerados
  assert.equal(formatStamina(0), "0h 00m");
  assert.equal(formatStamina(null), null);
  assert.equal(formatStamina(undefined), null);
  assert.equal(getStaminaTier(null), "orange");

  // No player-stats da sessão
  const session = new HuntSession({ huntId: "stamina-test" });
  session.handleMessage({
    type: "player-stats",
    staminaMs: 42455050,
    staminaDraining: true,
  });
  const json = session.toJSON();
  assert.equal(json.playerState.staminaMs, 42455050);
  assert.equal(json.playerState.staminaFormatted, "11h 47m");
  assert.equal(json.playerState.staminaTier, "red");
  assert.equal(json.playerState.staminaDraining, true);
  assert.equal(json.staminaFormatted, "11h 47m");
});

test("HuntSession: balance is strictly from items that entered the bag, ignoring floor drops", () => {
  const session = new HuntSession({ huntId: "mummy-hunt" });

  // 1. Jogador conecta e tem 1000 gold na bolsa
  session.handleMessage({
    type: "inventory-update",
    gold: 1000,
    slotCount: 20,
    changes: [],
  });

  // Inicia caçada
  session.setHunt("mummy-hunt", "Mummy Pyramid");

  // 2. Monstro é morto e derruba 50 gold coins no chão + 1 yellow piece of cloth no chão
  session.handleMessage({
    type: "item-on-ground",
    item: { itemId: 3031, name: "gold coin", count: 50 },
  });
  session.handleMessage({
    type: "item-on-ground",
    item: { itemId: 5914, name: "yellow piece of cloth", count: 1 },
  });

  // Neste momento, itens caíram no chão mas NADA entrou na bolsa ainda!
  let json = session.toJSON();
  assert.equal(json.loot.length, 2, "Drops no chão devem ser visíveis na lista de loot");
  assert.equal(json.lootValue, 0, "Loot value deve ser ZERO pois nada entrou na bag");
  assert.equal(json.balance, 0, "Balance deve ser ZERO");

  // 3. Jogador gasta 1 Mana Potion (56 gp)
  session.handleMessage({
    type: "creature-speech",
    itemId: 268,
    text: "Aaaah...",
  });
  json = session.toJSON();
  assert.equal(json.waste, 56);
  assert.equal(json.balance, -56, "Com 0 loot na bag e 56 de waste, balance é -56 gp");

  // 4. Jogador recolhe 50 gold coins e 1 yellow piece of cloth para a mochila!
  session.handleMessage({
    type: "inventory-update",
    gold: 1050, // +50 gold coins
    changes: [
      { container: "backpack", index: 0, item: { itemId: 5914, name: "yellow piece of cloth", count: 1 } },
    ],
  });

  json = session.toJSON();
  // 50 gold + 1 yellow piece of cloth (150 gp) = 200 gp de loot na bag!
  assert.equal(json.goldGainedInBag, 50);
  assert.equal(json.lootValue, 200, "50 gold + 150 gp do yellow cloth = 200 gp");
  assert.equal(json.waste, 56);
  assert.equal(json.balance, 144, "200 gp loot - 56 gp waste = +144 gp balance");

  // 5. Servidor envia hunt-analyzer-update com lootValue inflado (por exemplo 10000 de outros monstros/chão)
  session.handleMessage({
    type: "hunt-analyzer-update",
    lootValue: 10000,
    waste: 56,
  });

  json = session.toJSON();
  // Nosso saldo estrito da mochila não é sobrescrito pelo lootValue do chão!
  assert.equal(json.lootValue, 200, "Saldo estrito da mochila permanece 200 gp");
  assert.equal(json.balance, 144, "Balance permanece 144 gp");
});

test("HuntSession: tracks experience progress, remaining XP and percentage", () => {
  const session = new HuntSession({ huntId: "elf-hunt" });

  session.handleMessage({
    type: "player-stats",
    experience: 141666,
    experienceNeeded: 159700,
  });

  const json = session.toJSON();
  assert.equal(json.experience, 141666);
  assert.equal(json.experienceNeeded, 159700);
  assert.equal(json.remainingXp, 18034, "Faltam 18034 XP para upar");
  assert.equal(json.xpPercent, 88, "Progresso deve ser 88%");
});

test("HuntSession: tracks skills, magic level and calculates remaining points", () => {
  const session = new HuntSession({ huntId: "dragon-hunt" });

  session.handleMessage({
    type: "player-stats",
    magicLevel: 7,
    magicProgress: 2244001,
    magicProgressNeeded: 3499200,
    skills: { sword: 77, shielding: 77, axe: 10 },
    skillProgress: { sword: 3353, shielding: 52692, axe: 50 },
    skillProgressNeeded: { sword: 29667, shielding: 59334, axe: 100 },
  });

  const json = session.toJSON();
  assert.equal(Array.isArray(json.skills), true);

  const ml = json.skills.find((s) => s.id === "magic");
  assert.ok(ml);
  assert.equal(ml.level, 7);
  assert.equal(ml.remaining, 3499200 - 2244001);
  assert.equal(ml.percent, 64);

  const sword = json.skills.find((s) => s.id === "sword");
  assert.ok(sword);
  assert.equal(sword.level, 77);
  assert.equal(sword.remaining, 29667 - 3353);
  assert.equal(sword.percent, 11);
});

test("HuntSession: tracks bestiary kills alongside current hunt kills", () => {
  const session = new HuntSession({ huntId: "mummy-hunt", huntName: "Mummy Pyramid" });

  // 1. Servidor envia dados do Bestiário da conta
  session.handleMessage({
    type: "bestiary-update",
    kills: { mummy: 2252, ghoul: 217 },
    summary: { totalKills: 2469 },
  });

  // 2. Abate de monstro na caçada atual
  session.handleMessage({
    type: "creature-appear",
    creature: { id: 501, kind: "monster", name: "Mummy" },
  });
  session.handleMessage({ type: "creature-disappear", id: 501 });

  const json = session.toJSON();
  assert.equal(json.monsterDeaths, 1);
  assert.equal(json.bestiary.kills.mummy, 2252);

  const mummyDetailed = json.killsDetailed.find((k) => k.name === "Mummy");
  assert.ok(mummyDetailed);
  assert.equal(mummyDetailed.count, 1, "1 abate na sessão atual");
  assert.equal(mummyDetailed.bestiaryKills, 2252, "2252 abates históricos no bestiário");
});

test("HuntSession: supports pricing modes (npc, auction, custom) and custom price overriding", () => {
  const session = new HuntSession({ huntId: "mummy-hunt" });

  // 1. Recebe lista de preços do servidor (market-prices)
  session.handleMessage({
    type: "market-prices",
    npc: [[5914, 150]], // yellow piece of cloth = 150 gp no NPC
    auction: [[5914, 450]], // yellow piece of cloth = 450 gp no Leilão
  });

  // 2. Coleta 2 yellow cloth na bolsa
  session.handleMessage({
    type: "inventory-update",
    gold: 0,
    changes: [
      { container: "backpack", index: 0, item: { itemId: 5914, name: "yellow piece of cloth", count: 2 } },
    ],
  });

  // Modo padrão: NPC -> 2 * 150 = 300 gp
  let json = session.toJSON();
  assert.equal(json.priceMode, "npc");
  assert.equal(json.itemsValue, 300);
  assert.equal(json.lootValue, 300);

  // Muda para Leilão (auction) -> 2 * 450 = 900 gp
  session.setPriceMode("auction");
  json = session.toJSON();
  assert.equal(json.priceMode, "auction");
  assert.equal(json.itemsValue, 900);
  assert.equal(json.lootValue, 900);

  // Muda para Preço Próprio (custom) e define 600 gp
  session.setPriceMode("custom");
  session.setCustomPrice(5914, 600);
  json = session.toJSON();
  assert.equal(json.priceMode, "custom");
  assert.equal(json.itemsValue, 1200); // 2 * 600
  assert.equal(json.lootValue, 1200);

  // Também suporta atualização via mensagem oficial do servidor "item-values"
  session.setPriceMode("auction");
  session.handleMessage({
    type: "item-values",
    npc: [[5914, 200]],
    auction: [[5914, 800]],
  });
  json = session.toJSON();
  assert.equal(json.itemsValue, 1600); // 2 * 800
  assert.equal(json.lootValue, 1600);

  // Fallback para HUNTERA_AUCTION_PRICES quando não há override específico recebido
  const session2 = new HuntSession({ huntId: "hunt-fallback" });
  session2.handleMessage({
    type: "inventory-update",
    gold: 0,
    changes: [
      { container: "backpack", index: 0, item: { itemId: 811, name: "terra legs", count: 1 } },
    ],
  });
  session2.setPriceMode("auction");
  const json2 = session2.toJSON();
  assert.equal(json2.itemsValue, 15895);
});

test("HuntSession: includes gold in bag directly into profit/balance", () => {
  const session = new HuntSession({ huntId: "gold-hunt" });

  // Jogador começa com 500 gold
  session.handleMessage({
    type: "inventory-update",
    gold: 500,
  });

  session.setHunt("gold-hunt", "Gold Cellars");

  // Durante a caçada, gasta 1 pot (56 gp waste) e ganha 300 gp na bolsa (total 800) + 1 item de 100 gp
  session.handleMessage({
    type: "creature-speech",
    itemId: 268,
    text: "Aaaah...",
  });
  session.handleMessage({
    type: "inventory-update",
    gold: 800,
    changes: [
      { container: "backpack", index: 0, item: { itemId: 3079, name: "boots of haste", count: 1, value: 30000 } },
    ],
  });

  const json = session.toJSON();
  assert.equal(json.totalGold, 800, "Saldo total de moedas do jogador é 800 gp");
  assert.equal(json.goldGainedInBag, 300, "Ganhou 300 gold durante a caçada");
  assert.equal(json.itemsValue, 30000, "Item vale 30000 gp");
  assert.equal(json.lootValue, 30300, "Loot value total = 300 gold + 30000 itens = 30300 gp");
  assert.equal(json.waste, 56, "Gasto com suprimento = 56 gp");
  assert.equal(json.balance, 30244, "Lucro = 30300 - 56 = 30244 gp");
});

test("HuntSession: tracks supplies even when creature-speech message.id is WebSocket creature ID", () => {
  const session = new HuntSession({ huntId: "mummy-hunt" });
  // playerId da API REST é 142
  session.setPlayerId(142);
  session.setPlayerName("Gatonet");

  // No jogo, a criatura aparece com id 2045101
  session.handleMessage({
    type: "creature-appear",
    creature: { id: 2045101, kind: "player", name: "Gatonet" },
  });

  // O jogador usa 3x Mana Potion (itemId 268) emitido com id 2045101
  session.handleMessage({
    type: "creature-speech",
    id: 2045101,
    kind: "spell",
    text: "Aaaah...",
    itemId: 268,
  });
  session.handleMessage({
    type: "creature-speech",
    id: 2045101,
    kind: "spell",
    text: "Aaaah...",
    itemId: 268,
  });
  session.handleMessage({
    type: "creature-speech",
    id: 2045101,
    kind: "spell",
    text: "Aaaah...",
    itemId: 268,
  });

  const json = session.toJSON();
  assert.equal(json.suppliesUsed.length, 1);
  assert.equal(json.suppliesUsed[0].itemId, 268);
  assert.equal(json.suppliesUsed[0].count, 3);
  assert.equal(json.suppliesUsed[0].totalCost, 168);
  assert.equal(json.waste, 168);
  assert.equal(json.balance, -168);
});

test("HuntSession: syncs supplies from hunt-analyzer-update into suppliesUsed", () => {
  const session = new HuntSession({ huntId: "hunt-123" });

  session.handleMessage({
    type: "hunt-analyzer-update",
    waste: 250,
    supplies: [
      { itemId: 266, name: "Health Potion", count: 5, value: 250 },
    ],
  });

  const json = session.toJSON();
  assert.equal(json.waste, 250);
  assert.equal(json.suppliesUsed.length, 1);
  assert.equal(json.suppliesUsed[0].name, "Health Potion");
  assert.equal(json.suppliesUsed[0].count, 5);
  assert.equal(json.suppliesUsed[0].totalCost, 250);
});

test("HuntSession: processes action-bar-update and action-bar-presets", () => {
  const session = new HuntSession();

  // 1. Recebe presets
  session.handleMessage({
    type: "action-bar-presets",
    names: ["Default", "Mummy Hunt", "Boss Run"],
    active: 1,
  });

  // 2. Recebe slots configurados
  session.handleMessage({
    type: "action-bar-update",
    managed: false,
    slots: [
      {
        potionId: "health-potion",
        enabled: true,
        conditions: [
          { subject: "player", attribute: "health", operator: "<=", value: 55, percent: true },
        ],
      },
      {
        potionId: "mana-potion",
        enabled: true,
        conditions: [
          { subject: "player", attribute: "mana", operator: "<=", value: 50, percent: true },
        ],
      },
      null,
    ],
  });

  let json = session.toJSON();
  assert.ok(json.actionBar);
  assert.equal(json.actionBar.presets.length, 3);
  assert.equal(json.actionBar.activePreset, 1);
  assert.equal(json.actionBar.slots[0].potionId, "health-potion");
  assert.equal(json.actionBar.slots[1].potionId, "mana-potion");
  assert.equal(json.actionBar.slots[2], null);

  // 3. Atualização local de slot
  session.setLocalActionSlot(2, {
    spellId: "challenge",
    enabled: true,
    conditions: [
      { subject: "area", attribute: "targets", operator: ">=", value: 2, percent: false },
    ],
  });

  json = session.toJSON();
  assert.equal(json.actionBar.slots[2].spellId, "challenge");
  assert.equal(json.actionBar.slots[2].conditions[0].operator, ">=");
});

test("HuntSession: calculates hourly rates (gold/h, waste/h, balance/h, xp/h) dynamically based on elapsed time", () => {
  const session = new HuntSession({ huntId: "cyclops-camp", huntName: "Cyclops Camp" });
  session.huntActive = true;

  // Simula 60 segundos de caçada (durationMs = 60000)
  session.durationMs = 60000;
  session.lootValue = 1200; // 1200 gold em 60s
  session.waste = 200;      // 200 de poções em 60s
  session.balance = 1000;   // 1000 de saldo líquido
  session.experienceGained = 3000; // 3000 XP em 60s

  const rates = session.getHourlyRates();

  // Em 60s ganhei 1200 -> em 3600s ganharia (1200 / 60) * 3600 = 72.000
  assert.equal(rates.goldPerHour, 72000, "Gold por hora deve ser 72.000 gp/h");
  // Em 60s gastei 200 -> em 3600s gastaria (200 / 60) * 3600 = 12.000
  assert.equal(rates.wastePerHour, 12000, "Prejuízo por hora deve ser 12.000 gp/h");
  // Saldo por hora = 72.000 - 12.000 = 60.000
  assert.equal(rates.balancePerHour, 60000, "Total/saldo por hora deve ser 60.000 gp/h");
  // XP por hora = (3000 / 60) * 3600 = 180.000
  assert.equal(rates.xpPerHour, 180000, "XP por hora deve ser 180.000 XP/h");

  // Garante que os totais continuam preservados e intactos
  assert.equal(session.lootValue, 1200, "Loot total original mantido");
  assert.equal(session.waste, 200, "Gasto total original mantido");
  assert.equal(session.balance, 1000, "Saldo total original mantido");

  // Simula mais 60 segundos com o dobro do tempo (120 segundos) e novos valores
  session.durationMs = 120000;
  session.lootValue = 3000; // 3000 gold em 120s
  session.waste = 600;      // 600 gastos em 120s
  session.balance = 2400;   // 2400 líquido em 120s

  const updatedRates = session.getHourlyRates();
  // (3000 / 120) * 3600 = 90.000
  assert.equal(updatedRates.goldPerHour, 90000, "Gold por hora atualizado para 90.000 gp/h");
  // (600 / 120) * 3600 = 18.000
  assert.equal(updatedRates.wastePerHour, 18000, "Prejuízo por hora atualizado para 18.000 gp/h");
  // (2400 / 120) * 3600 = 72.000
  assert.equal(updatedRates.balancePerHour, 72000, "Total por hora atualizado para 72.000 gp/h");
});

test("HuntSession: calculates time to next level based on remaining XP and XP per hour", () => {
  const session = new HuntSession({ huntId: "dragon-lair", huntName: "Dragon Lair" });
  session.huntActive = true;

  // Personagem precisa de 100.000 XP no total para o próximo nível e atualmente tem 20.000 (faltam 80.000)
  session.experience = 20000;
  session.experienceNeeded = 100000;
  assert.equal(session.getRemainingXp(), 80000);

  // Em 120 segundos, ganhou 4.000 XP
  session.durationMs = 120000;
  session.experienceGained = 4000;

  // Taxa XP/h = (4000 / 120) * 3600 = 120.000 XP/h
  // Tempo para 80.000 XP = (80000 / 120000) * 3600 = 2400 segundos = 40 minutos
  const rates = session.getHourlyRates();
  assert.equal(rates.xpPerHour, 120000);
  assert.equal(rates.secondsToNextLevel, 2400);
  assert.equal(rates.timeToNextLevelFormatted, "40m");

  // Caso: Nível completo / já alcançou a XP necessária
  session.experience = 100000;
  const readyRates = session.getHourlyRates();
  assert.equal(readyRates.secondsToNextLevel, 0);
  assert.equal(readyRates.timeToNextLevelFormatted, "0s");

  // Caso: Ainda não ganhou nenhuma XP nesta caçada
  session.experience = 10000;
  session.experienceGained = 0;
  const zeroRates = session.getHourlyRates();
  assert.equal(zeroRates.secondsToNextLevel, null);
  assert.equal(zeroRates.timeToNextLevelFormatted, "Calculando...");
});

test("formatEstimatedTime: handles various time ranges accurately", () => {
  assert.equal(formatEstimatedTime(0), "0s");
  assert.equal(formatEstimatedTime(35), "35s");
  assert.equal(formatEstimatedTime(60), "1m");
  assert.equal(formatEstimatedTime(125), "2m 5s");
  assert.equal(formatEstimatedTime(3600), "1h");
  assert.equal(formatEstimatedTime(3660), "1h 01m");
  assert.equal(formatEstimatedTime(7320), "2h 02m");
  assert.equal(formatEstimatedTime(90000), "1d 1h");
  assert.equal(formatEstimatedTime(-10), "--");
  assert.equal(formatEstimatedTime(null), "--");
  assert.equal(formatEstimatedTime(undefined), "--");
});

test("HuntSession: toJSON and formatStatusLines export hourly rates while preserving total balance and waste", () => {
  const session = new HuntSession({ huntId: "tomb-hunt", huntName: "Ancient Tomb" });
  session.huntActive = true;
  session.durationMs = 60000;
  session.lootValue = 5000;
  session.waste = 1000;
  session.balance = 4000;
  session.experienceGained = 10000;
  session.experience = 50000;
  session.experienceNeeded = 80000;

  const json = session.toJSON();
  // Campos de totais preservados
  assert.equal(json.lootValue, 5000);
  assert.equal(json.waste, 1000);
  assert.equal(json.balance, 4000);

  // Campos por hora
  assert.ok(json.rates);
  assert.equal(json.goldPerHour, 300000);
  assert.equal(json.wastePerHour, 60000);
  assert.equal(json.balancePerHour, 240000);
  assert.equal(json.xpPerHour, 600000);
  assert.ok(json.timeToNextLevelFormatted);

  // Status lines contêm totais e taxas
  const lines = session.formatStatusLines();
  const text = lines.join("\n");
  assert.ok(text.includes("Lucro: +4.000 gp"));
  assert.ok(text.includes("Por hora:"));
  assert.ok(text.includes("Próx. Nível em:"));
});







