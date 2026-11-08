import React, { useEffect } from "react";
import { PageHeader, EmptyState } from "../components/Common";
import { useResolver } from "../hooks/useResolver";

export default function ProjectsPage() {
  const { data, loading, call } = useResolver<any>("listReleases");
  useEffect(() => {
    void call();
  }, [call]);

  if (loading) return <div><PageHeader title="Projects" subtitle="Project portfolio and health." /><p>Loading...</p></div>;
  const releases = data?.releases ?? [];
  if (releases.length === 0) {
    return (<div><PageHeader title="Projects" subtitle="Project portfolio and health." /><EmptyState title="No projects" description="Connect a Jira project to begin. Releases from the workspace appear here." /></div>);
  }
  return (
    <div>
      <PageHeader title="Projects" subtitle="Project portfolio and health." />
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr style={{ borderBottom: "1px solid #dcdfe4", textAlign: "left" }}><th style={{ padding: 8 }}>Version</th><th style={{ padding: 8 }}>Status</th><th style={{ padding: 8 }}>Updated</th></tr></thead>
        <tbody>{releases.map((r: any) => <tr key={r.id} style={{ borderBottom: "1px solid #f0f1f3" }}><td style={{ padding: 8 }}>{r.version}</td><td style={{ padding: 8 }}>{r.status}</td><td style={{ padding: 8 }}>{r.updatedAt}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
