import { useEffect } from "react";
import { Link } from "react-router-dom";
import { PageHeader, LoadingState, EmptyState, ErrorState, StatusPill } from "../components/Common";
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

export default function ReleasesPage() {
  const { data, loading, error, call } = useResolver<{ releases: ReleaseSummary[] }>("listReleases");
  useEffect(() => {
    void call();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const releases = data?.releases ?? [];

  return (
    <div>
      <PageHeader eyebrow="Release queue" title="Releases" subtitle="Ranked by evidence-backed verdict, not by board status." />
      {loading ? <LoadingState label="Scoring releases..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => void call()} /> : null}
      {!loading && !error && releases.length === 0 ? (
        <EmptyState
          title="No releases found"
          description="Releases are created from Jira versions during synchronization."
          action={<Link className="button primary" to="/integrations">Run synchronization</Link>}
        />
      ) : null}
      {releases.length > 0 ? (
        <div className="card" style={{ overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr><th>Release</th><th>Verdict</th><th>Risk</th><th>Confidence</th><th>Blockers</th><th>Lifecycle</th><th>Target</th></tr>
            </thead>
            <tbody>
              {releases.map((release) => (
                <tr key={release.id}>
                  <td><Link to={`/releases/${release.id}`}><strong>{release.version}</strong></Link><div className="muted">{release.title}</div></td>
                  <td><StatusPill status={release.verdict ?? "INSUFFICIENT_EVIDENCE"} /></td>
                  <td>{release.riskScore ?? "—"}</td>
                  <td>{release.confidence ?? 0}%</td>
                  <td>{release.blockerCount ?? 0}</td>
                  <td>{release.status}</td>
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
