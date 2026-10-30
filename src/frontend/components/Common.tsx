import React from "react";

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header style={{ marginBottom: 24 }}>
      <h2 style={{ margin: 0, fontSize: 22 }}>{title}</h2>
      {subtitle ? <p style={{ margin: "4px 0 0", color: "#626f86" }}>{subtitle}</p> : null}
    </header>
  );
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" style={{ padding: 24, color: "#626f86" }}>
      {label}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div style={{ padding: 32, textAlign: "center", border: "1px dashed #dcdfe4", borderRadius: 8 }}>
      <h3 style={{ margin: 0 }}>{title}</h3>
      <p style={{ color: "#626f86" }}>{description}</p>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" style={{ padding: 24, border: "1px solid #ae2e24", borderRadius: 8, color: "#ae2e24" }}>
      <p style={{ margin: 0 }}>{message}</p>
      {onRetry ? (
        <button onClick={onRetry} style={{ marginTop: 12 }}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function MetricCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div style={{ padding: 16, border: "1px solid #dcdfe4", borderRadius: 8, minWidth: 160 }}>
      <div style={{ fontSize: 12, color: "#626f86", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600, marginTop: 4 }}>{value}</div>
      {hint ? <div style={{ fontSize: 12, color: "#626f86", marginTop: 4 }}>{hint}</div> : null}
    </div>
  );
}