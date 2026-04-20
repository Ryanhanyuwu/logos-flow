import type { LogicGraph } from "~/actions/processSpeechLogic";

/** Strips punctuation, collapses whitespace, and lowercases for fuzzy matching. */
const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export interface ReconcileResult {
  merged: LogicGraph;
  /** IDs of existing nodes whose label was confirmed by an incoming node. */
  newlyValidatedIds: string[];
}

/**
 * Merges `incoming` additions into `existing` graph.
 *
 * - If an incoming node's normalized label matches an existing node, we skip
 *   the addition and instead return the existing ID in `newlyValidatedIds`.
 * - If an incoming node's ID already exists (exact match), we skip it.
 * - All surviving edges are re-mapped through the ID remap table and
 *   deduplicated against existing edges.
 */
export function reconcileGraphState(
  existing: LogicGraph,
  incoming: LogicGraph,
): ReconcileResult {
  const newlyValidatedIds: string[] = [];

  const existingByLabel = new Map(
    existing.nodes.map((n) => [normalize(n.label), n.id]),
  );
  const existingIds = new Set(existing.nodes.map((n) => n.id));
  const existingEdgeKeys = new Set(
    existing.edges.map((e) => `${e.source}->${e.target}`),
  );

  const nodesToAdd = [];
  // Map incoming ID → final ID (either existing match or itself)
  const idRemap = new Map<string, string>();

  for (const node of incoming.nodes) {
    const key = normalize(node.label);
    const matchId = existingByLabel.get(key);

    if (matchId) {
      // Label collision with existing node → validate existing, remap edge IDs
      newlyValidatedIds.push(matchId);
      idRemap.set(node.id, matchId);
    } else if (!existingIds.has(node.id)) {
      nodesToAdd.push(node);
      idRemap.set(node.id, node.id);
    }
    // Exact ID collision that isn't a label match → silently drop
  }

  const edgesToAdd = incoming.edges
    .map((e) => ({
      ...e,
      source: idRemap.get(e.source) ?? e.source,
      target: idRemap.get(e.target) ?? e.target,
    }))
    .filter((e) => !existingEdgeKeys.has(`${e.source}->${e.target}`));

  return {
    merged: {
      nodes: [...existing.nodes, ...nodesToAdd],
      edges: [...existing.edges, ...edgesToAdd],
    },
    newlyValidatedIds,
  };
}
