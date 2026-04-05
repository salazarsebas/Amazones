import type { MarketStatus } from "@/lib/types";

const labels: Record<MarketStatus, string> = {
  draft: "Draft",
  open: "Open",
  closed: "Closed",
  resolving: "Resolving",
  resolved: "Resolved",
  invalid: "Invalid",
};

export function MarketStatusBadge({ status }: { status: MarketStatus }) {
  return <span className={`status-badge status-${status}`}>{labels[status]}</span>;
}
