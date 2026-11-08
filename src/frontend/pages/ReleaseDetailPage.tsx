import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "../components/Common";
import { Tabs } from "../components/Tabs";
import { useResolver } from "../hooks/useResolver";

const TABS = ["Summary", "Readiness", "Timeline", "Issues", "Pull requests", "Dependencies", "Evidence", "Risks", "Approvals", "Audit"];

export default function ReleaseDetailPage() {
  const { releaseId } = useParams();
  const [active, setActive] = useState("Summary");
  const { data, loading, error, call } = useResolver<any>("getReleaseReadiness");

  useEffect(() => {
    if (releaseId) void call({ releaseId, includeEvidence: true });
  }, [releaseId, call]);

  const evidence: any[] = data?.evidence ?? [];
  const byType = (t: string) => evidence.filter((e) => e.evidenceType === t);
  const timeline = [...evidence].sort((a, b) => String(a.retrievedAt).localeCompare(String(b.retrievedAt)));

  return (
    <div>
      <PageHeader title={`Release ${releaseId ?? ""}`} subtitle="Readiness assessment and evidence." />
      <Tabs tabs={TABS} active={active} onChange={setActive} />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={() => releaseId && void call({ releaseId })} /> : null}
      {!loading && !error && !data ? <EmptyState title="No assessment" description="This release has no assessment yet. Sync the project to generate evidence." /> : null}
      {!loading && !error && data ? (
        <div>
          {active === "Summary" ? (
            <div style={{ padding: 16, border: "1px solid #dcdfe4", borderRadius: 8 }}>
              <div>Status: <strong>{data.status}</strong></div>
              <div style={{ marginTop: 8 }}>Risk score: {data.riskScore ?? "not computed"}</div>
              <div style={{ marginTop: 8 }}>Freshness: {data.evidenceFreshness} · Assessed: {data.assessedAt}</div>
              {data.warnings?.length ? <div style={{ marginTop: 8, color: "#ae2e24" }}>{data.warnings.join(", ")}</div> : null}
            </div>
          ) : null}
          {active === "Readiness" ? (
            <div>
              <p>Risk: {data.status} {data.riskScore != null ? `(${data.riskScore})` : ""}</p>
              <h4 style={{ marginTop: 16 }}>Factors</h4>
              {data.factors?.length === 0 ? <p>No risk factors.</p> : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr style={{ borderBottom: "1px solid #dcdfe4", textAlign: "left" }}><th style={{ padding: 8 }}>Severity</th><th style={{ padding: 8 }}>Category</th><th style={{ padding: 8 }}>Description</th></tr></thead>
                  <tbody>{data.factors.map((f: any, i: number) => (<tr key={i} style={{ borderBottom: "1px solid #f0f1f3" }}><td style={{ padding: 8 }}>{f.severity}</td><td style={{ padding: 8 }}>{f.category}</td><td style={{ padding: 8 }}>{f.description}<br /><span style={{ color: "#626f86" }}>{f.recommendation}</span></td></tr>))}</tbody>
                </table>
              )}
              <h4>Recommendations</h4>
              <ul>{data.recommendations?.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul>
            </div>
          ) : null}
          {active === "Timeline" ? (
            timeline.length ? <ul>{timeline.map((e, i) => <li key={i}>{e.retrievedAt} — {e.title} ({e.sourcePlatform})</li>)}</ul>
            : <EmptyState title="No timeline events" description="Evidence timestamps will appear after synchronization." />
          ) : null}
          {active === "Issues" ? (
            byType("issue_snapshot").length ? <p>{byType("issue_snapshot").map((e) => e.summary).join("; ")}</p>
            : <EmptyState title="No Jira issues linked" description="Issue snapshots appear after Jira synchronization." />
          ) : null}
          {active === "Pull requests" ? (
            byType("pull_request_snapshot").length ? <p>{byType("pull_request_snapshot").map((e) => e.summary).join("; ")}</p>
            : <EmptyState title="No pull requests linked" description="Bitbucket evidence appears after synchronization." />
          ) : null}
          {active === "Dependencies" ? (
            <p>See the Dependencies page for the live topology derived from Compass and evidence.</p>
          ) : null}
          {active === "Evidence" ? (
            evidence.length ? (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ borderBottom: "1px solid #dcdfe4", textAlign: "left" }}><th style={{ padding: 8 }}>Title</th><th style={{ padding: 8 }}>Source</th><th style={{ padding: 8 }}>Freshness</th></tr></thead>
                <tbody>{evidence.map((e: any, i: number) => (<tr key={i} style={{ borderBottom: "1px solid #f0f1f3" }}><td style={{ padding: 8 }}>{e.title}</td><td style={{ padding: 8 }}>{e.sourcePlatform}</td><td style={{ padding: 8 }}>{e.freshness}</td></tr>))}</tbody>
              </table>
            ) : <EmptyState title="No evidence" description="Evidence will appear after synchronization." />
          ) : null}
          {active === "Risks" ? (
            <div>
              <h4>Blockers ({data.blockers?.length ?? 0})</h4>
              {data.blockers?.length === 0 ? <p>No blockers.</p> : <ul>{data.blockers.map((b: any, i: number) => <li key={i}>{b.severity} - {b.description}</li>)}</ul>}
            </div>
          ) : null}
          {active === "Approvals" ? (
            <EmptyState title="No pending approvals" description="Approval-gated mutations (e.g. remediation tasks) will appear here after confirmation." />
          ) : null}
          {active === "Audit" ? <EmptyState title="Audit history" description="Audit events are recorded for readiness checks and sync operations." /> : null}
        </div>
      ) : null}
    </div>
  );
}