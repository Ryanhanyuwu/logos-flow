"use client";

import { useState } from "react";
import { processSpeechLogic, type LogicGraph } from "~/actions/processSpeechLogic";

const EXAMPLE = "I-I-I think that the... the climate is changing because... because of carbon, uh, carbon emissions.";

export default function TestSpeechPage() {
  const [transcript, setTranscript] = useState(EXAMPLE);
  const [graph, setGraph] = useState<LogicGraph>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleProcess() {
    setLoading(true);
    setError(null);
    try {
      const additions = await processSpeechLogic(transcript, graph);
      setGraph((prev) => ({
        nodes: [...prev.nodes, ...additions.nodes],
        edges: [...prev.edges, ...additions.edges],
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-8 space-y-6">
      <h1 className="text-xl font-semibold text-foreground">processSpeechLogic — test harness</h1>

      <textarea
        className="w-full rounded border border-border bg-background text-foreground p-3 text-sm resize-y min-h-[100px]"
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        placeholder="Paste a messy transcript here..."
      />

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleProcess}
          disabled={loading || !transcript.trim()}
          className="rounded bg-foreground text-background px-4 py-2 text-sm disabled:opacity-50"
        >
          {loading ? "Processing…" : "Process (incremental)"}
        </button>
        <button
          type="button"
          onClick={() => { setGraph({ nodes: [], edges: [] }); setError(null); }}
          className="rounded border border-border px-4 py-2 text-sm text-muted-foreground"
        >
          Reset graph
        </button>
      </div>

      {error && (
        <pre className="rounded bg-red-950 text-red-300 p-3 text-xs overflow-auto">{error}</pre>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Accumulated graph ({graph.nodes.length} nodes, {graph.edges.length} edges)
        </h2>
        <pre className="rounded bg-muted text-foreground p-4 text-xs overflow-auto">
          {JSON.stringify(graph, null, 2)}
        </pre>
      </section>
    </main>
  );
}
