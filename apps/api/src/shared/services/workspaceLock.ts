import { db, sql } from "@cognis/database";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DbOrTx = typeof db | Tx;

/**
 * Serializes the operations that read the folder tree and then write to it —
 * moves, soft deletes and restores. Each checks a condition that a concurrent
 * one of the others can invalidate before the write lands: a move can form a
 * cycle, a delete can strand a row being restored under a trashed parent.
 *
 * The workspace is the only thing those operations reliably share, and row locks
 * miss them because the rows they write are often disjoint. Held to the end of
 * the transaction, released on commit or rollback, and invisible to readers.
 *
 * hashtext collapses the uuid to an int; a collision only means two unrelated
 * workspaces briefly serialize, which costs nothing at this frequency.
 */
export async function lockWorkspace(executor: Tx, workspaceId: string) {
    await executor.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${workspaceId}))`);
}
