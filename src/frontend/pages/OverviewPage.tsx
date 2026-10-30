import React, { useEffect } from "react";
import { PageHeader, LoadingState, EmptyState, ErrorState, MetricCard } from "../components/Common";
import { useResolver } from "../hooks/useResolver";

export default function OverviewPage() {
  const { data, loading, error, call } = useResolver<{ healthy: boolean; message?: string }>("getProjectHealth");

  useEffect(() => {
    void call();
  }, [call]);

  return (
    <div>
      <PageHeader title="Workspace Overview" subtitle="Evidence-driven release intelligence." />
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <MetricCard label="Active Releases" value={0} hint="Connect a project to begin." />
        <MetricCard label="Critical Risks" value={0} />
        <MetricCard label="Open Blockers" value={0} />
      </div>
      {loading ? <LoadingState label="Checking integration health..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => void call()} /> : null}
      {!loading && !error && data ? (
        <div style={{ padding: 16, border: "1px solid #dcdfe4", borderRadius: 8 }}>
          Integration health: {data.healthy ? "Healthy" : `Unhealthy (${data.message ?? "unknown"})`}
        </div>
      ) : null}
      {!loading && !error && !data ? (
        <EmptyState
          title="No projects connected"
          description="Connect a Jira project to start analyzing releases."
        />
      ) : null}
    </div>
  );
}