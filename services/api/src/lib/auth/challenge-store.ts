import { AppError } from "../errors";
import type { AuthChallengeRecord } from "./types";

export interface ChallengeStore {
  create(record: AuthChallengeRecord): Promise<void>;
  get(id: string): Promise<AuthChallengeRecord | null>;
  consume(id: string): Promise<void>;
}

export class InMemoryChallengeStore implements ChallengeStore {
  private readonly records = new Map<string, AuthChallengeRecord>();

  async create(record: AuthChallengeRecord): Promise<void> {
    this.records.set(record.id, record);
  }

  async get(id: string): Promise<AuthChallengeRecord | null> {
    const record = this.records.get(id) ?? null;
    if (!record) {
      return null;
    }
    if (record.expiresAt.getTime() <= Date.now()) {
      this.records.delete(id);
      return null;
    }
    return record;
  }

  async consume(id: string): Promise<void> {
    const record = await this.get(id);
    if (!record) {
      throw new AppError("challenge_not_found", "Auth challenge not found or expired", 404);
    }
    if (record.consumedAt) {
      throw new AppError("challenge_already_used", "Auth challenge has already been used", 409);
    }
    record.consumedAt = new Date();
    this.records.set(id, record);
  }
}
