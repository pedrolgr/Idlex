import "node:process";
import fs from "node:fs";
import { HunteraClient } from "./huntera-client.mjs";

loadDotEnv();
const username = process.env.HUNTERA_USERNAME;
const password = process.env.HUNTERA_PASSWORD;
if (!username || !password) {
  throw new Error("Configure HUNTERA_USERNAME and HUNTERA_PASSWORD in .env before running the diagnostic.");
}

const client = new HunteraClient();
await client.login(username, password);
const account = await client.me();
const characters = await client.characters();
const character = characters.characters?.[0];
if (!character) throw new Error("No character was returned for the authenticated account.");
const ticket = await client.gameTicket(character.id);

console.log(JSON.stringify({
  authenticated: true,
  account: account.account ? { id: account.account.id, emailVerified: account.account.emailVerified } : null,
  character: { id: character.id, name: character.name, level: character.level, vocation: character.vocation },
  gameTicket: { received: typeof ticket.ticket === "string", websocketUrl: ticket.websocketUrl ? new URL(ticket.websocketUrl).origin + new URL(ticket.websocketUrl).pathname : null },
}, null, 2));

function loadDotEnv() {
  try {
    const text = fs.readFileSync(new URL("../.env", import.meta.url), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    }
  } catch {}
}
