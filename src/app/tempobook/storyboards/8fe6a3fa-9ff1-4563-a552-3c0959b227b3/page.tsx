"use client";

import AgentFormWrapper from "@/components/agents/AgentFormWrapper";

export default function AgentFormStoryboard() {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Add New Agent</h2>
      <AgentFormWrapper onSuccessUrl="#success" onCancelUrl="#cancel" />
    </div>
  );
}
