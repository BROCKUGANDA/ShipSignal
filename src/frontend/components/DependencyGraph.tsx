import React from "react";

interface Node { id: string; label: string; x: number; y: number; }
interface Edge { from: string; to: string; }

export function DependencyGraph({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return (
    <svg width="100%" height="400" style={{ border: "1px solid #dcdfe4", borderRadius: 8 }}>
      {edges.map((e, i) => {
        const a = byId.get(e.from);
        const b = byId.get(e.to);
        if (!a || !b) return null;
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#626f86" strokeWidth={1.5} />;
      })}
      {nodes.map((n) => (
        <g key={n.id}>
          <circle cx={n.x} cy={n.y} r={24} fill="#315cde" />
          <text x={n.x} y={n.y + 4} textAnchor="middle" fill="#fff" fontSize={10}>{n.label}</text>
        </g>
      ))}
    </svg>
  );
}