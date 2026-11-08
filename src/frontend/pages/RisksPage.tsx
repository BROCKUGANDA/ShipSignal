import React, { useEffect } from "react";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "../components/Common";
import { useResolver } from "../hooks/useResolver";
import { Link } from "react-router-dom";

export default function RisksPage() {
  const { data, loading, error, call } = useResolver<any>("listReleases");
  useEffect(() => {
    void call();
  }, [call]);

  if (loading) return <div><PageHeader title="Risks" subtitle="Risk register and mitigation." /><LoadingState /></div>;
  if (error) return <div><PageHeader title="Risks" /><ErrorState message={error} onRetry={() => void call()} /></div>;
  const releases = data?.releases ?? [];
  if (releases.length === 0) {
    return <div><PageHeader title="Risks" subtitle="Risk register and mitigation." /><EmptyState title="No releases to assess" description="Risk register populates after the first synchronization." /></div>;
  }
  return (
    <div>
      <PageHeader title="Risks" subtitle="Risk register and mitigation." />
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #dcdfe4" }}>
            <th style={{ padding: 8 }}>Release</th>
            <th style={{ padding: 8 }}>Status</th>
            <th style={{ padding: 8 }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {releases.map((r: any) => (
            <tr key={r.id} style={{ borderBottom: "1px solid #f0f1f3" }}>
              <td style={{ padding: 8 }}>{r.version} - {r.title}</td>
              <td style={{ padding: 8 }}>{r.status}</td>
              <td style={{ padding: 8 }}><Link to={`/releases/${r.id}`}>View readiness</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ color: "#626f86", marginTop: 12 }}>Open a release to view factors, blockers and recommendations derived from live evidence.</p>
    </div>
  );
}
