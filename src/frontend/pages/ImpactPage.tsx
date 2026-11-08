import React, { useState } from "react";
import { PageHeader, EmptyState, ErrorState } from "../components/Common";
import { useResolver } from "../hooks/useResolver";

export default function ImpactPage() {
  const [changeId, setChangeId] = useState("");
  const { data, loading, error, call } = useResolver<any>("getChangeImpact");

  const analyze = () => {
    if (!changeId.trim()) return;
    void call({ changeId: changeId.trim() });
  };

  return (
    <div>
      <PageHeader title="Change Impact" subtitle="Understand the effect of a change." />
      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <input value={changeId} onChange={(e) => setChangeId(e.target.value)} placeholder="Change identifier" style={{ flex: 1, padding: 8, border: "1px solid #dcdfe4", borderRadius: 4 }} />
        <button onClick={analyze} disabled={loading || !changeId.trim()}>{loading ? "Analyzing..." : "Analyze"}</button>
      </div>
      {error ? <ErrorState message={error} onRetry={analyze} /> : null}
      {!data && !loading && !error ? <EmptyState title="No change selected" description="Enter a change identifier to analyze impact." /> : null}
      {data ? (
        <div style={{ padding: 16, border: "1px solid #dcdfe4", borderRadius: 8 }}>
          <div>Change: <code>{data.changeId}</code></div>
          <div style={{ marginTop: 8 }}>Impact: <strong>{data.impact}</strong></div>
          <div style={{ marginTop: 8, color: "#626f86" }}>Analyzed: {data.analyzedAt}</div>
          <div style={{ marginTop: 12 }}>
            <h4>Related evidence ({data.relatedEvidence?.length ?? 0})</h4>
            {data.relatedEvidence?.length ? <ul>{data.relatedEvidence.map((e: any, i: number) => <li key={i}>{e.source}: {e.title}</li>)}</ul> : <p>No related evidence.</p>}
          </div>
        </div>
      ) : null}
    </div>
  );
}
