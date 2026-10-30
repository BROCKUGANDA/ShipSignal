import React from "react";
import { PageHeader } from "../components/Common";

const rows = [
  { id: "r1", severity: "CRITICAL", title: "Unreviewed changes in release 2.4.0", status: "OPEN" },
  { id: "r2", severity: "HIGH", title: "Missing runbook documentation", status: "OPEN" },
];

export default function RisksPage() {
  return (
    <div>
      <PageHeader title="Risks" subtitle="Risk register and mitigation." />
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #dcdfe4" }}>
            <th style={{ padding: 8 }}>ID</th>
            <th style={{ padding: 8 }}>Severity</th>
            <th style={{ padding: 8 }}>Title</th>
            <th style={{ padding: 8 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ borderBottom: "1px solid #f0f1f3" }}>
              <td style={{ padding: 8, fontFamily: "monospace" }}>{r.id}</td>
              <td style={{ padding: 8 }}>{r.severity}</td>
              <td style={{ padding: 8 }}>{r.title}</td>
              <td style={{ padding: 8 }}>{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}