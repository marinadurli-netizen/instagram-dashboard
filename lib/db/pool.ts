import { Pool, types } from "pg";

// int8 (bigint) and numeric come back as strings from pg by default to avoid
// precision loss above Number.MAX_SAFE_INTEGER. This app's metrics (reach,
// saves, watch time, etc.) never approach that range, so we trade the
// theoretical precision loss for numbers we can do arithmetic on directly.
const OID_INT8 = 20;
const OID_NUMERIC = 1700;
const OID_DATE = 1082;

types.setTypeParser(OID_INT8, (value) => Number(value));
types.setTypeParser(OID_NUMERIC, (value) => Number(value));
// Keep DATE as the raw "YYYY-MM-DD" string pg receives from the server
// instead of letting pg construct a JS Date (which applies the server's
// timezone and can shift the calendar day).
types.setTypeParser(OID_DATE, (value) => value);

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const useSsl = process.env.PGSSLMODE !== "disable";

let pool: Pool | undefined;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      max: process.env.PGPOOL_MAX ? Number(process.env.PGPOOL_MAX) : 5,
    });
  }
  return pool;
}

export { getPool };
