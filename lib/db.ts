import { Pool, type QueryResultRow } from "pg";

const globalForDb = globalThis as unknown as {
  _pool?: Pool;
  _dbInitPromise?: Promise<void>;
};

function getPool(): Pool {
  if (globalForDb._pool) return globalForDb._pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const needsSsl = /sslmode=require/i.test(connectionString);
  const pool = new Pool({
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });

  globalForDb._pool = pool;
  return pool;
}

export async function initDb(): Promise<void> {
  if (globalForDb._dbInitPromise) return globalForDb._dbInitPromise;

  globalForDb._dbInitPromise = (async () => {
    const pool = getPool();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id                   SERIAL PRIMARY KEY,
        first_name           TEXT NOT NULL,
        last_name            TEXT NOT NULL,
        email                TEXT,
        phone                TEXT,
        address              TEXT,
        city                 TEXT,
        state                TEXT,
        zip                  TEXT,
        roof_type            TEXT,
        damage_type          TEXT,
        notes                TEXT,
        status               TEXT NOT NULL DEFAULT 'new',
        jobnimbus_contact_id TEXT,
        jobnimbus_job_id     TEXT,
        assigned_rep         TEXT,
        doors_knocked        INTEGER NOT NULL DEFAULT 0,
        latitude             DOUBLE PRECISION,
        longitude            DOUBLE PRECISION,
        territory            TEXT,
        created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        username      TEXT NOT NULL UNIQUE,
        display_name  TEXT NOT NULL,
        role          TEXT NOT NULL CHECK(role IN ('owner', 'rep')),
        password_hash TEXT NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash  TEXT NOT NULL UNIQUE,
        expires_at  TIMESTAMPTZ NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    `);

    await pool.query(`
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS doors_knocked INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS territory TEXT;
    `);

    await pool.query(`
      CREATE OR REPLACE FUNCTION set_leads_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS leads_updated_at ON leads;
      CREATE TRIGGER leads_updated_at
      BEFORE UPDATE ON leads
      FOR EACH ROW
      EXECUTE FUNCTION set_leads_updated_at();
    `);
  })();

  return globalForDb._dbInitPromise;
}

export async function queryRows<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  await initDb();
  const pool = getPool();
  const result = await pool.query<T>(text, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await queryRows<T>(text, params);
  return rows[0] ?? null;
}

export async function execute(text: string, params: unknown[] = []) {
  await initDb();
  const pool = getPool();
  return pool.query(text, params);
}
