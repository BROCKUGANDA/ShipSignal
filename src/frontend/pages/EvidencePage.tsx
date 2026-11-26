import { useEffect, useMemo, useState } from "react";
import { PageHeader, LoadingState, ErrorState, EmptyState, FreshnessChip } from "../components/Common";
import { useResolver } from "../hooks/useResolver";

interface EvidenceItem {
  id: string;
  sourcePlatform: string;
  sourceId: string;
  sourceUrl?: string;
  evidenceType: string;
  title: string;
  summary: string;
  retrievedAt: string;
  sourceUpdatedAt?: string;
  freshness: string;
}

export default function EvidencePage() {
  const { data, loading, error, call } = useResolver<{ evidence: EvidenceItem[] }>("getRiskEvidence");
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("all");
  const [freshness, setFreshness] = useState("all");

  useEffect(() => {
    void call({ limit: 100 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = data?.evidence ?? [];
  const sources = useMemo(() => ["all", ...new Set(rows.map((row) => row.sourcePlatform))], [rows]);
  const filtered = rows.filter((row) => {
    const text = `${row.title} ${row.summary} ${row.sourceId}`.toLowerCase();
    return (source === "all" || row.sourcePlatform === source) &&
      (freshness === "all" || row.freshness === freshness) &&
      (query.trim() === "" || text.includes(query.toLowerCase()));
  });

  if (loading) return <div><PageHeader eyebrow="Evidence" title="Evidence explorer" /><LoadingState /></div>;
  if (error) return <div><PageHeader eyebrow="Evidence" title="Evidence explorer" /><ErrorState message={error} onRetry={() => void call({ limit: 100 })} /></div>;

  return (
    <div>
      <PageHeader
        eyebrow="Evidence explorer"
        title="What the verdict is standing on"
        subtitle="Every record carries its source platform, source identifier, retrieval time, freshness, and source link where Atlassian exposes one."
      />
      <div className="card panel" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            aria-label="Search evidence"
            placeholder="Search title, summary, or source ID"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            style={{ flex: "1 1 260px", padding: "9px 11px", border: "1px solid var(--line-strong)", borderRadius: 7 }}
          />
          <select aria-label="Filter source" value={source} onChange={(event) => setSource(event.target.value)} className="button">
            {sources.map((item) => <option key={item} value={item}>{item === "all" ? "All sources" : item}</option>)}
          </select>
          <select aria-label="Filter freshness" value={freshness} onChange={(event) => setFreshness(event.target.value)} className="button">
            {["all", "CURRENT", "STALE", "PARTIAL", "UNKNOWN"].map((item) => <option key={item} value={item}>{item === "all" ? "All freshness" : item}</option>)}
          </select>
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>{filtered.length} of {rows.length} records</div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No evidence records" description="Evidence appears after a successful synchronization." />
      ) : filtered.length === 0 ? (
        <EmptyState title="No matching evidence" description="Clear the filters to see all cited records." />
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <table className="data-table">
            <thead><tr><th>Record</th><th>Source</th><th>Type</th><th>Freshness</th><th>Updated</th><th>Link</th></tr></thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td><strong>{row.title}</strong><div className="muted mono">{row.id}</div>{row.summary ? <div className="muted" style={{ marginTop: 4 }}>{row.summary}</div> : null}</td>
                  <td>{row.sourcePlatform}<div className="muted mono">{row.sourceId}</div></td>
                  <td className="mono">{row.evidenceType}</td>
                  <td><FreshnessChip freshness={row.freshness} /></td>
                  <td>{new Date(row.sourceUpdatedAt ?? row.retrievedAt).toLocaleString()}</td>
                  <td>{row.sourceUrl ? <a href={row.sourceUrl} target="_blank" rel="noreferrer">Open source</a> : <span className="muted">Not exposed</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
