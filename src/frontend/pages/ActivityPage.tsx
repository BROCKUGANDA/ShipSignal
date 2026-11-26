import { useEffect } from "react";
import { PageHeader, LoadingState, EmptyState, ErrorState, StatusPill } from "../components/Common";
import { useResolver } from "../hooks/useResolver";

interface AuditEvent {
  id: string;
  actorId: string;
  actorType: string;
  operation: string;
  targetEntity: string;
  result: string;
  timestamp: string;
  correlationId: string;
}

export default function ActivityPage() {
  const { data, loading, error, call } = useResolver<{ events: AuditEvent[] }>("listAuditEvents");
  useEffect(() => {
    void call();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = data?.events ?? [];
  return (
    <div>
      <PageHeader
        eyebrow="Decision ledger"
        title="Audit"
        subtitle="Durable records for readiness checks, synchronizations, and confirmed mutations."
      />
      {loading ? <LoadingState label="Loading audit records..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => void call()} /> : null}
      {!loading && !error && rows.length === 0 ? (
        <EmptyState title="No audit records" description="Audit rows are written when a release is assessed or a confirmed mutation executes." />
      ) : null}
      {rows.length > 0 ? (
        <div className="card" style={{ overflow: "hidden" }}>
          <table className="data-table">
            <thead><tr><th>Operation</th><th>Actor</th><th>Target</th><th>Result</th><th>When</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.operation}<div className="muted mono">{row.correlationId}</div></td>
                  <td>{row.actorId}<div className="muted mono">{row.actorType}</div></td>
                  <td className="mono">{row.targetEntity}</td>
                  <td><StatusPill status={row.result} /></td>
                  <td>{new Date(row.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
