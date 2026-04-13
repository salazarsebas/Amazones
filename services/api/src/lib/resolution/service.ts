import { randomUUID } from "node:crypto";

import { AppError } from "../errors";
import type { InMemoryAgentService } from "../agents/service";
import type { InMemoryMarketCatalog } from "../markets/service";

export interface ResolutionProposal {
  id: string;
  marketId: string;
  proposedOutcome: "yes" | "no" | "invalid";
  evidenceUrls: string[];
  explanation?: string;
  bondAmountUsdc: string;
  proposerWallet: string;
  status: "proposed" | "challenged" | "finalized";
  challengeDeadline: string;
  createdAt: string;
  challengedAt?: string;
}

export class InMemoryResolutionService {
  private readonly proposals = new Map<string, ResolutionProposal>();
  private persistState?: () => void;

  constructor(
    private readonly markets: InMemoryMarketCatalog,
    private readonly agentService?: InMemoryAgentService,
  ) {}

  setPersistenceHandler(handler: () => void): void {
    this.persistState = handler;
  }

  propose(input: {
    marketId: string;
    proposedOutcome: "yes" | "no" | "invalid";
    evidenceUrls: string[];
    explanation?: string;
    bondAmountUsdc: string;
    proposerWallet: string;
  }): ResolutionProposal {
    const agent = this.agentService?.assertResolutionAllowed(input.proposerWallet) ?? null;
    const market = this.markets.get(input.marketId);
    if (!market) {
      throw new AppError("unknown_market", "Market does not exist", 404);
    }

    const createdAt = new Date();
    const challengeDeadline = new Date(
      createdAt.getTime() + market.resolutionPolicy.challengePeriodHours * 60 * 60 * 1000,
    );
    const proposal: ResolutionProposal = {
      id: randomUUID(),
      marketId: input.marketId,
      proposedOutcome: input.proposedOutcome,
      evidenceUrls: input.evidenceUrls,
      explanation: input.explanation,
      bondAmountUsdc: input.bondAmountUsdc,
      proposerWallet: input.proposerWallet,
      status: "proposed",
      challengeDeadline: challengeDeadline.toISOString(),
      createdAt: createdAt.toISOString(),
    };

    this.proposals.set(proposal.id, proposal);
    this.markets.markResolving(input.marketId);
    this.persistState?.();
    if (agent) {
      this.agentService?.recordExecution(agent, "agent.resolution_proposed", {
        proposal_id: proposal.id,
        market_id: proposal.marketId,
        proposed_outcome: proposal.proposedOutcome,
      });
    }
    return proposal;
  }

  challenge(input: { proposalId: string }): ResolutionProposal {
    const proposal = this.proposals.get(input.proposalId);
    if (!proposal) {
      throw new AppError("proposal_not_found", "Resolution proposal not found", 404);
    }
    proposal.status = "challenged";
    proposal.challengedAt = new Date().toISOString();
    this.proposals.set(proposal.id, proposal);
    this.persistState?.();
    return proposal;
  }

  finalizeDue(now = new Date()): ResolutionProposal[] {
    const finalized: ResolutionProposal[] = [];

    for (const proposal of this.proposals.values()) {
      if (proposal.status !== "proposed") {
        continue;
      }
      if (new Date(proposal.challengeDeadline).getTime() > now.getTime()) {
        continue;
      }

      proposal.status = "finalized";
      this.proposals.set(proposal.id, proposal);
      this.markets.markResolved(proposal.marketId, proposal.proposedOutcome);
      finalized.push(proposal);
    }

    if (finalized.length > 0) {
      this.persistState?.();
    }

    return finalized;
  }

  list(): ResolutionProposal[] {
    return [...this.proposals.values()];
  }

  load(proposals: ResolutionProposal[]): void {
    this.proposals.clear();
    for (const proposal of proposals) {
      this.proposals.set(proposal.id, proposal);
    }
  }
}
