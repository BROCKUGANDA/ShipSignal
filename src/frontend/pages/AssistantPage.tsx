import React, { useState } from "react";
import { PageHeader, ErrorState } from "../components/Common";
import { useResolver } from "../hooks/useResolver";

export default function AssistantPage() {
  const [changeId, setChangeId] = useState("");
  const { data, loading, error, call } = useResolver<any>("getChangeImpact");

  const onAsk = () => {
    if (!changeId.trim()) return;
    void call({ changeId: changeId.trim() });
  };

  return (
    <div>
      <PageHeader title="AI Assistant" subtitle="Ask ShipSignal about releases and risks." />
      <p style={{ color: "#626f86" }}>
        This assistant uses evidence-backed resolvers (deterministic risk) — AI only explains evidence.
        Rovo agent actions: <code>getReleaseReadiness</code>, <code>getReleaseBlockers</code>.
      </p>
      <div style={{ marginTop: 16, padding: 16, border: "1px solid #dcdfe4", borderRadius: 8 }}>
        <h3>Change impact</h3>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            value={changeId}
            onChange={(e) => setChangeId(e.target.value)}
            placeholder="Change / PR / issue identifier"
            style={{ flex: 1, padding: 8, border: "1px solid #dcdfe4", borderRadius: 4 }}
            onKeyDown={(e) => e.key === "Enter" && onAsk()}
          />
          <button onClick={onAsk} disabled={loading || !changeId.trim()}>{loading ? "Analyzing..." : "Analyze"}</button>
        </div>
        {error ? <div style={{ marginTop: 12 }}><ErrorState message={error} onRetry={onAsk} /></div> : null}
        {data ? (
          <div style={{ marginTop: 12 }}>
            <p>Change: <code>{data.changeId}</code> · Impact: <strong>{data.impact}</strong> · Analyzed: {data.analyzedAt}</p>
            {data.relatedEvidence?.length ? (
              <ul>{data.relatedEvidence.map((e: any, i: number) => <li key={i}>{e.source}: {e.title} ({e.freshness})</li>)}</ul>
            ) : <p style={{ color: "#626f86" }}>No related evidence found for this identifier yet.</p>}
          </div>
        ) : null}
      </div>
    </div>
  );
}
