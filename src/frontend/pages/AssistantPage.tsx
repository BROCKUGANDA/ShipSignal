import React from "react";
import { PageHeader } from "../components/Common";
export default function AssistantPage() {
  return (
    <div>
      <PageHeader title="AI Assistant" subtitle="Ask ShipSignal about releases and risks." />
      <p style={{ color: "#626f86" }}>AI features require Rovo agent configuration.</p>
    </div>
  );
}