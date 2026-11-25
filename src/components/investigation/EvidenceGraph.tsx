import { useMemo } from "react";
import { ReactFlow, Background, Controls, type Edge, type Node, MarkerType } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { ClaimRow, EvidenceRow, SourceRow } from "@/lib/domain";
import { RELATIONSHIP_META, asRelationship } from "./assessment-meta";

/** Claims on the left, sources on the right, edges coloured by how the evidence relates. */
export default function EvidenceGraph({ claims, sources, evidence, onSelectSource, onSelectClaim }: {
  claims: ClaimRow[];
  sources: SourceRow[];
  evidence: EvidenceRow[];
  onSelectSource?: (id: string) => void;
  onSelectClaim?: (id: string) => void;
}) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    claims.forEach((c, i) => {
      nodes.push({
        id: `claim-${c.id}`,
        position: { x: 0, y: i * 110 },
        data: { label: `${i + 1}. ${c.claim_text.length > 90 ? `${c.claim_text.slice(0, 90)}…` : c.claim_text}` },
        style: {
          width: 260, fontSize: 11, lineHeight: 1.35, textAlign: "left",
          background: "var(--elevated)", color: "var(--foreground)",
          border: "1px solid var(--border-strong)", borderRadius: 12, padding: "10px 12px",
        },
      });
    });
    sources.forEach((s, i) => {
      nodes.push({
        id: `source-${s.id}`,
        position: { x: 560, y: i * 110 },
        data: { label: `S${i + 1} · ${s.title.length > 70 ? `${s.title.slice(0, 70)}…` : s.title}` },
        style: {
          width: 260, fontSize: 11, lineHeight: 1.35, textAlign: "left",
          background: "var(--card)", color: "var(--foreground)",
          border: `1px solid ${s.source_type === "official" || s.source_type === "primary" ? "var(--amber)" : "var(--border)"}`,
          borderRadius: 12, padding: "10px 12px",
        },
      });
    });
    for (const e of evidence) {
      const rel = RELATIONSHIP_META[asRelationship(e.relationship_type)];
      edges.push({
        id: e.id,
        source: `claim-${e.claim_id}`,
        target: `source-${e.source_id}`,
        style: { stroke: rel.stroke, strokeWidth: 1.6, opacity: 0.85 },
        markerEnd: { type: MarkerType.ArrowClosed, color: rel.stroke, width: 14, height: 14 },
        animated: e.relationship_type === "contradicts",
      });
    }
    return { nodes, edges };
  }, [claims, sources, evidence]);

  return (
    <div className="h-[540px] overflow-hidden rounded-xl border border-border bg-surface/40">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        minZoom={0.3}
        maxZoom={1.6}
        nodesDraggable
        nodesConnectable={false}
        onNodeClick={(_, node) => {
          if (node.id.startsWith("source-")) onSelectSource?.(node.id.slice(7));
          if (node.id.startsWith("claim-")) onSelectClaim?.(node.id.slice(6));
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={28} size={1} color="var(--border)" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
