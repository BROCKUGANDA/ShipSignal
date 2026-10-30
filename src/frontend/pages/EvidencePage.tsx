import React from "react";
import { PageHeader } from "../components/Common";

const rows = [
  { id: "e1", source: "Jira", type: "issue", retrieved: "2026-10-30T08:00:00Z", freshness: "CURRENT" },
  { id: "e2", source: "Bitbucket", type: "pull_request", retrieved: "2026-10-30T07:55:00Z", freshness: "CURRENT" },
];

export default function EvidencePage() {
  return (
    <div>
      <PageHeader title="Evidence" subtitle="Provenance of retrieved information." />
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #dcdfe4" }}>
            <th style={{ padding: 8 }}>ID</th>
            <th style={{ padding: 8 }}>Source</th>
            <th style={{ padding: 8 }}>Type</th>
            <th style={{ padding: 8 }}>Retrieved</th>
            <th style={{ padding: 8 }}>Freshness</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ borderBottom: "1px solid #f0f1f3" }}>
              <td style={{ padding: 8, fontFamily: "monospace" }}>{r.id}</td>
              <td style={{ padding: 8 }}>{r.source}</td>
              <td style={{ padding: 8 }}>{r.type}</td>
              <td style={{ padding: 8 }}>{r.retrieved}</td>
              <td style={{ padding: 8 }}>{r.freshness}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}