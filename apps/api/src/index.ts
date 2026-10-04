import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServerApp } from "./server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadDotEnv(): void {
  try {
    const candidates = [
      path.resolve(__dirname, "../../../.env"),
      path.resolve(__dirname, "../../.env"),
      path.resolve(process.cwd(), ".env"),
    ];
    for (const envPath of candidates) {
      if (fs.existsSync(envPath)) {
        const text = fs.readFileSync(envPath, "utf8");
        for (const line of text.split(/\r?\n/)) {
          const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
          const key = match?.[1];
          const val = match?.[2];
          if (key && val !== undefined && process.env[key] === undefined) {
            process.env[key] = val.replace(/^['"]|['"]$/g, "");
          }
        }
        break;
      }
    }
  } catch {}
}

loadDotEnv();

const PORT = parseInt(process.env.PORT || "3000", 10);
const { server, shutdown } = createServerApp();

server.listen(PORT, () => {
  console.log(`\n🚀 Servidor Huntera Web iniciado em http://localhost:${PORT}`);
  console.log(`   Suporte a 4 telas simultâneas com SSE ativo.\n`);
});

process.once("SIGINT", () => {
  void shutdown().then(() => process.exit(0));
});

process.once("SIGTERM", () => {
  void shutdown().then(() => process.exit(0));
});
