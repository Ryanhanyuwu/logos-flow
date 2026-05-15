"use server";

import type { LogicGraph } from "~/actions/processSpeechLogic";
import { env } from "~/env";

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

export interface MarathonSentence {
  excerpt: string;
  chunkAt: string;
}

export interface LexicalBlock {
  word: string;
  phonetic: string;
  synonym: string;
}

export type SilentPowerLabel = "strong" | "developing" | "filler-heavy";

export interface SilentPower {
  score: number;
  label: SilentPowerLabel;
  note: string;
}

export interface NextStepDrill {
  name: string;
  instruction: string;
}

// ─── New: Growth Audit types ──────────────────────────────────────────────────

export interface LogicalFallacy {
  name: string;
  definition: string;
  context: string;
}

export interface StructuralGap {
  claimNode: string;
  impact: string;
}

export type FillerFrequency = "Occasional" | "Frequent" | "Concentrated";

export interface FillerPattern {
  context: string;
  frequency: FillerFrequency;
  note: string;
}

export interface GrowthAudit {
  logicalFallacies: LogicalFallacy[];
  structuralGaps: StructuralGap[];
  fillerPatterns: FillerPattern[];
}

// ─── New: Reflow Rewrite Engine ───────────────────────────────────────────────

export interface ReflowSuggestion {
  excerpt: string;
  reflowed: string;
  rationale: string;
}

// ─── New: Unresolved Risks ────────────────────────────────────────────────────

export interface UnresolvedRisk {
  counterpoint: string;
  risk: string;
}

// ─── Full summary shape ───────────────────────────────────────────────────────

export interface HolisticSummary {
  primaryArgument: string;
  keyInsights: KeyInsight[];
  logicalDensity: number;
  frictionPoints: FrictionPoint[];
  sentenceFlow: SentenceFlow;
  growthPlan: GrowthTip[];
  marathonSentences: MarathonSentence[];
  lexicalBlocks: LexicalBlock[];
  silentPower: SilentPower;
  nextStepDrills: NextStepDrill[];
  growthAudit: GrowthAudit;
  reflowSuggestions: ReflowSuggestion[];
  unresolvedRisks: UnresolvedRisk[];
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a dual-perspective session analyst for a speech-to-logic application.
You act as both a rigorous intellectual critic and a high-end executive speech coach.

You receive two inputs:
1. A logic graph — nodes (Claims, Evidence, Conclusions, Counter-Points) and edges representing logical support
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

═══ PERSPECTIVE B — THE EXECUTIVE SPEECH COACH ═══

Critical framing rule: ALL feedback must be framed as "Reducing Transmission Effort" or
"Optimizing for Clarity." Never use: mistake, error, wrong, bad, fix, correct, improve.

frictionPoints (≤ 3 objects)
  Each: { "cluster": "...", "suggestion": "..." }
  • cluster: the exact word, phrase, or sound pattern where friction appears
  • suggestion: a shorter phonetic alternative OR a structural strategy
  If transcript is empty or text-only, return an empty array.

sentenceFlow
  Analyze sentence length distribution in the transcript.
  "concise"  — median sentence < 15 words, clear natural stops
  "marathon" — median sentence > 30 words OR visible run-on clause chains
  "balanced" — everything else

marathonSentences (≤ 3 objects — only populate if sentenceFlow is "marathon" or any sentences > 25 words)
  Each: { "excerpt": "...", "chunkAt": "..." }
  • excerpt: the first 10–12 words of the long sentence, ending with "..."
  • chunkAt: the specific word or phrase where a breath break would release the most tension
  If no marathon sentences exist, return an empty array.

lexicalBlocks (≤ 3 objects)
  Each: { "word": "...", "phonetic": "...", "synonym": "..." }
  • word: a specific multi-syllabic or consonant-cluster word where the speaker lost momentum
  • phonetic: a brief note on WHY it is physically demanding (e.g. "4 syllables, plosive cluster")
  • synonym: a shorter or phonetically smoother alternative with the same meaning
  Focus on words that appeared in friction moments or restarts.
  If no such words are detectable, return an empty array.

silentPower (object)
  Measure how effectively the speaker used pauses versus filling silence with filler words.
  Count approximate filler density: "um", "uh", "like", "so", "you know", "basically", "literally".
  { "score": integer 1–10, "label": "strong" | "developing" | "filler-heavy", "note": "..." }
  Scoring:
    8–10 / "strong"       — filler words < 5% of total words; clean stops between ideas
    5–7  / "developing"   — filler words 5–15%; some natural pauses present
    1–4  / "filler-heavy" — filler words > 15%; silence is consistently avoided
  note: one sentence — name a specific strength OR the single highest-leverage change

reflowSuggestions (3–5 objects)
  Identify the highest-friction sentences in the transcript — those with long run-on chains, dense phonetic clusters, or visible restart patterns.
  Each: { "excerpt": "...", "reflowed": "...", "rationale": "..." }
  • excerpt: the first 10–12 words of the original sentence, ending with "..."
  • reflowed: a complete rewrite of the FULL sentence that:
      — Replaces multi-syllabic or plosive-heavy words with phonetically softer alternatives
      — Breaks the thought into 2–3 shorter phrases (each ≤ 15 words), separated by em dashes or periods
      — Preserves the exact logical intent — no information loss
  • rationale: one brief phrase naming what changed (e.g., "Split at causal link; replaced 'subsequently' with 'then'")
  If transcript has fewer than 3 detectable high-friction sentences, include medium-friction candidates to reach 3.
  If transcript is empty, return an empty array.

nextStepDrills (exactly 3 objects)
  Each: { "name": "...", "instruction": "..." }
  • name: a memorable drill title in the format "The [Vivid Noun]" (e.g. "The 2-Second Reset")
  • instruction: one specific, actionable sentence the speaker can practice in their NEXT session
  Requirements:
  — Drill 1 must address breath management or pausing
  — Drill 2 must address sentence length or chunking
  — Drill 3 must address the single biggest lexical or friction finding
  Frame every instruction as an experiment to TRY, not a flaw to fix.

growthPlan (2–3 objects)
  Each: { "tip": "...", "exercise": "..." }
  • tip: ≤ 6 words (an empowering label, not an instruction)
  • exercise: one specific, actionable 1-sentence practice for the NEXT session

═══ PERSPECTIVE C — THE GROWTH AUDIT ═══

Frame: Every item here is an "Optimizing for Clarity" opportunity. Never use mistake, error, wrong, bad, fix.

growthAudit (object with three arrays)

  logicalFallacies (≤ 3 objects)
    Each: { "name": "...", "definition": "...", "context": "..." }
    • name: the specific fallacy type (e.g., "Circular Reasoning", "Hasty Generalization", "False Dichotomy", "Appeal to Authority", "Straw Man")
    • definition: one plain-language sentence defining this fallacy type
    • context: where specifically in the speech this pattern emerged — reference the relevant claim or transition point
    Only include fallacies genuinely present in the graph or transcript. Return empty array if none detected.

  structuralGaps (≤ 3 objects)
    Each: { "claimNode": "...", "impact": "..." }
    • claimNode: the exact label text of a Claim node from the graph that has no supporting Evidence node connected to it
    • impact: one sentence on how this gap reduces the argument's persuasive force
    Only list nodes that are truly unsupported. Return empty array if all claims have evidence or no Claim nodes exist.

  fillerPatterns (≤ 3 objects)
    Each: { "context": "...", "frequency": "Occasional" | "Frequent" | "Concentrated", "note": "..." }
    • context: the conversational situation where filler density is highest (e.g., "during technical transitions", "when introducing new premises", "at the opening of rebuttals")
    • frequency: MUST be exactly one of: "Occasional" (low density in context), "Frequent" (moderate density), "Concentrated" (high density or tightly clustered)
    • note: a qualitative description of the pattern — NEVER include specific word counts or numbers
    Return empty array if transcript is empty or no filler patterns are detectable.

unresolvedRisks (≤ 3 objects)
  Only populate if the graph contains Counter-Point nodes.
  Each: { "counterpoint": "...", "risk": "..." }
  • counterpoint: the label text of a Counter-Point node from the graph
  • risk: one sentence explaining what remains unaddressed and why this weakens the overall argument
  A counterpoint is "unresolved" if it has no Evidence or Conclusion node directed toward it as a response.
  Return empty array if no Counter-Point nodes exist OR if all counterpoints are addressed.

═══ JSON OUTPUT SCHEMA ═══
{
  "primaryArgument": "string",
  "keyInsights": [{ "insight": "string", "supportedBy": "string" }],
  "logicalDensity": 7,
  "frictionPoints": [{ "cluster": "string", "suggestion": "string" }],
  "sentenceFlow": "balanced",
  "growthPlan": [{ "tip": "string", "exercise": "string" }],
  "marathonSentences": [{ "excerpt": "string", "chunkAt": "string" }],
  "lexicalBlocks": [{ "word": "string", "phonetic": "string", "synonym": "string" }],
  "silentPower": { "score": 7, "label": "developing", "note": "string" },
  "nextStepDrills": [{ "name": "string", "instruction": "string" }],
  "growthAudit": {
    "logicalFallacies": [{ "name": "string", "definition": "string", "context": "string" }],
    "structuralGaps": [{ "claimNode": "string", "impact": "string" }],
    "fillerPatterns": [{ "context": "string", "frequency": "Occasional", "note": "string" }]
  },
  "reflowSuggestions": [{ "excerpt": "string", "reflowed": "string", "rationale": "string" }],
  "unresolvedRisks": [{ "counterpoint": "string", "risk": "string" }]
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

  const validSilentPowerLabels: SilentPowerLabel[] = [
    "strong",
    "developing",
    "filler-heavy",
  ];
  const silentPowerRaw = parsed.silentPower as Partial<SilentPower> | undefined;

  const validFillerFrequencies: FillerFrequency[] = [
    "Occasional",
    "Frequent",
    "Concentrated",
  ];

  const auditRaw = parsed.growthAudit as Partial<GrowthAudit> | undefined;

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
    marathonSentences: Array.isArray(parsed.marathonSentences)
      ? parsed.marathonSentences.slice(0, 3)
      : [],
    lexicalBlocks: Array.isArray(parsed.lexicalBlocks)
      ? parsed.lexicalBlocks.slice(0, 3)
      : [],
    silentPower: {
      score:
        typeof silentPowerRaw?.score === "number"
          ? Math.round(Math.min(10, Math.max(1, silentPowerRaw.score)))
          : 5,
      label: validSilentPowerLabels.includes(
        silentPowerRaw?.label as SilentPowerLabel,
      )
        ? (silentPowerRaw?.label as SilentPowerLabel)
        : "developing",
      note: silentPowerRaw?.note ?? "",
    },
    nextStepDrills: Array.isArray(parsed.nextStepDrills)
      ? parsed.nextStepDrills.slice(0, 3)
      : [],
    growthAudit: {
      logicalFallacies: Array.isArray(auditRaw?.logicalFallacies)
        ? auditRaw.logicalFallacies.slice(0, 3)
        : [],
      structuralGaps: Array.isArray(auditRaw?.structuralGaps)
        ? auditRaw.structuralGaps.slice(0, 3)
        : [],
      fillerPatterns: Array.isArray(auditRaw?.fillerPatterns)
        ? auditRaw.fillerPatterns
            .filter((fp) =>
              validFillerFrequencies.includes(fp.frequency as FillerFrequency),
            )
            .slice(0, 3)
        : [],
    },
    reflowSuggestions: Array.isArray(parsed.reflowSuggestions)
      ? parsed.reflowSuggestions.slice(0, 5)
      : [],
    unresolvedRisks: Array.isArray(parsed.unresolvedRisks)
      ? parsed.unresolvedRisks.slice(0, 3)
      : [],
  };
}
