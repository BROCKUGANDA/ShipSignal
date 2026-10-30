import React from "react";
import { PageHeader } from "../components/Common";
import { DependencyGraph } from "../components/DependencyGraph";

const nodes = [
  { id: "svc-a", label: "svc-a", x: 80, y: 100 },
  { id: "svc-b", label: "svc-b", x: 240, y: 60 },
  { id: "svc-c", label: "svc-c", x: 240, y: 180 },
  { id: "db", label: "db", x: 400, y: 120 },
];
const edges = [
  { from: "svc-a", to: "svc-b" },
  { from: "svc-a", to: "svc-c" },
  { from: "svc-b", to: "db" },
  { from: "svc-c", to: "db" },
];

export default function DependenciesPage() {
  return (
    <div>
      <PageHeader title="Dependencies" subtitle="Service topology and impact." />
      <DependencyGraph nodes={nodes} edges={edges} />
      <p style={{ color: "#626f86", marginTop: 12 }}>Sample topology. Live data loads after synchronization.</p>
    </div>
  );
}