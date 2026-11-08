import React, { useEffect } from "react";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "../components/Common";
import { useResolver } from "../hooks/useResolver";

export default function EvidencePage() {
  const { data, loading, error, call } = useResolver<any>("getRiskEvidence");
  useEffect(() => {
    void call({ limit: 50 });
  }, [call]);

  if (loading) return <div><PageHeader title="Evidence" subtitle="Provenance of retrieved information." /><LoadingState /></div>;
  if (error) return <div><PageHeader title="Evidence" /><ErrorState message={error} onRetry={() => void call({ limit: 50 })} /></div>;
  const rows = data?.evidence ?? [];
  if (rows.length === 0) {
    return <div><PageHeader title="Evidence" subtitle="Provenance of retrieved information." /><EmptyState title="No evidence records" description="Evidence appears after a successful synchronization." /></div>;
  }
  return (
    <div>
      <PageHeader title="Evidence" subtitle={`Provenance of retrieved information. ${rows.length} records.`} />
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #dcdfe4" }}>
            <th style={{ padding: 8 }}>ID</th>
            <th style={{ padding: 8 }}>Source</th>
            <th style={{ padding: 8 }}>Type</th>
            <th style={{ padding: 8 }}>Title</th>
            <th style={{ padding: 8 }}>Retrieved</th>
            <th style={{ padding: 8 }}>Freshness</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any) => (
            <tr key={r.id} style={{ borderBottom: "1px solid #f0f1f3" }}>
              <td style={{ padding: 8, fontFamily: "monospace" }}>{r.id.slice(0, 18)}</td>
              <td style={{ padding: 8 }}>{r.sourcePlatform}</td>
              <td style={{ padding: 8 }}>{r.evidenceType}</td>
              <td style={{ padding: 8 }}>{r.title}</td>
              <td style={{ padding: 8 }}>{r.retrievedAt}</td>
              <td style={{ padding: 8 }}>{r.freshness}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
