import { AgentDetailClient } from "@/components/agent-detail-client";

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;

  return (
    <div className="page-stack">
      <section className="shell-content section-stack section-top">
        <AgentDetailClient agentId={agentId} />
      </section>
    </div>
  );
}
