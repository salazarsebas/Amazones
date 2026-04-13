import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import type { AppStateSnapshot, DurableStateStore } from "./types";

export class JsonSnapshotStore implements DurableStateStore {
  private readonly filePath: string;

  constructor(snapshotPath: string) {
    this.filePath = resolve(process.cwd(), snapshotPath);
  }

  describe(): string {
    return this.filePath;
  }

  async exists(): Promise<boolean> {
    return existsSync(this.filePath);
  }

  async load(): Promise<AppStateSnapshot | null> {
    if (!(await this.exists())) {
      return null;
    }

    const raw = readFileSync(this.filePath, "utf8");
    const parsed = JSON.parse(raw) as AppStateSnapshot;
    if (parsed.version !== 1) {
      throw new Error(`Unsupported snapshot version: ${String(parsed.version)}`);
    }

    return parsed;
  }

  async save(snapshot: Omit<AppStateSnapshot, "version" | "savedAt">): Promise<AppStateSnapshot> {
    const nextSnapshot: AppStateSnapshot = {
      version: 1,
      savedAt: new Date().toISOString(),
      ...snapshot,
    };

    mkdirSync(dirname(this.filePath), { recursive: true });
    const tempFile = `${this.filePath}.tmp`;
    writeFileSync(tempFile, JSON.stringify(nextSnapshot, null, 2), "utf8");
    renameSync(tempFile, this.filePath);
    return nextSnapshot;
  }
}
