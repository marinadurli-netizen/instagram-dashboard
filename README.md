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

## Instagram ingestion

### One-time setup

1. Create an app at [developers.facebook.com](https://developers.facebook.com)
   (Meta for Developers) and add the Instagram Graph API product. Set
   `META_APP_ID` / `META_APP_SECRET` from its Basic Settings.
2. Under Facebook Login settings, add both your local
   (`http://localhost:3000/api/instagram/callback`) and deployed
   (`https://<your-domain>/api/instagram/callback`) callback URLs to
   **Valid OAuth Redirect URIs**.
3. Make sure your Instagram account is a Business/Creator account linked to
   your Facebook Page (Instagram app > Settings > Linked Accounts).
4. Set `ADMIN_SECRET` to a long random string.
5. Visit `/api/instagram/connect?secret=<ADMIN_SECRET>` and complete the
   Facebook login/consent screen. This resolves your Page's linked Instagram
   Business account and stores its access token in `ig_accounts`.

### Syncing

- `npm run sync` — runs a full sync locally (all accounts in `ig_accounts`).
  Use this for the initial full-history backfill; it can take a while and
  may exceed a serverless function's time limit, which is why it's a local
  script rather than something you'd trigger from `/api/cron/sync` for the
  first run.
- `/api/cron/sync` — same sync, wired to Vercel Cron via `vercel.json`
  (daily by default). Requires `CRON_SECRET` to be set as a project env var
  on Vercel — Vercel signs cron requests with it automatically. Vercel
  Hobby plans limit cron jobs to once/day; adjust `vercel.json`'s schedule
  if you're on Pro and want tighter freshness.

Ingestion code lives in `src/lib/instagram/`:
- `client.ts` — Graph API fetch/batch wrapper with retry-on-5xx and
  rate-limit-usage warnings.
- `media.ts` — paginates the full `/media` edge (entire post history).
- `metrics.ts` — which insight metrics are valid per media type (this list
  drifts as Meta changes the API — see the comment in the file).
- `insights.ts` — fetches insights in batches of 50 via the Graph API batch
  endpoint, to keep well under rate limits even for a large history.
- `oauth.ts` — code/token exchange and Page/IG-account discovery.
- `sync.ts` — orchestrates the above into `posts` / `post_metrics` upserts.
