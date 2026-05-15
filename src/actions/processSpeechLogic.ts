"use server";

import { env } from "~/env";

export type NodeType = "Claim" | "Evidence" | "Conclusion" | "Counter-Point";

export interface LogicNode {
  id: string;
  label: string;
  type: NodeType;
}

export type EdgeValidation = "pending" | "valid" | "invalid";

export interface LogicEdge {
  source: string;
  target: string;
  validation?: EdgeValidation;
}

export interface LogicGraph {
  nodes: LogicNode[];
  edges: LogicEdge[];
}

export type InputType = "speech" | "incremental" | "paste";

const BASE_RULES = `Rules:
- Each node must have: id (unique string integer), label (concise cleaned phrase), type ("Claim" | "Evidence" | "Conclusion" | "Counter-Point")
- Each edge must have: source (node id), target (node id)
- Edges point from supporting node to supported node (Evidence → Claim, Claim → Conclusion)
- Counter-Point nodes represent objections, rebuttals, or opposing arguments; their edges point to the Claim or Conclusion they challenge
- Return ONLY valid JSON, no markdown fences, no extra text.

Example output:
{"nodes":[{"id":"1","label":"Climate is changing","type":"Claim"},{"id":"2","label":"Carbon emissions rose 40%","type":"Evidence"},{"id":"3","label":"Natural cycles explain warming","type":"Counter-Point"}],"edges":[{"source":"2","target":"1"},{"source":"3","target":"1"}]}`;

const SYSTEM_PROMPTS: Record<InputType, string> = {
  speech: `You are a Logic Interpreter. Receive a transcript that may contain stutters, repetitions, and filler words.
1. Clean the text, removing filler words and false starts.
2. Identify the core logical nodes (Claims, Evidence, or Conclusions).
3. Return a JSON object with nodes (id, label, type) and edges (source, target).

${BASE_RULES}`,

  incremental: `You are a Logic Interpreter. Receive a typed text fragment — it may be mid-thought or incomplete.
1. Extract any identifiable logical nodes from the text as-is; do not invent missing parts.
2. If the fragment is too short or ambiguous to form a node, return {"nodes":[],"edges":[]}.
3. Return a JSON object with nodes (id, label, type) and edges (source, target).

${BASE_RULES}`,

  paste: `You are a Logic Interpreter. Receive a segment of a longer argument (debate case, essay, or speech).
1. Parse the argument structure in this segment: identify Claims, Evidence, Conclusions, and Counter-Points.
2. Counter-Points are objections, rebuttals, or opposing arguments — mark them "Counter-Point" and connect them to the node they challenge.
3. Build a logic graph for this segment. Reuse any node IDs listed in "Existing nodes" rather than duplicating them.
4. Return a JSON object with nodes (id, label, type) and edges (source, target).

${BASE_RULES}`,
};

export async function processSpeechLogic(
  transcript: string,
  existingGraph: LogicGraph = { nodes: [], edges: [] },
  inputType: InputType = "speech",
): Promise<LogicGraph> {
  const existingNodeIds = new Set(existingGraph.nodes.map((n) => n.id));
  const existingEdgeKeys = new Set(
    existingGraph.edges.map((e) => `${e.source}->${e.target}`),
  );

  // Offset new IDs so they don't collide with existing ones
  const idOffset = existingGraph.nodes.length;

  const userMessage =
    existingGraph.nodes.length > 0
      ? `Existing nodes (do NOT re-emit these): ${JSON.stringify(existingGraph.nodes)}\n\nNew transcript segment:\n${transcript}`
      : transcript;

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPTS[inputType] },
          { role: "user", content: userMessage },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${error}`);
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[];
  };

  const raw = data.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Partial<LogicGraph>;

  const rawNodes: LogicNode[] = parsed.nodes ?? [];
  const rawEdges: LogicEdge[] = parsed.edges ?? [];

  // Build a remap from LLM-assigned IDs → offset IDs to avoid collisions
  const idRemap = new Map<string, string>();
  for (const node of rawNodes) {
    const remapped = String(Number(node.id) + idOffset);
    idRemap.set(node.id, remapped);
  }

  const newNodes = rawNodes
    .map((node) => ({ ...node, id: idRemap.get(node.id) ?? node.id }))
    .filter((node) => !existingNodeIds.has(node.id));

  const newEdges = rawEdges
    .map((edge) => ({
      source: idRemap.get(edge.source) ?? edge.source,
      target: idRemap.get(edge.target) ?? edge.target,
      validation: edge.validation ?? ("pending" as const),
    }))
    .filter((edge) => !existingEdgeKeys.has(`${edge.source}->${edge.target}`));

  return { nodes: newNodes, edges: newEdges };
}

const EDGE_VALIDATION_PROMPT = `You are a Logic Auditor. You will receive a complete logic graph with nodes and edges.
For each edge, assess whether the logical relationship is sound:
- "valid"   — the source genuinely supports or leads to the target given the argument
- "invalid" — the direction is wrong, the connection is unsupported, or it is logically weak
- "pending" — there is not enough information in the graph yet to judge

Return a JSON object with a single "edges" array. Each item must have: source, target, validation.
Include ALL edges from the input — do not add or remove any.
Return ONLY valid JSON, no markdown fences, no extra text.

Example output:
{"edges":[{"source":"2","target":"1","validation":"valid"},{"source":"3","target":"1","validation":"invalid"}]}`;

export async function validateGraphEdges(
  graph: LogicGraph,
): Promise<LogicEdge[]> {
  if (graph.edges.length === 0) return [];

  const userMessage = `Nodes:\n${JSON.stringify(graph.nodes)}\n\nEdges to validate:\n${JSON.stringify(
    graph.edges.map((e) => ({ source: e.source, target: e.target })),
  )}`;

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: EDGE_VALIDATION_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Edge validation API error ${response.status}: ${error}`);
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[];
  };

  const raw = data.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as { edges?: LogicEdge[] };
  return parsed.edges ?? [];
}
