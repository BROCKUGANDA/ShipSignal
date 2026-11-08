import React, { useEffect } from "react";
import { PageHeader, LoadingState, EmptyState, ErrorState, MetricCard } from "../components/Common";
import { useResolver } from "../hooks/useResolver";
import { Link } from "react-router-dom";

export default function OverviewPage() {
  const { data, loading, error, call } = useResolver<any>("getProjectHealth");
  const { data: releasesData, call: listReleases } = useResolver<any>("listReleases");

  useEffect(() => {
    void call();
  }, [call]);
  useEffect(() => {
    void listReleases();
  }, [listReleases]);

  const releases = releasesData?.releases ?? [];
  const active = releases.filter((r: any) => r.status === "ACTIVE").length;
  const critical = releases.filter((r: any) => r.status === "BLOCKED").length;
  const blockers = releases.filter((r: any) => r.status === "BLOCKED" || r.status === "AT_RISK").length;

  return (
    <div>
      <PageHeader title="Workspace Overview" subtitle="Evidence-driven release intelligence." />
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <MetricCard label="Active Releases" value={active} hint={releases.length ? `${releases.length} tracked` : "Connect a project to begin."} />
        <MetricCard label="Critical Risks" value={critical} hint={critical === 0 ? "No blocked releases" : `${critical} blocked`} />
        <MetricCard label="Open Blockers" value={blockers} hint={blockers === 0 ? "No at-risk/blocked releases" : `${blockers} need attention`} />
      </div>
      {loading ? <LoadingState label="Checking integration health..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => void call()} /> : null}
      {!loading && !error && data ? (
        <div style={{ padding: 16, border: "1px solid #dcdfe4", borderRadius: 8, marginBottom: 16 }}>
          <strong>Integration health</strong>
          <div style={{ marginTop: 8, fontSize: 13 }}>
            Jira: {data.jira?.healthy ? "Healthy" : `Unhealthy (${data.jira?.message ?? "unknown"})`}<br />
            Bitbucket: {data.bitbucket?.healthy ? "Healthy" : `Unhealthy (${data.bitbucket?.message ?? "unknown"})`}<br />
            Confluence: {data.confluence?.healthy ? "Healthy" : `Unhealthy (${data.confluence?.message ?? "unknown"})`}<br />
            Compass: {data.compass?.healthy ? "Healthy" : `Unhealthy (${data.compass?.message ?? "unknown"})`}
          </div>
        </div>
      ) : null}
      <div>
        <h3>Recent releases</h3>
        {releases.length === 0 ? (
          <EmptyState
            title="No releases yet"
            description="Synchronize a project to populate releases."
            action={<Link to="/integrations">Go to Integrations</Link>}
          />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #dcdfe4" }}>
                <th style={{ padding: 8 }}>Version</th>
                <th style={{ padding: 8 }}>Title</th>
                <th style={{ padding: 8 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {releases.map((r: any) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #f0f1f3" }}>
                  <td style={{ padding: 8 }}><Link to={`/releases/${r.id}`}>{r.version}</Link></td>
                  <td style={{ padding: 8 }}>{r.title}</td>
                  <td style={{ padding: 8 }}>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
