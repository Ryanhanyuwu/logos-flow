import type { Node } from "@xyflow/react";

export type LogicNodeType = "Claim" | "Evidence" | "Conclusion" | "Ghost";
export type LogicNodeStatus = "draft" | "validated" | "ghost";

// Data payload stored inside each React Flow node
export interface LogicNodeData extends Record<string, unknown> {
  label: string;
  // "nodeType" avoids collision with React Flow's own reserved "type" field
  nodeType: LogicNodeType;
  status: LogicNodeStatus;
}

// The full React Flow node shape for this app
export type LogicFlowNode = Node<LogicNodeData>;
