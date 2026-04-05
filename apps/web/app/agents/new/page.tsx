import { AgentWizard } from "@/components/agent-wizard";

export default function NewAgentPage() {
  return (
    <div className="page-stack">
      <section className="shell-content section-stack section-top">
        <AgentWizard />
      </section>
    </div>
  );
}
