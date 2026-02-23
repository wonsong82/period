import { Pool } from "pg";
import { PeriodData, DEFAULT_CONFIG, PeriodConfig } from "./types";

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

async function ensureTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS period__data (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      period_start_dates TEXT[] NOT NULL DEFAULT '{}',
      config JSONB NOT NULL DEFAULT '{}'::jsonb
    )
  `);

  const { rowCount } = await pool.query(
    "SELECT 1 FROM period__data WHERE id = 1",
  );
  if (rowCount === 0) {
    await pool.query(
      "INSERT INTO period__data (id, period_start_dates, config) VALUES (1, $1, $2)",
      [[], JSON.stringify(DEFAULT_CONFIG)],
    );
  }
}

export async function getData(): Promise<PeriodData> {
  await ensureTable();
  const { rows } = await pool.query(
    "SELECT period_start_dates, config FROM period__data WHERE id = 1",
  );
  const row = rows[0];
  return {
    periodStartDates: row.period_start_dates ?? [],
    config: row.config as PeriodConfig,
  };
}

export async function saveData(data: PeriodData): Promise<void> {
  await ensureTable();
  const sorted = [...data.periodStartDates].sort();
  await pool.query(
    "UPDATE period__data SET period_start_dates = $1, config = $2 WHERE id = 1",
    [sorted, JSON.stringify(data.config)],
  );
}
