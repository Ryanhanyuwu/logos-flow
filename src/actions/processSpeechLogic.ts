"use server";

import { env } from "~/env";

export type NodeType = "Claim" | "Evidence" | "Conclusion";

export interface LogicNode {
  id: string;
  label: string;
  type: NodeType;
}

export interface LogicEdge {
  source: string;
  target: string;
}

export interface LogicGraph {
  nodes: LogicNode[];
  edges: LogicEdge[];
}

const SYSTEM_PROMPT = `You are a Logic Interpreter. Receive a transcript that may contain stutters, repetitions, and filler words.
1. Clean the text.
2. Identify the core logical nodes (Claims, Evidence, or Conclusions).
3. Return a JSON object with nodes (id, label, type) and edges (source, target).

Rules:
- Each node must have: id (unique string integer), label (concise cleaned phrase), type ("Claim" | "Evidence" | "Conclusion")
- Each edge must have: source (node id), target (node id)
- Edges point from supporting node to supported node (Evidence → Claim, Claim → Conclusion)
- Return ONLY valid JSON, no markdown fences, no extra text.

Example output:
{"nodes":[{"id":"1","label":"Climate is changing","type":"Claim"},{"id":"2","label":"Carbon emissions","type":"Evidence"}],"edges":[{"source":"2","target":"1"}]}`;

export async function processSpeechLogic(
  transcript: string,
  existingGraph: LogicGraph = { nodes: [], edges: [] },
): Promise<LogicGraph> {
  const existingNodeIds = new Set(existingGraph.nodes.map((n) => n.id));
  const existingEdgeKeys = new Set(
    existingGraph.edges.map((e) => `${e.source}->${e.target}`),
  );

  // Offset new IDs so they don't collide with existing ones
  const idOffset = existingGraph.nodes.length;

  const userMessage = existingGraph.nodes.length > 0
    ? `Existing nodes (do NOT re-emit these): ${JSON.stringify(existingGraph.nodes)}\n\nNew transcript segment:\n${transcript}`
    : transcript;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    }),
  });

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
    }))
    .filter((edge) => !existingEdgeKeys.has(`${edge.source}->${edge.target}`));

  return { nodes: newNodes, edges: newEdges };
}
