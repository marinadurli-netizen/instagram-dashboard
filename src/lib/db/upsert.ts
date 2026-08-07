import { query, queryOne } from "./query";

const IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

function quoteIdent(name: string): string {
  if (!IDENTIFIER.test(name)) {
    throw new Error(`Unsafe identifier: ${name}`);
  }
  return `"${name}"`;
}

// `FROM (VALUES ($1, ...)) AS new(col, ...)` doesn't get the automatic
// parameter-type inference a top-level `INSERT ... VALUES` gets from its
// target columns — Postgres falls back to `text` for anything ambiguous
// (most commonly a `null` parameter), which then fails to COALESCE against
// a differently-typed existing column (e.g. `text` vs `timestamptz`). So
// each value needs an explicit cast, which means looking up the real
// column types first.
async function getColumnTypes(table: string, columns: string[]): Promise<Record<string, string>> {
  const rows = await query<{ column_name: string; udt_name: string }>(
    `SELECT column_name, udt_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = ANY($2)`,
    [table, columns],
  );
  const types: Record<string, string> = {};
  for (const row of rows) types[row.column_name] = row.udt_name;
  for (const col of columns) {
    if (!types[col]) {
      throw new Error(`upsert: column "${col}" not found on table "${table}"`);
    }
  }
  return types;
}

export interface UpsertOptions {
  table: string;
  conflictColumns: string[];
  values: Record<string, unknown>;
}

// Inserts `values`, or on a conflict over `conflictColumns` updates every
// other column — but a `null` in `values` means "leave the stored value
// alone" rather than "clear it", via COALESCE(EXCLUDED.col, table.col).
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
  const quotedColumns = columns.map(quoteIdent);
  const columnTypes = await getColumnTypes(table, columns);
  const placeholders = columns.map((col, i) => `$${i + 1}::${quoteIdent(columnTypes[col]!)}`);
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
  const selectList = columns
    .map((col) => {
      const q = quoteIdent(col);
      return conflictColumns.includes(col) ? `new.${q}` : `COALESCE(new.${q}, existing.${q})`;
    })
    .join(", ");

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
    INSERT INTO ${quotedTable} (${quotedColumns.join(", ")})
    SELECT ${selectList}
    FROM (VALUES (${placeholders.join(", ")})) AS new (${quotedColumns.join(", ")})
    LEFT JOIN ${quotedTable} AS existing ON ${joinClause}
    ON CONFLICT (${conflictClause})
    ${updateColumns.length > 0 ? `DO UPDATE SET ${setClause}` : "DO NOTHING"}
    RETURNING *
  `;

  return queryOne<T>(sql, params);
}
