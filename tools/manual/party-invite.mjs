import { HunteraClient } from "@idlex/huntera-client";
import { GameSocket } from "@idlex/protocol";
import fs from "fs";

const envContent = fs.readFileSync(new URL("../../.env", import.meta.url), "utf8");
const env = Object.fromEntries(envContent.split("\n").filter(l => l.includes("=")).map(l => {
  const idx = l.indexOf("=");
  return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
}));

const client = new HunteraClient();
await client.login(env.HUNTERA_USERNAME, env.HUNTERA_PASSWORD);
const chars = await client.characters();
const char = chars.characters[0];
const ticketResp = await client.gameTicket(char.id);

console.log("Conectando socket de teste para Gatonet...");
const socket = new GameSocket({
  url: ticketResp.websocketUrl,
  ticket: ticketResp.ticket,
  headers: { Origin: "https://www.huntera.com.br" },
});

socket.onMessage((msg) => {
  // Ignora ruído de movimento/mapa
  if (!["pong", "players-online", "creature-appear", "projectile-move", "world-effect", "creature-health", "creature-move"].includes(msg.type)) {
    console.log(">>> [MSG RECEBIDA]", msg.type, JSON.stringify(msg));
  }
});

await socket.connect();
console.log("SOCKET CONECTADO! GATONET ESTÁ ONLINE.");
console.log("Envie o convite para Gatonet AGORA no jogo (esperando 45s)...");

await new Promise(r => setTimeout(r, 45000));
console.log("Encerrando socket de teste...");
socket.logout();
socket.close();
