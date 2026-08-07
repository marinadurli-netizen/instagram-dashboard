// Serverless hosts run in UTC. `new Date().toISOString().slice(0, 10)` (or
// any UTC-based extraction) silently shifts posts made in the evening onto
// the next calendar day. Every day key in this app must instead be derived
// from calendar parts in APP_TIMEZONE, the creator's own timezone.
export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "America/Sao_Paulo";

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export interface LocalCalendarParts {
  year: number;
  month: number;
  day: number;
}

export function localCalendarParts(date: Date): LocalCalendarParts {
  const parts = partsFormatter.formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  return { year, month, day };
}

// Returns "YYYY-MM-DD" for `date` as observed in APP_TIMEZONE, safe to store
// directly in a Postgres DATE column.
export function localDateKey(date: Date): string {
  const { year, month, day } = localCalendarParts(date);
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// "Today" in APP_TIMEZONE. Windowed queries must bind this in as a
// parameter (`$n::date`) instead of using Postgres's CURRENT_DATE, which
// reflects the database session's timezone (typically UTC on a hosted
// provider) — not APP_TIMEZONE. Using CURRENT_DATE would silently shift a
// "last 30 days" window by hours around midnight, the exact bug this file
// exists to prevent.
export function todayKey(): string {
  return localDateKey(new Date());
}
