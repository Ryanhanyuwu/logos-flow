"use client";

import dagre from "@dagrejs/dagre";
import { motion } from "framer-motion";
import { createContext, useContext, useEffect, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  useReactFlow,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "~/lib/utils";
import type { EdgeValidation, LogicGraph } from "~/actions/processSpeechLogic";
import { LogicEdge } from "~/components/logic-edge";
import type {
  LogicFlowNode,
  LogicNodeData,
  LogicNodeType,
} from "~/types/logic";

// ─── Type styling ─────────────────────────────────────────────────────────────

const TYPE_STYLES: Record<LogicNodeType, string> = {
  Evidence: "border-sky-500/40 text-sky-400",
  Claim: "border-border text-foreground",
  Conclusion: "border-emerald-500/40 text-emerald-400",
  Ghost: "border-muted-foreground/30 text-muted-foreground/70",
};

const TYPE_GLOW: Record<LogicNodeType, string> = {
  Evidence: "shadow-lg shadow-sky-500/25",
  Claim: "shadow-lg shadow-slate-400/20",
  Conclusion: "shadow-lg shadow-emerald-500/25",
  Ghost: "",
};

const TYPE_LABEL: Record<LogicNodeType, string> = {
  Evidence: "Evidence",
  Claim: "Claim",
  Conclusion: "Conclusion",
  Ghost: "Listening…",
};

/** MiniMap fill color per node type. */
const MINIMAP_COLORS: Record<LogicNodeType, string> = {
  Evidence: "#0ea5e9",
  Claim: "#64748b",
  Conclusion: "#10b981",
  Ghost: "#334155",
};

// ─── Calm mode context (passed to node renderers via React context) ───────────

const CalmModeCtx = createContext(false);

// ─── Auto-fit controller ──────────────────────────────────────────────────────
// Rendered as a child of <ReactFlow> so it can call useReactFlow().

function AutoFitController({ fitKey }: { fitKey: number | string }) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    // Small delay lets dagre positions settle before we measure bounding boxes.
    const t = setTimeout(() => fitView({ padding: 0.25, duration: 500 }), 60);
    return () => clearTimeout(t);
  }, [fitKey, fitView]);

  return null;
}

// ─── Custom node ──────────────────────────────────────────────────────────────

function LogicNodeComponent({ data }: NodeProps<LogicFlowNode>) {
  const calmMode = useContext(CalmModeCtx);
  const { label, nodeType, status } = data as LogicNodeData;
  const isValidated = status === "validated";
  const isGhost = status === "ghost";

  return (
    <motion.div
      initial={{ opacity: 0, y: calmMode ? 0 : 10 }}
      animate={
        isGhost
          ? calmMode
            ? { opacity: 0.35, y: 0 }
            : { opacity: [0.25, 0.45, 0.25], y: 0 }
          : { opacity: isValidated ? 1 : 0.55, y: 0 }
      }
      transition={
        isGhost
          ? calmMode
            ? { duration: 0 }
            : { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
          : { duration: calmMode ? 0.8 : 0.35, ease: "easeOut" }
      }
      className={cn(
        "relative rounded-md border bg-card px-4 py-3 transition-shadow",
        // Fluid width: narrower on phones, wider on tablets
        "w-[160px] sm:w-[220px]",
        TYPE_STYLES[nodeType],
        isGhost || !isValidated
          ? "border-dashed"
          : calmMode
            ? "shadow-sm"
            : TYPE_GLOW[nodeType],
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!border-border !bg-muted"
      />

      <span className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {TYPE_LABEL[nodeType]}
      </span>
      <p className="line-clamp-3 text-sm leading-snug">{label}</p>

      {!isValidated && !isGhost && (
        <span className="mt-2 block text-[10px] italic text-muted-foreground">
          processing…
        </span>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!border-border !bg-muted"
      />
    </motion.div>
  );
}

const NODE_TYPES = { logicNode: LogicNodeComponent };
const EDGE_TYPES = { logicEdge: LogicEdge };

// ─── Edge colors ──────────────────────────────────────────────────────────────

const EDGE_COLORS: Record<EdgeValidation, string> = {
  valid: "#22c55e",
  invalid: "#ef4444",
  pending: "#94a3b8",
};

// ─── Dagre layout ─────────────────────────────────────────────────────────────

const NODE_WIDTH = 220;
const NODE_HEIGHT = 80;

function applyDagreLayout(
  nodes: LogicFlowNode[],
  edges: Edge[],
): LogicFlowNode[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 80 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes)
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  for (const edge of edges) g.setEdge(edge.source, edge.target);

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
    };
  });
}

// ─── Graph builders ───────────────────────────────────────────────────────────

function buildFlowNodes(
  graph: LogicGraph,
  validatedIds: Set<string>,
): LogicFlowNode[] {
  return graph.nodes.map((n) => ({
    id: n.id,
    type: "logicNode",
    position: { x: 0, y: 0 },
    data: {
      label: n.label,
      nodeType: (n.type ?? "Claim") as LogicNodeType,
      status: validatedIds.has(n.id)
        ? ("validated" as const)
        : ("draft" as const),
    },
    draggable: false,
    deletable: false,
    selectable: false,
  }));
}

function buildFlowEdges(graph: LogicGraph): Edge[] {
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n.label]));
  return graph.edges.map((e) => {
    const validation: EdgeValidation = e.validation ?? "pending";
    const color = EDGE_COLORS[validation];
    return {
      id: `${e.source}->${e.target}`,
      source: e.source,
      target: e.target,
      type: "logicEdge",
      // Both valid and pending edges flow; invalid stays static to signal a problem.
      animated: validation !== "invalid",
      deletable: false,
      data: {
        validation,
        sourceLabel: nodeMap.get(e.source) ?? e.source,
        targetLabel: nodeMap.get(e.target) ?? e.target,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color },
    };
  });
}

function buildGhostNode(
  text: string,
  layoutNodes: LogicFlowNode[],
): LogicFlowNode {
  const centerX = layoutNodes.length
    ? layoutNodes.reduce((sum, n) => sum + n.position.x + NODE_WIDTH / 2, 0) /
      layoutNodes.length
    : 0;
  const maxY = layoutNodes.length
    ? Math.max(...layoutNodes.map((n) => n.position.y + NODE_HEIGHT))
    : 0;

  return {
    id: "__ghost__",
    type: "logicNode",
    position: { x: centerX - NODE_WIDTH / 2, y: maxY + 100 },
    data: {
      label: text,
      nodeType: "Ghost" as LogicNodeType,
      status: "ghost" as const,
    },
    draggable: false,
    deletable: false,
    selectable: false,
  };
}

// ─── LogicMap ─────────────────────────────────────────────────────────────────

interface LogicMapProps {
  graph: LogicGraph;
  validatedIds: Set<string>;
  ghostText?: string;
  /** When provided, fitView fires on every change (used by the audience view). */
  fitKey?: number | string;
  calmMode?: boolean;
}

export function LogicMap({
  graph,
  validatedIds,
  ghostText,
  fitKey,
  calmMode = false,
}: LogicMapProps) {
  const rawNodes = useMemo(
    () => buildFlowNodes(graph, validatedIds),
    [graph, validatedIds],
  );
  const rawEdges = useMemo(() => buildFlowEdges(graph), [graph]);
  // In calm mode all edges are static — no animated marching-ant flow.
  const edges = useMemo(
    () => (calmMode ? rawEdges.map((e) => ({ ...e, animated: false })) : rawEdges),
    [rawEdges, calmMode],
  );
  const nodes = useMemo(
    () => applyDagreLayout(rawNodes, edges),
    [rawNodes, edges],
  );

  const allNodes = useMemo(() => {
    const trimmed = ghostText?.trim();
    if (!trimmed) return nodes;
    return [...nodes, buildGhostNode(trimmed, nodes)];
  }, [nodes, ghostText]);

  return (
    <CalmModeCtx.Provider value={calmMode}>
      <div className="h-full w-full">
        <ReactFlow
          nodes={allNodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          deleteKeyCode={null}
          minZoom={0.2}
          proOptions={{ hideAttribution: false }}
        >
          {/* Re-fits the viewport whenever the fit key changes. */}
          <AutoFitController fitKey={fitKey ?? nodes.length} />

          {/* Remove dot grid in calm mode to reduce visual noise. */}
          {!calmMode && (
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1}
              color="oklch(0.269 0 0)"
            />
          )}

          {/* Bottom-left zoom controls; hidden interactive toggle since the map is read-only. */}
          <Controls
            showInteractive={false}
            className="[&>button]:!border-border [&>button]:!bg-card [&>button]:!text-muted-foreground [&>button:hover]:!text-foreground"
          />

          {/*
            MiniMap: bottom-right. Hidden in calm mode — replaced by the
            breathing pacer overlay rendered in the parent page.
          */}
          {!calmMode && (
            <MiniMap
              nodeColor={(node) =>
                MINIMAP_COLORS[(node.data as LogicNodeData).nodeType ?? "Claim"]
              }
              nodeStrokeWidth={0}
              maskColor="oklch(0.145 0 0 / 0.75)"
              className={cn(
                "!rounded-lg !border !border-border !bg-card",
                // On phones: smaller and pushed up above the floating bar.
                "!bottom-24 !right-2 !h-24 !w-32",
                // On tablets and up: standard size and position.
                "sm:!bottom-4 sm:!right-4 sm:!h-32 sm:!w-44",
              )}
            />
          )}
        </ReactFlow>
      </div>
    </CalmModeCtx.Provider>
  );
}
