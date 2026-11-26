import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader, LoadingState, ErrorState, EmptyState, StatusPill, FreshnessChip } from "../components/Common";
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

interface BriefCheck {
  key: string;
  label: string;
  status: string;
  detail: string;
  evidenceIds: string[];
}

interface RiskFactor {
  id: string;
  category: string;
  severity: string;
  description: string;
  evidenceIds: string[];
  confidence: string;
  verificationRequired: boolean;
  recommendation: string;
}

interface Brief {
  version: string;
  title: string;
  verdict: string;
  confidence: number;
  summary: string;
  checks: BriefCheck[];
  blockers: RiskFactor[];
  evidenceGaps: string[];
  nextActions: string[];
  coverage: Array<{ source: string; count: number; current: number; stale: number }>;
  policyVersion: string;
  riskScore: number | null;
}

interface ReadinessResponse {
  status: string;
  riskScore: number | null;
  evidenceFreshness: string;
  assessedAt: string;
  factors: RiskFactor[];
  blockers: RiskFactor[];
  recommendations: string[];
  warnings: string[];
  brief?: Brief;
  evidence?: EvidenceItem[];
}

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

const TABS = ["Brief", "Checks", "Evidence", "Risks", "Issues", "Pull requests", "Dependencies", "Audit"];

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function EvidenceChips({ ids, byId }: { ids: string[]; byId: Map<string, EvidenceItem> }) {
  if (ids.length === 0) return <span className="muted">No cited record</span>;
  return (
    <span className="coverage">
      {ids.slice(0, 6).map((id) => {
        const item = byId.get(id);
        if (!item) return <span key={id} className="chip mono">{id.slice(0, 12)}</span>;
        const label = `${item.sourcePlatform}:${item.sourceId}`;
        return item.sourceUrl ? (
          <a key={id} className="chip mono" href={item.sourceUrl} target="_blank" rel="noreferrer" title={item.title}>
            {label}
          </a>
        ) : (
          <span key={id} className="chip mono" title={item.title}>{label}</span>
        );
      })}
      {ids.length > 6 ? <span className="chip mono">+{ids.length - 6}</span> : null}
    </span>
  );
}

export default function ReleaseDetailPage() {
  const { releaseId } = useParams();
  const [active, setActive] = useState("Brief");
  const [copied, setCopied] = useState(false);
  const readiness = useResolver<ReadinessResponse>("getReleaseReadiness");
  const audit = useResolver<{ events: AuditEvent[] }>("listAuditEvents");

  useEffect(() => {
    if (releaseId) {
      void readiness.call({ releaseId, includeEvidence: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [releaseId]);

  useEffect(() => {
    if (active === "Audit") void audit.call({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const data = readiness.data;
  const evidence = data?.evidence ?? [];
  const byId = useMemo(() => new Map(evidence.map((item) => [item.id, item])), [evidence]);
  const brief = data?.brief;
  const verdict = brief?.verdict ?? data?.status ?? "INCOMPLETE";

  const copyBrief = async () => {
    if (!brief || !data) return;
    const text = [
      `ShipSignal release brief`,
      `Verdict: ${brief.verdict} · Confidence: ${brief.confidence}% · Risk: ${brief.riskScore ?? "n/a"}`,
      brief.summary,
      "",
      "Checks:",
      ...brief.checks.map((check) => `${check.status} ${check.label}: ${check.detail}`),
      "",
      "Blockers:",
      ...(brief.blockers.length ? brief.blockers.map((blocker) => `${blocker.severity} ${blocker.description}`) : ["None"]),
      "",
      "Next actions:",
      ...brief.nextActions.map((action) => `- ${action}`),
      "",
      `Policy: ${brief.policyVersion} · Assessed: ${data.assessedAt}`,
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const filteredEvidence = (needle: string) =>
    evidence.filter((item) => item.evidenceType.toLowerCase().includes(needle) || item.title.toLowerCase().includes(needle));

  const renderEvidenceTable = (items: EvidenceItem[]) => {
    if (items.length === 0) {
      return <EmptyState title="No linked evidence" description="Run a synchronization or link the relevant source record." />;
    }
    return (
      <table className="data-table">
        <thead>
          <tr>
            <th>Evidence</th>
            <th>Source</th>
            <th>Freshness</th>
            <th>Updated</th>
            <th>Source link</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <strong>{item.title}</strong>
                <div className="muted mono">{item.evidenceType} · {item.id}</div>
                {item.summary ? <div className="muted" style={{ marginTop: 4 }}>{item.summary}</div> : null}
              </td>
              <td>{item.sourcePlatform}<div className="muted mono">{item.sourceId}</div></td>
              <td><FreshnessChip freshness={item.freshness} /></td>
              <td>{formatTime(item.sourceUpdatedAt ?? item.retrievedAt)}</td>
              <td>
                {item.sourceUrl ? (
                  <a href={item.sourceUrl} target="_blank" rel="noreferrer">Open</a>
                ) : (
                  <span className="muted">Not exposed</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div>
      <PageHeader
        eyebrow={releaseId ? `Release · ${releaseId}` : "Release"}
        title={brief ? `${brief.version} — ${brief.title}` : `Release ${releaseId ?? ""}`}
        subtitle="One defensible answer: what is ready, what is blocking, and which records prove it."
      />

      {readiness.loading ? <LoadingState label="Assembling cited evidence and scoring readiness..." /> : null}
      {readiness.error ? (
        <ErrorState message={readiness.error} onRetry={() => releaseId && void readiness.call({ releaseId, includeEvidence: true })} />
      ) : null}

      {!readiness.loading && !readiness.error && data ? (
        <>
          <section className="card verdict">
            <div className="verdict-main">
              <div className="eyebrow">Release verdict</div>
              <div className="verdict-word">{verdict.replaceAll("_", " ")}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
                <StatusPill status={verdict} />
                <StatusPill status={data.evidenceFreshness} />
                <StatusPill status={data.status} />
              </div>
              <div className="verdict-summary">
                {brief?.summary ?? "The evidence set does not yet support a defensible ship decision."}
              </div>
              <div className="verdict-meta">
                <span>Risk score <strong>{brief?.riskScore ?? "not computed"}</strong></span>
                <span>Policy <span className="mono">{brief?.policyVersion ?? "unknown"}</span></span>
                <span>Assessed {formatTime(data.assessedAt)}</span>
                <span>{evidence.length} cited records</span>
              </div>
              <div className="actions">
                <button className="button primary" onClick={copyBrief} disabled={!brief}>
                  {copied ? "Copied brief" : "Copy decision brief"}
                </button>
                <Link className="button" to="/evidence">Open evidence explorer</Link>
                <Link className="button" to="/integrations">Check integrations</Link>
              </div>
            </div>
            <aside className="verdict-side">
              <h3>Confidence</h3>
              <div className="confidence">{brief?.confidence ?? 0}<small>%</small></div>
              <div className="muted" style={{ fontSize: 12 }}>
                Weighted from evidence volume, freshness and source coverage. It is not model confidence.
              </div>
              <h3>Source coverage</h3>
              <div className="coverage">
                {(brief?.coverage ?? []).map((source) => (
                  <span key={source.source} className="chip mono">
                    {source.source} {source.count}
                  </span>
                ))}
                {brief?.coverage.length === 0 ? <span className="muted">No sources</span> : null}
              </div>
              {data.warnings.length > 0 ? (
                <div className="error" style={{ marginTop: 4 }}>{data.warnings.join(" ")}</div>
              ) : null}
            </aside>
          </section>

          {brief && brief.evidenceGaps.length > 0 ? (
            <div className="section-title">Evidence gaps</div>
          ) : null}
          {brief?.evidenceGaps.length ? (
            <ul className="list">{brief.evidenceGaps.map((gap, index) => <li key={index}>{gap}</li>)}</ul>
          ) : null}

          <div className="tabs" role="tablist">
            {TABS.map((tab) => (
              <button key={tab} role="tab" aria-selected={active === tab} className={active === tab ? "active" : ""} onClick={() => setActive(tab)}>
                {tab}
              </button>
            ))}
          </div>

          {active === "Brief" ? (
            <div className="split">
              <div className="card panel">
                <h3>Next actions</h3>
                {brief?.nextActions.length ? (
                  <ul className="list">{brief.nextActions.map((action, index) => <li key={index}>{action}</li>)}</ul>
                ) : <p className="muted">No action is required by the current policy.</p>}
              </div>
              <div className="card panel">
                <h3>Why this verdict</h3>
                <p className="muted" style={{ marginTop: 0 }}>{brief?.summary}</p>
                <div className="muted" style={{ fontSize: 12 }}>
                  The score is deterministic. Each factor cites its source record; a missing source lowers confidence instead of being invented.
                </div>
              </div>
            </div>
          ) : null}

          {active === "Checks" ? (
            <div className="check-grid">
              {(brief?.checks ?? []).map((check) => (
                <div key={check.key} className="check">
                  <div className="check-head">
                    <span className="check-label">{check.label}</span>
                    <StatusPill status={check.status} />
                  </div>
                  <div className="check-detail">{check.detail}</div>
                  <div style={{ marginTop: 8 }}><EvidenceChips ids={check.evidenceIds} byId={byId} /></div>
                </div>
              ))}
              {!brief ? <EmptyState title="No checks" description="Sync the release to collect evidence." /> : null}
            </div>
          ) : null}

          {active === "Evidence" ? renderEvidenceTable(evidence) : null}

          {active === "Risks" ? (
            <div>
              {data.blockers.length === 0 ? (
                <EmptyState title="No blockers" description="No critical or high-severity factor is currently supported by the evidence." />
              ) : (
                <table className="data-table">
                  <thead><tr><th>Severity</th><th>Factor</th><th>Why it matters</th><th>Cited evidence</th><th>Next action</th></tr></thead>
                  <tbody>
                    {data.blockers.map((factor) => (
                      <tr key={factor.id}>
                        <td><StatusPill status={factor.severity} /></td>
                        <td>{factor.category}<div className="muted mono">{factor.confidence}{factor.verificationRequired ? " · human verify" : ""}</div></td>
                        <td>{factor.description}</td>
                        <td><EvidenceChips ids={factor.evidenceIds} byId={byId} /></td>
                        <td>{factor.recommendation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {data.factors.length > 0 ? (
                <>
                  <div className="section-title">All risk factors</div>
                  <div className="check-grid">
                    {data.factors.map((factor) => (
                      <div key={factor.id} className="card panel">
                        <div className="check-head"><strong>{factor.category}</strong><StatusPill status={factor.severity} /></div>
                        <p className="muted">{factor.description}</p>
                        <EvidenceChips ids={factor.evidenceIds} byId={byId} />
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {active === "Issues" ? renderEvidenceTable(filteredEvidence("issue")) : null}
          {active === "Pull requests" ? renderEvidenceTable(filteredEvidence("pull_request")) : null}

          {active === "Dependencies" ? (
            <div className="card panel">
              <h3>Service topology</h3>
              <p className="muted">Dependencies are derived from Compass components and repository evidence. Unverified relationships are not drawn.</p>
              <Link className="button" to="/dependencies">Open dependency view</Link>
            </div>
          ) : null}

          {active === "Audit" ? (
            <div>
              {audit.loading ? <LoadingState label="Loading durable audit records..." /> : null}
              {audit.error ? <ErrorState message={audit.error} onRetry={() => void audit.call({})} /> : null}
              {audit.data?.events.length ? (
                <table className="data-table">
                  <thead><tr><th>Operation</th><th>Actor</th><th>Target</th><th>Result</th><th>When</th></tr></thead>
                  <tbody>
                    {audit.data.events.map((event) => (
                      <tr key={event.id}>
                        <td>{event.operation}<div className="muted mono">{event.correlationId}</div></td>
                        <td>{event.actorId}<div className="muted mono">{event.actorType}</div></td>
                        <td className="mono">{event.targetEntity}</td>
                        <td><StatusPill status={event.result} /></td>
                        <td>{formatTime(event.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : !audit.loading && !audit.error ? (
                <EmptyState title="No audit records" description="Audit events are written for readiness checks, syncs, and confirmed mutations." />
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      {!readiness.loading && !readiness.error && !data ? (
        <EmptyState title="No assessment" description="Sync the project or link evidence to produce a release brief." />
      ) : null}
    </div>
  );
}
