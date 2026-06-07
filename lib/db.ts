import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "sales.db");

const globalForDb = globalThis as unknown as { _db?: Database.Database };

function getDb(): Database.Database {
  if (globalForDb._db) return globalForDb._db;

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name            TEXT NOT NULL,
      last_name             TEXT NOT NULL,
      email                 TEXT,
      phone                 TEXT,
      address               TEXT,
      city                  TEXT,
      state                 TEXT,
      zip                   TEXT,
      roof_type             TEXT,
      damage_type           TEXT,
      notes                 TEXT,
      status                TEXT NOT NULL DEFAULT 'new',
      jobnimbus_contact_id  TEXT,
      jobnimbus_job_id      TEXT,
      assigned_rep          TEXT,
      created_at            TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TRIGGER IF NOT EXISTS leads_updated_at
    AFTER UPDATE ON leads
    BEGIN
      UPDATE leads SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE,
      display_name  TEXT NOT NULL,
      role          TEXT NOT NULL CHECK(role IN ('owner', 'rep')),
      password_hash TEXT NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      token_hash  TEXT NOT NULL UNIQUE,
      expires_at  TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  `);

  // Migrate: add columns introduced after initial schema
  const existingCols = (db.pragma("table_info(leads)") as { name: string }[]).map((r) => r.name);
  const migrations: [string, string][] = [
    ["doors_knocked", "ALTER TABLE leads ADD COLUMN doors_knocked INTEGER NOT NULL DEFAULT 0"],
    ["latitude",      "ALTER TABLE leads ADD COLUMN latitude REAL"],
    ["longitude",     "ALTER TABLE leads ADD COLUMN longitude REAL"],
    ["territory",     "ALTER TABLE leads ADD COLUMN territory TEXT"],
  ];
  for (const [col, sql] of migrations) {
    if (!existingCols.includes(col)) db.exec(sql);
  }

  globalForDb._db = db;
  return db;
}

export default getDb;
