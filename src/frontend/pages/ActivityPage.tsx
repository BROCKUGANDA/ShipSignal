import React, { useEffect } from "react";
import { PageHeader, LoadingState, EmptyState, ErrorState } from "../components/Common";
import { useResolver } from "../hooks/useResolver";

export default function ActivityPage() {
  const { data, loading, error, call } = useResolver<any>("getRiskEvidence");
  useEffect(() => {
    void call({ limit: 25 });
  }, [call]);

  if (loading) return <div><PageHeader title="Activity & Audit" subtitle="Searchable audit records." /><LoadingState /></div>;
  if (error) return <div><PageHeader title="Activity & Audit" /><ErrorState message={error} onRetry={() => void call({ limit: 25 })} /></div>;
  const rows = data?.evidence ?? [];
  if (rows.length === 0) {
    return <div><PageHeader title="Activity & Audit" subtitle="Searchable audit records." /><EmptyState title="No activity" description="Audit events appear after sync and readiness operations." /></div>;
  }
  return (
    <div>
      <PageHeader title="Activity & Audit" subtitle="Searchable audit records." />
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr style={{ borderBottom: "1px solid #dcdfe4", textAlign: "left" }}><th style={{ padding: 8 }}>Title</th><th style={{ padding: 8 }}>Source</th><th style={{ padding: 8 }}>Retrieved</th></tr></thead>
        <tbody>{rows.map((r: any) => <tr key={r.id} style={{ borderBottom: "1px solid #f0f1f3" }}><td style={{ padding: 8 }}>{r.title}</td><td style={{ padding: 8 }}>{r.sourcePlatform}</td><td style={{ padding: 8 }}>{r.retrievedAt}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
