import React from "react";

export function PageHeader({ title, subtitle, eyebrow }: { title: string; subtitle?: string; eyebrow?: string }) {
  return (
    <header className="page-header">
      {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
      <h2 className="page-title">{title}</h2>
      {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
    </header>
  );
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="empty">
      {label}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="empty">
      <h3 style={{ margin: 0, color: "var(--ink)" }}>{title}</h3>
      <p style={{ margin: "8px 0 0" }}>{description}</p>
      {action ? <div style={{ marginTop: 14 }}>{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="error">
      <p style={{ margin: 0 }}>{message}</p>
      {onRetry ? (
        <button onClick={onRetry} className="button" style={{ marginTop: 10 }}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function MetricCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="card metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {hint ? <div className="metric-hint">{hint}</div> : null}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  return <span className={`status status-${status.replaceAll(" ", "_")}`}>{status.replaceAll("_", " ")}</span>;
}

export function FreshnessChip({ freshness }: { freshness: string }) {
  return <span className={`status status-${freshness}`}>{freshness}</span>;
}
