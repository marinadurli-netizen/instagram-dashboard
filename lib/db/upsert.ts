import { query, queryOne } from "./query";

const IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

function quoteIdent(name: string): string {
  if (!IDENTIFIER.test(name)) {
    throw new Error(`Unsafe identifier: ${name}`);
  }
  return `"${name}"`;
}

interface ColumnInfo {
  udtName: string;
  isNullable: boolean;
  hasDefault: boolean;
  isIdentity: boolean;
}

// `FROM (VALUES ($1, ...)) AS new(col, ...)` doesn't get the automatic
// parameter-type inference a top-level `INSERT ... VALUES` gets from its
// target columns — Postgres falls back to `text` for anything ambiguous
// (most commonly a `null` parameter), which then fails to COALESCE against
// a differently-typed existing column (e.g. `text` vs `timestamptz`). So
// each value needs an explicit cast, which means looking up the real
// column types first — for every column on the table, not just the ones
// this call provides (see requiredColumns below).
async function getTableColumns(table: string): Promise<Record<string, ColumnInfo>> {
  const rows = await query<{
    column_name: string;
    udt_name: string;
    is_nullable: string;
    column_default: string | null;
    is_identity: string;
  }>(
    `SELECT column_name, udt_name, is_nullable, column_default, is_identity
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [table],
  );
  const info: Record<string, ColumnInfo> = {};
  for (const row of rows) {
    info[row.column_name] = {
      udtName: row.udt_name,
      isNullable: row.is_nullable === "YES",
      hasDefault: row.column_default !== null,
      isIdentity: row.is_identity === "YES",
    };
  }
  return info;
}

export interface UpsertOptions {
  table: string;
  conflictColumns: string[];
  values: Record<string, unknown>;
}

// Inserts `values`, or on a conflict over `conflictColumns` updates every
// other provided column — but a `null` in `values` means "leave the stored
// value alone" rather than "clear it", via COALESCE(EXCLUDED.col, table.col).
export async function upsert<T extends Record<string, unknown> = Record<string, unknown>>({
  table,
  conflictColumns,
  values,
}: UpsertOptions): Promise<T | undefined> {
  const columns = Object.keys(values);
  if (columns.length === 0) {
    throw new Error("upsert requires at least one column in values");
  }
  if (conflictColumns.length === 0) {
    throw new Error("upsert requires at least one conflict column");
  }

  const quotedTable = quoteIdent(table);
  const tableColumns = await getTableColumns(table);
  for (const col of columns) {
    if (!tableColumns[col]) {
      throw new Error(`upsert: column "${col}" not found on table "${table}"`);
    }
  }

  // A partial upsert call (e.g. metrics-only, omitting `handle`) hits the
  // same "Postgres validates the proposed row before it knows about the
  // conflict" problem as a null NOT NULL column — except here the column is
  // missing from the INSERT's column list entirely, so it'd get its default
  // (or NULL) rather than anything COALESCE could rescue. Any NOT NULL,
  // no-default column this call doesn't mention has to be included anyway,
  // sourced purely from the existing row: on a genuine conflict this is
  // inert (only the SET clause below writes anything), and on a genuine
  // first-time insert `existing` has no match, so it correctly fails NOT
  // NULL instead of silently succeeding with missing required data.
  const requiredColumns = Object.keys(tableColumns).filter((col) => {
    const info = tableColumns[col]!;
    return (
      !info.isNullable &&
      !info.hasDefault &&
      !info.isIdentity &&
      !conflictColumns.includes(col) &&
      !columns.includes(col)
    );
  });

  const allInsertColumns = [...columns, ...requiredColumns];
  const quotedAllInsertColumns = allInsertColumns.map(quoteIdent);
  const placeholders = columns.map((col, i) => `$${i + 1}::${quoteIdent(tableColumns[col]!.udtName)}`);
  const params = columns.map((col) => values[col]);

  const updateColumns = columns.filter((col) => !conflictColumns.includes(col));

  // A plain `INSERT ... VALUES ... ON CONFLICT DO UPDATE SET col =
  // COALESCE(EXCLUDED.col, tbl.col)` still fails NOT NULL columns when the
  // input is null: Postgres validates the proposed row's constraints while
  // attempting the insert, before it knows there's a conflict to divert to
  // the UPDATE branch. So we pre-merge against the existing row (if any)
  // via a LEFT JOIN in the SELECT feeding the insert, which makes the
  // proposed row already non-null whenever a stored value exists. The
  // ON CONFLICT DO UPDATE SET clause remains the atomic, authoritative
  // merge (it re-reads the row at conflict time under normal MVCC rules);
  // the LEFT JOIN merge only needs to get the initial insert attempt past
  // NOT NULL checks.
  const selectList = [
    ...columns.map((col) => {
      const q = quoteIdent(col);
      return conflictColumns.includes(col) ? `new.${q}` : `COALESCE(new.${q}, existing.${q})`;
    }),
    ...requiredColumns.map((col) => `existing.${quoteIdent(col)}`),
  ].join(", ");

  const joinClause = conflictColumns
    .map((col) => {
      const q = quoteIdent(col);
      return `existing.${q} = new.${q}`;
    })
    .join(" AND ");

  const setClause = updateColumns
    .map((col) => {
      const q = quoteIdent(col);
      return `${q} = COALESCE(EXCLUDED.${q}, ${quotedTable}.${q})`;
    })
    .join(", ");

  const conflictClause = conflictColumns.map(quoteIdent).join(", ");

  const sql = `
    INSERT INTO ${quotedTable} (${quotedAllInsertColumns.join(", ")})
    SELECT ${selectList}
    FROM (VALUES (${placeholders.join(", ")})) AS new (${columns.map(quoteIdent).join(", ")})
    LEFT JOIN ${quotedTable} AS existing ON ${joinClause}
    ON CONFLICT (${conflictClause})
    ${updateColumns.length > 0 ? `DO UPDATE SET ${setClause}` : "DO NOTHING"}
    RETURNING *
  `;

  return queryOne<T>(sql, params);
}
