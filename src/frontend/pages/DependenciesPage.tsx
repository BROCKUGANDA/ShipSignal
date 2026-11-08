import React, { useEffect } from "react";
import { PageHeader, LoadingState, ErrorState } from "../components/Common";
import { DependencyGraph } from "../components/DependencyGraph";
import { useResolver } from "../hooks/useResolver";

export default function DependenciesPage() {
  const { data, loading, error, call } = useResolver<any>("getServiceDependencies");
  useEffect(() => {
    void call({});
  }, [call]);

  if (loading) return <div><PageHeader title="Dependencies" subtitle="Service topology and impact." /><LoadingState /></div>;
  if (error) return <div><PageHeader title="Dependencies" /><ErrorState message={error} onRetry={() => void call({})} /></div>;
  const deps = data?.derivedDependencies ?? [];
  const nodes = deps.slice(0, 8).map((d: any, i: number) => ({
    id: d.id,
    label: d.name || d.id,
    x: 80 + (i % 4) * 140,
    y: 80 + Math.floor(i / 4) * 140,
  }));
  // If no live data, show honest empty graph with note
  const displayNodes = nodes.length ? nodes : [{ id: "empty", label: "No dependencies yet", x: 200, y: 100 }];
  const edges = nodes.slice(1).map((n: any, i: number) => ({ from: nodes[0].id, to: n.id }));

  return (
    <div>
      <PageHeader title="Dependencies" subtitle="Service topology and impact." />
      <DependencyGraph nodes={displayNodes} edges={edges} />
      <p style={{ color: "#626f86", marginTop: 12 }}>
        {deps.length
          ? `${deps.length} dependencies derived from evidence. Compass partial: ${data?.partial ? "yes" : "no"}. Warnings: ${data?.warnings?.join(", ") ?? "none"}`
          : "Live data loads after synchronization. Compass and Bitbucket evidence populate this topology."}
      </p>
      {deps.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
          <thead><tr style={{ borderBottom: "1px solid #dcdfe4", textAlign: "left" }}><th style={{ padding: 8 }}>Name</th><th style={{ padding: 8 }}>Source</th><th style={{ padding: 8 }}>Freshness</th></tr></thead>
          <tbody>{deps.map((d: any) => <tr key={d.id} style={{ borderBottom: "1px solid #f0f1f3" }}><td style={{ padding: 8 }}>{d.name}</td><td style={{ padding: 8 }}>{d.source}</td><td style={{ padding: 8 }}>{d.freshness}</td></tr>)}</tbody>
        </table>
      )}
    </div>
  );
}
