# Content Studio

Personal Instagram content-analytics dashboard. Next.js (App Router, TypeScript,
Tailwind), Postgres via `pg`, Anthropic SDK for AI features.

## Database

1. Copy `.env.example` to `.env.local` and set `DATABASE_URL` (and `APP_TIMEZONE`
   to your own IANA timezone — used to compute local calendar day keys).
2. Run migrations: `npm run db:migrate`.

Schema lives in `migrations/*.sql`, applied in filename order and tracked in
`schema_migrations`. Every table has row-level security enabled with no
policies: the app connects as the table owner (which bypasses RLS), so this
locks out any other role — e.g. an anon/read-only credential — by default.

`src/lib/db/`:
- `pool.ts` — singleton `pg` `Pool`, with type parsers so `numeric`/`bigint`
  come back as `number` and `date` stays a raw `YYYY-MM-DD` string.
- `query.ts` — `query`/`queryOne` helpers (async).
- `upsert.ts` — generic `ON CONFLICT DO UPDATE` upsert where a `null` input
  means "keep the stored value", including for `NOT NULL` columns.
- `localDate.ts` — local calendar day-key helpers, always timezone-aware
  (never derived from UTC/`toISOString`).
