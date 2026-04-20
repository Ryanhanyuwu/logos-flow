"use server";

import { env } from "~/env";
import type { LogicGraph } from "~/actions/processSpeechLogic";

// ─── Output types ─────────────────────────────────────────────────────────────

export interface KeyInsight {
  insight: string;
  supportedBy: string;
}

export interface FrictionPoint {
  cluster: string;
  suggestion: string;
}

export interface GrowthTip {
  tip: string;
  exercise: string;
}

export type SentenceFlow = "concise" | "balanced" | "marathon";

export interface HolisticSummary {
  primaryArgument: string;
  keyInsights: KeyInsight[]; // ≤3
  logicalDensity: number; // 1–10
  frictionPoints: FrictionPoint[]; // ≤3
  sentenceFlow: SentenceFlow;
  growthPlan: GrowthTip[]; // 2–3
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a dual-perspective session analyst for a speech-to-logic application.

You receive two inputs:
1. A logic graph — nodes (Claims, Evidence, Conclusions) and edges representing logical support
2. A raw speech transcript from browser recognition, preserving natural speech patterns

Analyze both and return a single JSON object with no markdown fences.

═══ PERSPECTIVE A — THE INTELLECTUAL ═══

primaryArgument
  One crisp sentence capturing the core thesis the speaker was building toward.
  Base it on the highest-level Conclusion node, or on the densest cluster of Claims if no Conclusion exists.

keyInsights (≤ 3 objects)
  Each: { "insight": "...", "supportedBy": "..." }
  • insight: a specific logical win achieved — what the speaker successfully established
  • supportedBy: which node types or connection patterns made it structurally sound
  Only include insights genuinely grounded in the graph topology.

logicalDensity (integer 1–10)
  1  = nodes exist but no edges connect them
  4  = some claims have evidence, but conclusions are unsupported
  7  = most claims have ≥1 evidence node; conclusions are transitively reachable
  10 = every claim has ≥2 distinct evidence nodes; all conclusions fully supported

═══ PERSPECTIVE B — THE COACH ═══

Critical framing rule: ALL feedback must be framed as "Reducing Physical Effort" or
"Conserving Energy." Never use: mistake, error, wrong, bad, fix, correct, improve.

frictionPoints (≤ 3 objects)
  Each: { "cluster": "...", "suggestion": "..." }
  • cluster: the exact word, phrase, or sound pattern where friction appears
    Look for: filler words ("um", "uh", "like", "so"), multi-syllabic words near restarts,
    repeated false starts, word clusters that appear in multiple restarted attempts.
  • suggestion: a shorter phonetic alternative OR a structural strategy
    Example: "'Particularly' → try 'mainly' — one syllable less, same precision"
    Example: "The 'and-so-then' chain → one breath, one point per clause"
  If transcript is empty or text-only, return an empty array.

sentenceFlow
  Analyze the sentence length distribution in the transcript.
  "concise"  — median sentence < 15 words, clear natural stops
  "marathon" — median sentence > 30 words OR visible run-on clause chains
  "balanced" — everything else

growthPlan (2–3 objects)
  Each: { "tip": "...", "exercise": "..." }
  • tip: ≤ 6 words (an empowering label, not an instruction)
  • exercise: one specific, actionable 1-sentence practice for the NEXT session
  Requirements:
  — Always include at least one tip about pausing, chunking, or breath phrasing
  — If sentenceFlow is "marathon", include a chunking tip
  — If frictionPoints identify multi-syllabic words, add a synonym-swap tip
  — Frame each exercise as something to TRY, not something to FIX

═══ JSON OUTPUT SCHEMA ═══
{
  "primaryArgument": "string",
  "keyInsights": [{ "insight": "string", "supportedBy": "string" }],
  "logicalDensity": 7,
  "frictionPoints": [{ "cluster": "string", "suggestion": "string" }],
  "sentenceFlow": "balanced",
  "growthPlan": [{ "tip": "string", "exercise": "string" }]
}

Return ONLY valid JSON. No markdown, no explanation.`;

// ─── Action ───────────────────────────────────────────────────────────────────

export async function generateHolisticSummary(
  graph: LogicGraph,
  rawTranscript: string,
): Promise<HolisticSummary> {
  const transcriptSection = rawTranscript.trim()
    ? rawTranscript.trim()
    : "(no speech transcript — session conducted via text input)";

  const userMessage = [
    "LOGIC GRAPH:",
    JSON.stringify(graph, null, 2),
    "",
    "RAW SPEECH TRANSCRIPT:",
    transcriptSection,
  ].join("\n");

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
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Summary API error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[];
  };

  const raw = data.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Partial<HolisticSummary>;

  return {
    primaryArgument:
      parsed.primaryArgument ?? "No primary argument identified.",
    keyInsights: Array.isArray(parsed.keyInsights)
      ? parsed.keyInsights.slice(0, 3)
      : [],
    logicalDensity:
      typeof parsed.logicalDensity === "number"
        ? Math.round(Math.min(10, Math.max(1, parsed.logicalDensity)))
        : 1,
    frictionPoints: Array.isArray(parsed.frictionPoints)
      ? parsed.frictionPoints.slice(0, 3)
      : [],
    sentenceFlow: (["concise", "balanced", "marathon"] as const).includes(
      parsed.sentenceFlow as SentenceFlow,
    )
      ? (parsed.sentenceFlow as SentenceFlow)
      : "balanced",
    growthPlan: Array.isArray(parsed.growthPlan)
      ? parsed.growthPlan.slice(0, 3)
      : [],
  };
}
