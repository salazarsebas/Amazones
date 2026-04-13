import type { Pool } from "pg";

import { AppError } from "../errors";
import type { AuthChallengeRecord } from "./types";
import type { ChallengeStore } from "./challenge-store";

export class PostgresChallengeStore implements ChallengeStore {
  constructor(private readonly pool: Pool) {}

  async create(record: AuthChallengeRecord): Promise<void> {
    await this.pool.query(
      `insert into auth_challenges
        (id, wallet_address, challenge_text, agent_name, expires_at, consumed_at, created_at)
       values ($1::uuid, $2, $3, $4, $5::timestamptz, $6::timestamptz, now())`,
      [
        record.id,
        record.walletAddress,
        record.challengeText,
        record.agentName ?? null,
        record.expiresAt.toISOString(),
        record.consumedAt?.toISOString() ?? null,
      ],
    );
  }

  async get(id: string): Promise<AuthChallengeRecord | null> {
    const result = await this.pool.query<{
      id: string;
      wallet_address: string;
      challenge_text: string;
      agent_name: string | null;
      expires_at: Date;
      consumed_at: Date | null;
    }>(
      `select id, wallet_address, challenge_text, agent_name, expires_at, consumed_at
         from auth_challenges
        where id = $1::uuid
        limit 1`,
      [id],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }
    if (new Date(row.expires_at).getTime() <= Date.now()) {
      await this.pool.query(`delete from auth_challenges where id = $1::uuid`, [id]);
      return null;
    }

    return {
      id: row.id,
      walletAddress: row.wallet_address,
      challengeText: row.challenge_text,
      agentName: row.agent_name ?? undefined,
      expiresAt: new Date(row.expires_at),
      consumedAt: row.consumed_at ? new Date(row.consumed_at) : undefined,
    };
  }

  async consume(id: string): Promise<void> {
    const record = await this.get(id);
    if (!record) {
      throw new AppError("challenge_not_found", "Auth challenge not found or expired", 404);
    }
    if (record.consumedAt) {
      throw new AppError("challenge_already_used", "Auth challenge has already been used", 409);
    }

    await this.pool.query(
      `update auth_challenges
          set consumed_at = now()
        where id = $1::uuid
          and consumed_at is null`,
      [id],
    );
  }
}
