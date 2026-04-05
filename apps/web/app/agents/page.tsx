import { AgentsClient } from "@/components/agents-client";

export default function AgentsPage() {
  return (
    <div className="page-stack">
      <section className="shell-content section-stack section-top">
        <AgentsClient />
      </section>
    </div>
  );
}
