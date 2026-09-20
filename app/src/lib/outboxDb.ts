// ============================================================================
// THE OUTBOX'S TABLE, AND THE ONLY MODULE THAT OPENS IT. Plan task 5c-i.
//
// ⚠️ IT IS DELIBERATELY UNTESTABLE, AND EVERYTHING IN IT WITH A RIGHT ANSWER IS
// IN `@/api/outbox`. It imports `expo-sqlite`, which is native, so no node
// suite can load this file — `app/vitest.config.ts` collects `test/**` only so
// nothing tries. What is left here is SQL and marshalling. The states, the
// transitions, the payload shape and the uuid rule are all next door, where
// `app/test/api-outbox.test.ts` reads them.
//
// ⚠️⚠️ THIS IS A TABLE ON THE PHONE AND IT IS NOT A MIGRATION. Step 5 ships no
// Postgres migration and this task ships none. Nothing in `supabase/migrations/`
// moves, `db.yml` has nothing to do, and the append-only rule is not engaged —
// but the schema here still needs a way to CHANGE, because the app is already
// installed on a phone and `5c-ii` and `5c-iii` will both want a column. Hence
// `PRAGMA user_version`: the migration path exists from the first version
// rather than being invented against a device that already holds sales.
// ⚠️ HALF OF THAT PREDICTION HELD AND THE OTHER HALF DID NOT, recorded rather
// than quietly corrected: `5c-ii` wanted no column at all — `recorded_offline`
// is computed from `attempts` — and `5c-iii` wanted one, `workspace_id`. The
// path was worth building either way, and it was walked on its first use.
//
// ⚠️ IT IS A SEPARATE DATABASE FILE FROM THE SESSION'S. `lib/supabase.ts`
// installs `expo-sqlite/localStorage/install`, which keeps the session in its
// own store; this opens `wera-outbox.db`. Two files rather than two tables in
// one, so that clearing a session can never be the thing that drops a queued
// sale — and so that a corrupt session store and a corrupt queue are two
// separate accidents.
// ============================================================================

import * as SQLite from 'expo-sqlite';

import {
  isOutboxState,
  isWriteKind,
  isWritePayload,
  normalizeUuid,
  type OutboxState,
  type QueuedWrite,
} from '@/api/outbox';

const DB_NAME = 'wera-outbox.db';

/**
 * The schema version this build expects. Bumped by whoever adds a column.
 *
 * ⚠️ VERSION 2 IS `5c-iii`'s `workspace_id`, AND IT IS THE FIRST TIME THIS PATH
 * HAS BEEN WALKED. `5c-i` wrote the migration path before anything needed it,
 * on the grounds that the app was already installed on a phone and inventing a
 * schema-change path against a device holding sales is the expensive version of
 * ten lines. That prediction came true one task later.
 */
const SCHEMA_VERSION = 2;

let handle: SQLite.SQLiteDatabase | undefined;

/**
 * The database, opened once and migrated to `SCHEMA_VERSION`.
 *
 * ⚠️ OPENED LAZILY AND NEVER AT MODULE SCOPE, the rule `@/lib/store.ts`
 * already records: a module-scope open is a file handle taken before the app
 * has decided it needs one, on a phone whose disk may be full.
 */
export function outboxDb(): SQLite.SQLiteDatabase {
  if (handle === undefined) {
    handle = SQLite.openDatabaseSync(DB_NAME);
    migrate(handle);
  }
  return handle;
}

/**
 * ⚠️ `user_version` IS THE VERSION COUNTER SQLITE ALREADY HAS, and using it
 * beats a `schema_version` table of our own for one reason: it cannot itself
 * be missing on a database that predates it.
 */
function migrate(db: SQLite.SQLiteDatabase): void {
  const row = db.getFirstSync<{ user_version: number }>('pragma user_version');
  const at = row?.user_version ?? 0;
  if (at >= SCHEMA_VERSION) return;
  if (at < 1) {
    db.execSync(`
      create table if not exists queued_write (
        id         text primary key not null,
        kind       text not null,
        payload    text not null,
        state      text not null,
        attempts   integer not null default 0,
        queued_at  text not null
      );
      create index if not exists queued_write_by_age on queued_write (queued_at);
    `);
  }
  if (at < 2) {
    // ⚠️ NULLABLE, AND IT HAS TO BE — `alter table add column` cannot add a
    // `not null` column with no default to a table that may already have rows.
    // The typed contract is stricter than the table: `readQueue` drops a row
    // whose workspace will not parse, exactly as it drops one whose kind or
    // state will not, so a v1 row can never reach a flush pretending it knows
    // which shop it belongs to. ⚠️ On any phone in existence today that set is
    // EMPTY — nothing in this app enqueues yet (`5f`–`5h` are those screens) —
    // which is why the loss is bounded to nothing rather than merely small.
    db.execSync(`alter table queued_write add column workspace_id text`);
  }
  db.execSync(`pragma user_version = ${SCHEMA_VERSION}`);
}

/**
 * One write into the queue.
 *
 * ⚠️ `insert or ignore`, AND IT IS THE SAME ARGUMENT `0024` DECISION 7 MAKES
 * ONE LAYER UP. The id is the idempotency key on the server; a second enqueue
 * of one uuid is the same write arriving twice, and the queue must answer it
 * the way `record_sale` does — by doing nothing, not by raising at a till.
 */
export function enqueue(db: SQLite.SQLiteDatabase, write: QueuedWrite): void {
  db.runSync(
    `insert or ignore into queued_write
       (id, workspace_id, kind, payload, state, attempts, queued_at)
     values (?, ?, ?, ?, ?, ?, ?)`,
    write.id,
    write.workspaceId,
    write.kind,
    JSON.stringify(write.payload),
    write.state,
    write.attempts,
    write.queuedAt,
  );
}

/**
 * Everything in the queue, oldest first.
 *
 * ⚠️ IT DROPS A ROW IT CANNOT READ, WHICH IS THE SAME CHOICE `@/api/approvals`
 * MADE FOR A SERVER ROW. A row whose state is not one of the three, whose kind
 * is not one of `0024`'s four, or whose payload will not parse, is a row no
 * flush could act on — and throwing here would make one unreadable sale stop
 * every other sale on the phone from ever being sent. It stays in the table,
 * so nothing is destroyed and `5c-iii` can still find it.
 *
 * ⚠️ A ROW WITH NO READABLE `workspace_id` IS DROPPED BY THE SAME RULE, and
 * that is the v1 row the migration above could not fill in. It is not a sale
 * that could have been sent and was not: without a workspace it could be sent
 * but never DEAD-LETTERED, which is the one failure §2.6 says must never be
 * silent — so a row that cannot be reported is better left visible in the table
 * than flushed with half a contract.
 */
export function readQueue(db: SQLite.SQLiteDatabase): readonly QueuedWrite[] {
  const rows = db.getAllSync<{
    id: string;
    workspace_id: string | null;
    kind: string;
    payload: string;
    state: string;
    attempts: number;
    queued_at: string;
  }>(
    `select id, workspace_id, kind, payload, state, attempts, queued_at
       from queued_write order by queued_at`,
  );

  const out: QueuedWrite[] = [];
  for (const row of rows) {
    const id = normalizeUuid(row.id);
    if (id === null || !isWriteKind(row.kind) || !isOutboxState(row.state)) continue;
    const workspaceId = row.workspace_id === null ? null : normalizeUuid(row.workspace_id);
    if (workspaceId === null) continue;
    let payload: unknown;
    try {
      payload = JSON.parse(row.payload);
    } catch {
      continue;
    }
    if (!isWritePayload(payload)) continue;
    out.push({
      id,
      workspaceId,
      kind: row.kind,
      payload,
      state: row.state,
      attempts: row.attempts,
      queuedAt: row.queued_at,
    });
  }
  return out;
}

/** A row that stayed in the queue, in its new state. See `advance`. */
export function settle(
  db: SQLite.SQLiteDatabase,
  id: string,
  state: OutboxState,
  attempts: number,
): void {
  db.runSync('update queued_write set state = ?, attempts = ? where id = ?', state, attempts, id);
}

/** A row that landed on the server. See `advance` — there is no `sent` state. */
export function forget(db: SQLite.SQLiteDatabase, id: string): void {
  db.runSync('delete from queued_write where id = ?', id);
}
