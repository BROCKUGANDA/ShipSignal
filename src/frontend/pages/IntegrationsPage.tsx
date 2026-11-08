import React, { useEffect } from "react";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "../components/Common";
import { useResolver } from "../hooks/useResolver";

export default function IntegrationsPage() {
  const { data, loading, error, call } = useResolver<any>("getProjectHealth");
  const { data: syncData, loading: syncLoading, error: syncError, call: syncCall } = useResolver<any>("syncProject");

  useEffect(() => {
    void call();
  }, [call]);

  return (
    <div>
      <PageHeader title="Integrations" subtitle="Connection and authorization status." />
      {loading ? <LoadingState label="Checking integrations..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => void call()} /> : null}
      {!loading && !error && data ? (
        <div style={{ display: "grid", gap: 12 }}>
          {(["jira", "bitbucket", "confluence", "compass"] as const).map((key) => {
            const entry = (data[key] ?? {}) as { healthy?: boolean; message?: string; checkedAt?: string };
            const label = key.charAt(0).toUpperCase() + key.slice(1);
            return (
              <div key={key} style={{ padding: 16, border: "1px solid #dcdfe4", borderRadius: 8 }}>
                <strong>{label}</strong>
                <div style={{ marginTop: 8, fontSize: 13 }}>{entry.healthy ? "Connected" : `Unavailable: ${entry.message ?? "unknown"}`}</div>
                <div style={{ fontSize: 12, color: "#626f86" }}>Checked: {entry.checkedAt}</div>
              </div>
            );
          })}
          <div style={{ padding: 16, border: "1px solid #dcdfe4", borderRadius: 8 }}>
            <strong>Synchronization</strong>
            <div style={{ marginTop: 8 }}>
              <button onClick={() => void syncCall({})} disabled={syncLoading}>
                {syncLoading ? "Syncing..." : "Run sync now"}
              </button>
              {syncError ? <div style={{ color: "#ae2e24", marginTop: 8 }}>{syncError}</div> : null}
              {syncData ? <pre style={{ marginTop: 8, background: "#f0f1f3", padding: 12 }}>{JSON.stringify(syncData, null, 2)}</pre> : null}
            </div>
          </div>
        </div>
      ) : null}
      {!loading && !error && !data ? <EmptyState title="No integrations configured" description="Configure Jira, Bitbucket, Confluence and Compass in manifest permissions." /> : null}
    </div>
  );
}
