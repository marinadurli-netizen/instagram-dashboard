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

// A provider's *direct* connection string is commonly IPv6-only (Neon's
// is); Vercel's serverless functions are IPv4, so a direct string works
// from every local/CI test and only fails once actually deployed. This is
// a best-effort heuristic (not a hard fail — self-hosted Postgres and other
// providers don't follow Neon's "-pooler" hostname convention), just loud
// enough to catch the one-off "forgot to switch to the pooler string
// before deploying" mistake.
if (process.env.VERCEL && !/pooler|pgbouncer/i.test(connectionString)) {
  console.warn(
    "DATABASE_URL doesn't look like a transaction pooler connection string " +
      '(no "pooler"/"pgbouncer" in it). If this is a direct connection, it may be ' +
      "IPv6-only and fail here even though it works locally — on Neon, use the " +
      'connection string with "-pooler" in the hostname.',
  );
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
