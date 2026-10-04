import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

const { Pool } = pg;

export type DbClient = NodePgDatabase<typeof schema>;

let poolInstance: pg.Pool | null = null;
let dbInstance: DbClient | null = null;

export interface DbOptions {
  connectionString?: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export function createDbPool(options: DbOptions = {}): pg.Pool {
  if (poolInstance) {
    return poolInstance;
  }
  const connectionString =
    options.connectionString ||
    process.env.DATABASE_URL ||
    "postgresql://idlex:idlex@localhost:5432/idlex";

  poolInstance = new Pool({
    connectionString,
    max: options.max ?? 20,
    idleTimeoutMillis: options.idleTimeoutMillis ?? 30000,
    connectionTimeoutMillis: options.connectionTimeoutMillis ?? 5000,
  });

  poolInstance.on("error", (err) => {
    console.error("❌ Unexpected error on idle PostgreSQL client", err);
  });

  return poolInstance;
}

export function getDb(options: DbOptions = {}): DbClient {
  if (dbInstance) {
    return dbInstance;
  }
  const pool = createDbPool(options);
  dbInstance = drizzle(pool, { schema });
  return dbInstance;
}

export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  latencyMs?: number;
  error?: string;
}> {
  const pool = createDbPool();
  const start = Date.now();
  try {
    const res = await pool.query("SELECT 1");
    if (res.rowCount === 1) {
      return { connected: true, latencyMs: Date.now() - start };
    }
    return { connected: false, error: "Query returned unexpected result" };
  } catch (err) {
    return { connected: false, error: (err as Error).message };
  }
}

export async function closeDatabasePool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
    dbInstance = null;
  }
}
