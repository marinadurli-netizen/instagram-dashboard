import { queryOne } from "./query";

const IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

function quoteIdent(name: string): string {
  if (!IDENTIFIER.test(name)) {
    throw new Error(`Unsafe identifier: ${name}`);
  }
  return `"${name}"`;
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
  const placeholders = columns.map((_, i) => `$${i + 1}`);
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
