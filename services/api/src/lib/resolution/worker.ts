import type { InMemoryAuditLogService } from "../audit/service";
import type { RealtimeEventBus } from "../realtime/event-bus";
import type { InMemoryResolutionService } from "./service";

export class ResolutionWorker {
  private timer: Timer | null = null;

  constructor(
    private readonly resolutionService: InMemoryResolutionService,
    private readonly auditLog: InMemoryAuditLogService,
    private readonly eventBus: RealtimeEventBus,
  ) {}

  start(intervalMs: number): void {
    if (this.timer) {
      return;
    }
    this.timer = setInterval(() => this.runOnce(), intervalMs);
  }

  stop(): void {
    if (!this.timer) {
      return;
    }
    clearInterval(this.timer);
    this.timer = null;
  }

  runOnce(now = new Date()): void {
    const finalized = this.resolutionService.finalizeDue(now);

    for (const proposal of finalized) {
      this.auditLog.write({
        traceId: `resolution-worker:${proposal.id}`,
        actorType: "worker",
        actorId: "resolution-worker",
        eventType: "resolution.finalized",
        entityType: "proposal",
        entityId: proposal.id,
        payload: {
          market_id: proposal.marketId,
          outcome: proposal.proposedOutcome,
        },
      });
      this.eventBus.publish({
        channel: `market:${proposal.marketId}:resolution`,
        type: "resolution.finalized",
        payload: proposal,
        emittedAt: new Date().toISOString(),
      });
    }
  }
}
