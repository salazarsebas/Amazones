import { Pool } from "pg";

import type { AppStateSnapshot, DurableStateStore } from "./types";

const SNAPSHOT_VERSION = 1;

export class PostgresSnapshotStore implements DurableStateStore {
  private readonly ready: Promise<void>;

  constructor(
    private readonly pool: Pool,
    private readonly schemaName = "public",
  ) {
    this.ready = this.ensureSchema();
  }

  describe(): string {
    return `postgres:${this.schemaName}.app_state_snapshots`;
  }

  async exists(): Promise<boolean> {
    await this.ready;
    const result = await this.pool.query(
      `select 1 from ${this.schemaName}.app_state_snapshots limit 1`,
    );
    return (result.rowCount ?? 0) > 0;
  }

  async load(): Promise<AppStateSnapshot | null> {
    await this.ready;
    const result = await this.pool.query<{
      snapshot: AppStateSnapshot;
    }>(
      `select snapshot
         from ${this.schemaName}.app_state_snapshots
        order by saved_at desc, id desc
        limit 1`,
    );

    const snapshot = result.rows[0]?.snapshot ?? null;
    if (!snapshot) {
      return null;
    }
    if (snapshot.version !== SNAPSHOT_VERSION) {
      throw new Error(`Unsupported snapshot version: ${String(snapshot.version)}`);
    }
    return snapshot;
  }

  async save(snapshot: Omit<AppStateSnapshot, "version" | "savedAt">): Promise<AppStateSnapshot> {
    await this.ready;
    const nextSnapshot: AppStateSnapshot = {
      version: SNAPSHOT_VERSION,
      savedAt: new Date().toISOString(),
      ...snapshot,
    };

    await this.pool.query(
      `insert into ${this.schemaName}.app_state_snapshots (snapshot_version, snapshot, saved_at)
       values ($1, $2::jsonb, $3::timestamptz)`,
      [SNAPSHOT_VERSION, JSON.stringify(nextSnapshot), nextSnapshot.savedAt],
    );

    return nextSnapshot;
  }

  private async ensureSchema(): Promise<void> {
    await this.pool.query(`
      create table if not exists ${this.schemaName}.app_state_snapshots (
        id bigint generated always as identity primary key,
        snapshot_version integer not null,
        saved_at timestamptz not null default now(),
        snapshot jsonb not null
      )
    `);
  }
}
