import React, { useEffect } from "react";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "../components/Common";
import { useResolver } from "../hooks/useResolver";

export default function SettingsPage() {
  const { data: health, loading: healthLoading, error: healthError, call: callHealth } = useResolver<any>("getProjectHealth");
  const { data: syncData, loading: syncLoading, error: syncError, call: callSync } = useResolver<any>("syncProject");

  useEffect(() => {
    void callHealth();
  }, [callHealth]);

  return (
    <div>
      <PageHeader title="Administration" subtitle="Workspace settings and policies." />
      {healthLoading ? <LoadingState label="Loading workspace health..." /> : null}
      {healthError ? <ErrorState message={healthError} onRetry={() => void callHealth()} /> : null}
      {health && (
        <div style={{ padding: 16, border: "1px solid #dcdfe4", borderRadius: 8, marginBottom: 16 }}>
          <h3>Health</h3>
          <p>Overall: {health.overall ? "Healthy" : "Degraded"} · Checked: {health.checkedAt}</p>
          <p style={{ color: "#626f86" }}>Jira: {health.jira?.healthy ? "OK" : health.jira?.message} · Bitbucket: {health.bitbucket?.healthy ? "OK" : health.bitbucket?.message} · Confluence: {health.confluence?.healthy ? "OK" : health.confluence?.message} · Compass: {health.compass?.healthy ? "OK" : health.compass?.message}</p>
        </div>
      )}
      <div style={{ padding: 16, border: "1px solid #dcdfe4", borderRadius: 8 }}>
        <h3>Sync</h3>
        <p style={{ color: "#626f86" }}>Run a reconciliation sync to refresh evidence.</p>
        <button onClick={() => void callSync({})} disabled={syncLoading}>{syncLoading ? "Syncing..." : "Run sync"}</button>
        {syncError ? <div style={{ color: "#ae2e24", marginTop: 8 }}>{syncError}</div> : null}
        {syncData ? <pre style={{ marginTop: 8, background: "#f0f1f3", padding: 12 }}>{JSON.stringify(syncData, null, 2)}</pre> : null}
      </div>
      {!healthLoading && !healthError && !health ? <EmptyState title="No settings" description="Settings will be available after installation." /> : null}
    </div>
  );
}
