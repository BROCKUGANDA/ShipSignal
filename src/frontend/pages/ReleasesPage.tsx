import React, { useEffect } from "react";
import { PageHeader, LoadingState, EmptyState, ErrorState } from "../components/Common";
import { useResolver } from "../hooks/useResolver";
import { Link } from "react-router-dom";

export default function ReleasesPage() {
  const { data, loading, error, call } = useResolver<any>("listReleases");
  useEffect(() => {
    void call();
  }, [call]);

  const releases = data?.releases ?? [];

  if (loading) return <div><PageHeader title="Releases" subtitle="Track release readiness across projects." /><LoadingState /></div>;
  if (error) return <div><PageHeader title="Releases" /><ErrorState message={error} onRetry={() => void call()} /></div>;
  if (releases.length === 0) {
    return (
      <div>
        <PageHeader title="Releases" subtitle="Track release readiness across projects." />
        <EmptyState title="No releases found" description="Releases will appear once a project is synchronized." action={<Link to="/settings">Sync now</Link>} />
      </div>
    );
  }
  return (
    <div>
      <PageHeader title="Releases" subtitle="Track release readiness across projects." />
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #dcdfe4" }}>
            <th style={{ padding: 8 }}>Version</th>
            <th style={{ padding: 8 }}>Title</th>
            <th style={{ padding: 8 }}>Status</th>
            <th style={{ padding: 8 }}>Target date</th>
          </tr>
        </thead>
        <tbody>
          {releases.map((r: any) => (
            <tr key={r.id} style={{ borderBottom: "1px solid #f0f1f3" }}>
              <td style={{ padding: 8 }}><Link to={`/releases/${r.id}`}>{r.version}</Link></td>
              <td style={{ padding: 8 }}>{r.title}</td>
              <td style={{ padding: 8 }}>{r.status}</td>
              <td style={{ padding: 8 }}>{r.targetDate ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
