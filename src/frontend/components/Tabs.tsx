import React from "react";

export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 8, borderBottom: "1px solid #dcdfe4", marginBottom: 16 }}>
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          style={{
            padding: "8px 12px",
            border: "none",
            background: "transparent",
            borderBottom: active === t ? "2px solid #315cde" : "2px solid transparent",
            fontWeight: active === t ? 600 : 400,
            cursor: "pointer",
          }}
        >
          {t}
        </button>
      ))}
    </div>
  );
}