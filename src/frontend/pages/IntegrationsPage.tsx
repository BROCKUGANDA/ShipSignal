import { useEffect } from "react";
import { PageHeader, LoadingState, ErrorState, EmptyState, StatusPill } from "../components/Common";
import { useResolver } from "../hooks/useResolver";

interface HealthEntry {
  healthy?: boolean;
  message?: string;
  checkedAt?: string;
}

interface GraphWorkItem {
  id: string;
  key?: string;
  summary?: string;
  resolvedAt?: string;
  dueAt?: string;
  webUrl?: string;
  issueType?: string;
}

interface GraphPullRequest {
  id: string;
  title?: string;
  displayId?: string;
  status?: string;
  url?: string;
}

interface GraphHealth extends HealthEntry {
  workItemCount?: number;
  pullRequestCount?: number;
  assignedWork?: GraphWorkItem[];
  pullRequests?: GraphPullRequest[];
}

interface HealthData extends Record<string, HealthEntry> {
  teamworkGraph?: GraphHealth;
}

interface SyncResult {
  sources?: string[];
  evidenceCount?: number;
  releasesUpserted?: number;
  warnings?: string[];
  syncedAt?: string;
}

export default function IntegrationsPage() {
  const { data, loading, error, call } = useResolver<HealthData>("getProjectHealth");
  const { data: syncData, loading: syncLoading, error: syncError, call: syncCall } = useResolver<SyncResult>("syncProject");

  useEffect(() => {
    void call();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entries = [
    ["jira", "Jira"],
    ["bitbucket", "Bitbucket"],
    ["confluence", "Confluence"],
    ["compass", "Compass"],
    ["teamworkGraph", "Teamwork Graph"],
  ] as const;

  return (
    <div>
      <PageHeader
        eyebrow="Context sources"
        title="Integrations"
        subtitle="Each source is checked independently. A failed source becomes an explicit evidence gap, not fabricated data."
      />
      {loading ? <LoadingState label="Checking integrations..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => void call()} /> : null}
      {!loading && !error && data ? (
        <div className="check-grid">
          {entries.map(([key, label]) => {
            const entry = data[key] ?? {};
            return (
              <div key={key} className="card panel">
                <div className="check-head">
                  <strong>{label}</strong>
                  <StatusPill status={entry.healthy ? "PASS" : "WARN"} />
                </div>
                <div className="check-detail">{entry.healthy ? "Connected and responding." : entry.message ?? "Not available."}</div>
                <div className="muted mono" style={{ marginTop: 8 }}>{entry.checkedAt ? new Date(entry.checkedAt).toLocaleString() : "Not checked"}</div>
              </div>
            );
          })}
        </div>
      ) : null}
      {!loading && !error && !data ? <EmptyState title="No integration status" description="Open this page from the installed Forge app." /> : null}

      {!loading && !error && data?.teamworkGraph?.healthy ? (
        <>
          <div className="section-title">Teamwork Graph context</div>
          <div className="split">
            <div className="card panel">
              <h3>Assigned work · {data.teamworkGraph.workItemCount ?? 0}</h3>
              {data.teamworkGraph.assignedWork?.length ? (
                <ul className="list">
                  {data.teamworkGraph.assignedWork.map((item) => (
                    <li key={item.id}>
                      {item.webUrl ? <a href={item.webUrl} target="_blank" rel="noreferrer">{item.key ?? item.summary ?? item.id}</a> : (item.key ?? item.summary ?? item.id)}
                      <span className="muted"> · {item.resolvedAt ? "resolved" : "open"}{item.dueAt ? ` · due ${new Date(item.dueAt).toLocaleDateString()}` : ""}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="muted" style={{ margin: 0 }}>No assigned work items returned for this user.</p>}
            </div>
            <div className="card panel">
              <h3>Pull requests · {data.teamworkGraph.pullRequestCount ?? 0}</h3>
              {data.teamworkGraph.pullRequests?.length ? (
                <ul className="list">
                  {data.teamworkGraph.pullRequests.map((pr) => (
                    <li key={pr.id}>
                      {pr.url ? <a href={pr.url} target="_blank" rel="noreferrer">{pr.title ?? pr.displayId ?? pr.id}</a> : (pr.title ?? pr.displayId ?? pr.id)}
                      <span className="muted"> · {pr.status?.toLowerCase() ?? "unknown"}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="muted" style={{ margin: 0 }}>No pull requests returned for this user.</p>}
            </div>
          </div>
        </>
      ) : null}

      <div className="section-title">Synchronization</div>
      <div className="card panel">
        <div className="check-head">
          <div>
            <strong>Reconcile release evidence</strong>
            <div className="muted" style={{ fontSize: 12 }}>Hourly scheduled trigger plus manual run. Re-runs de-duplicate evidence by content hash.</div>
          </div>
          <button className="button primary" onClick={() => void syncCall({})} disabled={syncLoading}>
            {syncLoading ? "Syncing..." : "Run sync now"}
          </button>
        </div>
        {syncError ? <div className="error" style={{ marginTop: 12 }}>{syncError}</div> : null}
        {syncData ? (
          <div style={{ marginTop: 14 }}>
            <div className="verdict-meta">
              <span>{syncData.releasesUpserted ?? 0} releases</span>
              <span>{syncData.evidenceCount ?? 0} evidence records</span>
              <span>{syncData.sources?.join(", ") || "no sources"}</span>
              <span>{syncData.syncedAt ? new Date(syncData.syncedAt).toLocaleString() : ""}</span>
            </div>
            {syncData.warnings?.length ? (
              <ul className="list" style={{ marginTop: 10 }}>{syncData.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
            ) : <p className="muted" style={{ marginBottom: 0 }}>Sync completed without warnings.</p>}
          </div>
        ) : null}
      </div>
    </div>
  );
}
