import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), ".data");

export type DB = BetterSQLite3Database<typeof schema>;

function createDb(): DB {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const sqlite = new Database(path.join(DATA_DIR, "ababank.db"));
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  // `next build` fans out parallel workers that would race on the migration.
  // Migrations run at server startup (and in dev) instead — never during build.
  if (process.env.NEXT_PHASE !== "phase-production-build") {
    migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  }
  return db;
}

const globalForDb = globalThis as unknown as { __ababankDb?: DB };

export const db: DB = globalForDb.__ababankDb ?? createDb();
globalForDb.__ababankDb = db;

export { schema };
