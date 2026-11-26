import { useEffect } from "react";
import { Link } from "react-router-dom";
import { PageHeader, LoadingState, ErrorState, EmptyState, StatusPill } from "../components/Common";
import { useResolver } from "../hooks/useResolver";

interface ReleaseRisk {
  id: string;
  version: string;
  title: string;
  verdict?: string;
  riskScore?: number | null;
  confidence?: number;
  blockerCount?: number;
}

export default function RisksPage() {
  const { data, loading, error, call } = useResolver<{ releases: ReleaseRisk[] }>("listReleases");
  useEffect(() => {
    void call();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const releases = (data?.releases ?? []).filter((release) => (release.blockerCount ?? 0) > 0 || release.verdict === "HOLD" || release.verdict === "SHIP_WITH_GUARDRAILS");

  return (
    <div>
      <PageHeader eyebrow="Risk register" title="Open release risks" subtitle="Only releases with cited blockers or guardrails appear here." />
      {loading ? <LoadingState label="Loading risk register..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => void call()} /> : null}
      {!loading && !error && releases.length === 0 ? (
        <EmptyState title="No open risks" description="No release currently has a cited blocker or guardrail. New evidence will appear after sync." />
      ) : null}
      {releases.length > 0 ? (
        <div className="check-grid">
          {releases.map((release) => (
            <div key={release.id} className="card panel">
              <div className="check-head">
                <Link to={`/releases/${release.id}`}><strong>{release.version}</strong></Link>
                <StatusPill status={release.verdict ?? "INSUFFICIENT_EVIDENCE"} />
              </div>
              <div className="muted">{release.title}</div>
              <div className="verdict-meta">
                <span>{release.blockerCount} blocker(s)</span>
                <span>Risk {release.riskScore ?? "—"}</span>
                <span>Confidence {release.confidence ?? 0}%</span>
              </div>
              <div className="actions"><Link className="button" to={`/releases/${release.id}`}>Open cited factors</Link></div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
