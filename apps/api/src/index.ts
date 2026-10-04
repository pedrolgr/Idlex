import { getEnv } from "@idlex/config";
import { createServerApp } from "./server.js";

async function main(): Promise<void> {
  const env = getEnv();
  const { app, shutdown } = await createServerApp();

  try {
    await app.listen({
      port: env.PORT,
      host: env.HOST,
    });
    console.log(`\n🚀 Servidor Huntera Web iniciado em http://${env.HOST}:${env.PORT}`);
    console.log(`   Suporte a 4 telas simultâneas com SSE ativo.\n`);
  } catch (err) {
    app.log.error(err, "Falha ao iniciar servidor Fastify");
    process.exit(1);
  }

  const handleSignal = (signal: string) => {
    return () => {
      app.log.info({ signal }, "Recebido sinal de encerramento");
      void shutdown().then(() => {
        process.exit(0);
      });
    };
  };

  process.once("SIGINT", handleSignal("SIGINT"));
  process.once("SIGTERM", handleSignal("SIGTERM"));
}

void main();

