import type { LogicGraph } from "~/actions/processSpeechLogic";

export interface SavedSession {
  id: string;
  timestamp: number;
  graph: LogicGraph;
  summary: string;
}

const STORAGE_KEY = "logos-flow:sessions";
const MAX_SESSIONS = 50;

/** Pull up to 3 words from the most prominent node label. */
export function generateSummary(graph: LogicGraph): string {
  if (!graph.nodes.length) return "Empty session";
  const node =
    graph.nodes.find((n) => n.type === "Conclusion") ??
    graph.nodes.find((n) => n.type === "Claim") ??
    graph.nodes[0];
  if (!node) return "Empty session";
  return node.label.trim().split(/\s+/).slice(0, 3).join(" ");
}

export function loadSessions(): SavedSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as SavedSession[]).sort(
      (a, b) => b.timestamp - a.timestamp,
    );
  } catch {
    return [];
  }
}

export function saveSession(graph: LogicGraph): SavedSession | null {
  if (typeof window === "undefined" || !graph.nodes.length) return null;
  const session: SavedSession = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    graph,
    summary: generateSummary(graph),
  };
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([session, ...loadSessions()].slice(0, MAX_SESSIONS)),
    );
  } catch {
    // Storage quota exceeded — silently skip
  }
  return session;
}

export function deleteSession(id: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(loadSessions().filter((s) => s.id !== id)),
    );
  } catch {
    // Ignore
  }
}
