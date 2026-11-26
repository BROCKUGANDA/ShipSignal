import { useEffect } from "react";
import { Link } from "react-router-dom";
import { PageHeader, LoadingState, EmptyState, ErrorState, MetricCard, StatusPill } from "../components/Common";
import { useResolver } from "../hooks/useResolver";

interface ReleaseSummary {
  id: string;
  version: string;
  title: string;
  status: string;
  targetDate?: string;
  verdict?: string;
  riskScore?: number | null;
  confidence?: number;
  blockerCount?: number;
}

interface HealthEntry {
  healthy?: boolean;
  message?: string;
  checkedAt?: string;
}

export default function OverviewPage() {
  const health = useResolver<Record<string, HealthEntry>>("getProjectHealth");
  const releasesQuery = useResolver<{ releases: ReleaseSummary[] }>("listReleases");

  useEffect(() => {
    void health.call();
    void releasesQuery.call();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const releases = releasesQuery.data?.releases ?? [];
  const hold = releases.filter((release) => release.verdict === "HOLD").length;
  const guarded = releases.filter((release) => release.verdict === "SHIP_WITH_GUARDRAILS").length;
  const insufficient = releases.filter((release) => release.verdict === "INSUFFICIENT_EVIDENCE").length;
  const healthySources = ["jira", "bitbucket", "confluence", "compass", "teamworkGraph"].filter(
    (key) => health.data?.[key]?.healthy
  ).length;

  return (
    <div>
      <PageHeader
        eyebrow="Release room"
        title="Can we ship this?"
        subtitle="A release decision is only as good as the evidence behind it. ShipSignal shows the verdict, the blockers, and the exact source records."
      />

      <div className="metric-grid">
        <MetricCard label="Releases in scope" value={releases.length} hint={releases.length ? "Latest synchronized projects" : "Run a sync to populate releases"} />
        <MetricCard label="Hold" value={hold} hint={hold === 0 ? "No blocking evidence" : "Critical evidence must clear"} />
        <MetricCard label="Ship with guardrails" value={guarded} hint={guarded === 0 ? "No guardrailed releases" : "Proceed only with named owners"} />
        <MetricCard label="Insufficient evidence" value={insufficient} hint={insufficient === 0 ? "Every release has enough context" : "Connect missing sources"} />
      </div>

      {health.loading ? <LoadingState label="Checking integration health..." /> : null}
      {health.error ? <ErrorState message={health.error} onRetry={() => void health.call()} /> : null}
      {health.data ? (
        <div className="card panel" style={{ marginBottom: 22 }}>
          <div className="check-head">
            <div>
              <div className="eyebrow">Context coverage</div>
              <h3 style={{ margin: "5px 0 0" }}>{healthySources}/5 sources healthy</h3>
            </div>
            <Link className="button" to="/integrations">Manage integrations</Link>
          </div>
          <div className="coverage" style={{ marginTop: 14 }}>
            {["jira", "bitbucket", "confluence", "compass", "teamworkGraph"].map((key) => {
              const entry = health.data?.[key];
              return (
                <span key={key} className="chip">
                  {key} <StatusPill status={entry?.healthy ? "PASS" : "WARN"} />
                </span>
              );
            })}
          </div>
          {healthySources < 5 ? (
            <p className="muted" style={{ marginBottom: 0, fontSize: 12 }}>
              A missing source does not invent evidence. It lowers confidence and appears as an evidence gap in each release brief.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="section-title">Recent releases</div>
      {releasesQuery.loading ? <LoadingState label="Scoring releases..." /> : null}
      {releasesQuery.error ? <ErrorState message={releasesQuery.error} onRetry={() => void releasesQuery.call()} /> : null}
      {!releasesQuery.loading && !releasesQuery.error && releases.length === 0 ? (
        <EmptyState
          title="No releases yet"
          description="Synchronize a Jira project to create releases from versions and collect cited evidence."
          action={<Link className="button primary" to="/integrations">Run synchronization</Link>}
        />
      ) : null}
      {releases.length > 0 ? (
        <div className="card" style={{ overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Release</th>
                <th>Verdict</th>
                <th>Risk</th>
                <th>Confidence</th>
                <th>Blockers</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {releases.map((release) => (
                <tr key={release.id}>
                  <td>
                    <Link to={`/releases/${release.id}`}><strong>{release.version}</strong></Link>
                    <div className="muted">{release.title}</div>
                  </td>
                  <td><StatusPill status={release.verdict ?? "INSUFFICIENT_EVIDENCE"} /></td>
                  <td>{release.riskScore ?? "—"}</td>
                  <td>{release.confidence ?? 0}%</td>
                  <td>{release.blockerCount ?? 0}</td>
                  <td>{release.targetDate ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
