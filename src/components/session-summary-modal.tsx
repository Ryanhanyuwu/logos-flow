"use client";

import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  Dumbbell,
  Eye,
  EyeOff,
  Mic,
  ShieldAlert,
  Sparkles,
  Timer,
  Wind,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type {
  FillerFrequency,
  HolisticSummary,
  ReflowSuggestion,
  SentenceFlow,
  SilentPowerLabel,
} from "~/actions/generateHolisticSummary";
import { getSessionHistory } from "~/actions/getSessionHistory";
import { saveSessionScore } from "~/actions/saveSessionScore";
import { cn } from "~/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionSummaryModalProps {
  open: boolean;
  onClose: () => void;
  summary: HolisticSummary | null;
  isLoading: boolean;
  error: string | null;
}

interface LocalRecord {
  logicalDensity: number;
  sentenceFlowScore: number;
  date: string;
}

const LOCAL_HISTORY_KEY = "logos-flow-session-history";
const FLOW_SCORE: Record<SentenceFlow, number> = {
  concise: 8,
  balanced: 5,
  marathon: 2,
};

// ─── Density bar ──────────────────────────────────────────────────────────────

function DensityBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color =
    score <= 3 ? "bg-amber-400" : score <= 6 ? "bg-sky-400" : "bg-emerald-400";

  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            color,
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={cn(
          "min-w-[2rem] text-right text-sm font-semibold tabular-nums",
          score <= 3
            ? "text-amber-400"
            : score <= 6
              ? "text-sky-400"
              : "text-emerald-400",
        )}
      >
        {score}/10
      </span>
    </div>
  );
}

// ─── Growth chart (CSS bars) ──────────────────────────────────────────────────

interface GrowthChartProps {
  currentDensity: number;
  currentFlowScore: number;
  histAvgDensity: number | null;
  histAvgFlowScore: number | null;
  sessionCount: number;
}

function GrowthChart({
  currentDensity,
  currentFlowScore,
  histAvgDensity,
  histAvgFlowScore,
  sessionCount,
}: GrowthChartProps) {
  const bars: { label: string; current: number; hist: number | null }[] = [
    { label: "Logical Density", current: currentDensity, hist: histAvgDensity },
    {
      label: "Sentence Flow",
      current: currentFlowScore,
      hist: histAvgFlowScore,
    },
  ];

  return (
    <div>
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Session Growth
      </p>
      <div className="space-y-3">
        {bars.map((bar) => (
          <div key={bar.label}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                {bar.label}
              </span>
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {bar.current}/10
              </span>
            </div>
            <div className="relative h-4 overflow-hidden rounded-sm bg-muted">
              {bar.hist !== null && (
                <div
                  className="absolute inset-y-0 left-0 rounded-sm bg-muted-foreground/30 transition-all duration-700"
                  style={{ width: `${(bar.hist / 10) * 100}%` }}
                />
              )}
              <div
                className="absolute inset-y-0 left-0 rounded-sm bg-brand-blue/70 transition-all duration-700"
                style={{ width: `${(bar.current / 10) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-3 rounded-sm bg-brand-blue/70" />
          <span className="text-[10px] text-muted-foreground">
            This session
          </span>
        </div>
        {histAvgDensity !== null && (
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-3 rounded-sm bg-muted-foreground/30" />
            <span className="text-[10px] text-muted-foreground">
              Avg ({sessionCount} sessions)
            </span>
          </div>
        )}
        {histAvgDensity === null && (
          <span className="text-[10px] text-muted-foreground/60">
            Complete more sessions to see your trend
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Silent power badge ───────────────────────────────────────────────────────

const SILENT_POWER_META: Record<
  SilentPowerLabel,
  { color: string; label: string }
> = {
  strong: {
    label: "Strong Silence",
    color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  },
  developing: {
    label: "Developing",
    color: "text-sky-400 border-sky-500/40 bg-sky-500/10",
  },
  "filler-heavy": {
    label: "Filler-Heavy",
    color: "text-amber-400 border-amber-500/40 bg-amber-500/10",
  },
};

// ─── Sentence flow label ──────────────────────────────────────────────────────

const FLOW_META: Record<
  SentenceFlow,
  { label: string; color: string; hint: string }
> = {
  concise: {
    label: "Concise",
    color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
    hint: "Short, punchy phrases — easy on listener and speaker alike.",
  },
  balanced: {
    label: "Balanced",
    color: "text-sky-400 border-sky-500/40 bg-sky-500/10",
    hint: "Good rhythm with natural variation in sentence length.",
  },
  marathon: {
    label: "Marathon",
    color: "text-amber-400 border-amber-500/40 bg-amber-500/10",
    hint: "Long run-on chains — chunking will conserve energy for both of you.",
  },
};

// ─── Filler frequency badge ───────────────────────────────────────────────────

const FILLER_FREQ_META: Record<
  FillerFrequency,
  { color: string }
> = {
  Occasional: {
    color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  },
  Frequent: {
    color: "text-amber-400 border-amber-500/40 bg-amber-500/10",
  },
  Concentrated: {
    color: "text-red-400 border-red-500/40 bg-red-500/10",
  },
};

// ─── Reflow card (with per-card copy state) ───────────────────────────────────

function ReflowCard({ suggestion }: { suggestion: ReflowSuggestion }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(suggestion.reflowed);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <li className="rounded-lg border border-border bg-muted/20 px-3.5 py-3">
      <p className="mb-2 text-[11px] italic text-muted-foreground">
        &ldquo;{suggestion.excerpt}&rdquo;
      </p>
      <p className="mb-1.5 text-xs leading-relaxed text-foreground">
        {suggestion.reflowed}
      </p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-muted-foreground/70">
          {suggestion.rationale}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex flex-shrink-0 items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {copied ? (
            <Check className="h-2.5 w-2.5 text-emerald-400" />
          ) : (
            <Copy className="h-2.5 w-2.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </li>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
      {[0, 1].map((col) => (
        <div
          key={col}
          className={cn(
            "animate-pulse space-y-5 px-5 py-5",
            col === 0 && "border-b border-border md:border-b-0 md:border-r",
          )}
        >
          <div className="h-4 w-2/3 rounded bg-muted" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-5/6 rounded bg-muted" />
          </div>
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-muted" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Copy util ────────────────────────────────────────────────────────────────

function buildMarkdown(summary: HolisticSummary, privateMode: boolean): string {
  const date = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const lines: string[] = [
    "# Logos Flow — Intellectual Health Checkup",
    `*Generated: ${date}*`,
    "",
    "---",
    "",
    "## Logical Analysis",
    "",
    `**Primary Argument:** ${summary.primaryArgument}`,
    "",
    `**Logical Density:** ${summary.logicalDensity}/10`,
    "",
  ];

  if (summary.keyInsights.length) {
    lines.push("**Key Insights**", "");
    for (const ki of summary.keyInsights) {
      lines.push(`- ${ki.insight}  *(${ki.supportedBy})*`);
    }
    lines.push("");
  }

  // Communication Audit
  const audit = summary.growthAudit;
  const hasAudit =
    audit.logicalFallacies.length > 0 ||
    audit.structuralGaps.length > 0 ||
    audit.fillerPatterns.length > 0;

  if (hasAudit) {
    lines.push("---", "", "## Communication Audit — Optimizing for Clarity", "");

    if (audit.logicalFallacies.length) {
      lines.push("**Logical Fallacies**", "");
      for (const f of audit.logicalFallacies) {
        lines.push(`- **${f.name}**: ${f.definition}`, `  *Context: ${f.context}*`);
      }
      lines.push("");
    }

    if (audit.structuralGaps.length) {
      lines.push("**Structural Gaps**", "");
      for (const g of audit.structuralGaps) {
        lines.push(`- Claim: "${g.claimNode}" — ${g.impact}`);
      }
      lines.push("");
    }

    if (audit.fillerPatterns.length) {
      lines.push("**Filler Patterns**", "");
      for (const fp of audit.fillerPatterns) {
        lines.push(`- [${fp.frequency}] ${fp.context} — ${fp.note}`);
      }
      lines.push("");
    }
  }

  if (summary.unresolvedRisks.length) {
    lines.push("**Unresolved Risks**", "");
    for (const ur of summary.unresolvedRisks) {
      lines.push(`- Counter-point: "${ur.counterpoint}" — ${ur.risk}`);
    }
    lines.push("");
  }

  if (!privateMode) {
    lines.push("---", "", "## Communication Mechanics", "");

    lines.push(
      `**Sentence Flow:** ${summary.sentenceFlow.charAt(0).toUpperCase()}${summary.sentenceFlow.slice(1)}`,
      "",
      `**Silent Power:** ${summary.silentPower.label} (${summary.silentPower.score}/10)`,
      summary.silentPower.note,
      "",
    );

    if (summary.reflowSuggestions.length) {
      lines.push("**Reflow Suggestions**", "");
      for (const rs of summary.reflowSuggestions) {
        lines.push(
          `- Original: "${rs.excerpt}"`,
          `  Reflowed: "${rs.reflowed}"`,
          `  *(${rs.rationale})*`,
        );
      }
      lines.push("");
    }

    if (summary.lexicalBlocks.length) {
      lines.push("**Phonetic Optimization**", "");
      for (const lb of summary.lexicalBlocks) {
        lines.push(`- \`${lb.word}\` (${lb.phonetic}) → try **${lb.synonym}**`);
      }
      lines.push("");
    }

    if (summary.nextStepDrills.length) {
      lines.push("## Growth Goals", "");
      for (const drill of summary.nextStepDrills) {
        lines.push(`### ${drill.name}`, drill.instruction, "");
      }
    }
  }

  return lines.join("\n");
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function SessionSummaryModal({
  open,
  onClose,
  summary,
  isLoading,
  error,
}: SessionSummaryModalProps) {
  const [privateMode, setPrivateMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [histAvgDensity, setHistAvgDensity] = useState<number | null>(null);
  const [histAvgFlowScore, setHistAvgFlowScore] = useState<number | null>(null);
  const [histCount, setHistCount] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    getSessionHistory().then((result) => {
      if (result.isAuthenticated) {
        setHistAvgDensity(result.avgLogicalDensity);
        setHistAvgFlowScore(result.avgSentenceFlowScore);
        setHistCount(result.count);
      } else {
        try {
          const records: LocalRecord[] = JSON.parse(
            localStorage.getItem(LOCAL_HISTORY_KEY) ?? "[]",
          );
          if (records.length > 0) {
            const avg = (nums: number[]) =>
              Math.round(
                (nums.reduce((a, b) => a + b, 0) / nums.length) * 10,
              ) / 10;
            setHistAvgDensity(avg(records.map((r) => r.logicalDensity)));
            setHistAvgFlowScore(avg(records.map((r) => r.sentenceFlowScore)));
            setHistCount(records.length);
          }
        } catch {
          /* ignore corrupt storage */
        }
      }
    });
  }, [open]);

  useEffect(() => {
    if (!summary || isLoading) return;
    const flowScore = FLOW_SCORE[summary.sentenceFlow];

    saveSessionScore(summary.logicalDensity, flowScore);

    try {
      const records: LocalRecord[] = JSON.parse(
        localStorage.getItem(LOCAL_HISTORY_KEY) ?? "[]",
      );
      const updated: LocalRecord[] = [
        ...records,
        {
          logicalDensity: summary.logicalDensity,
          sentenceFlowScore: flowScore,
          date: new Date().toISOString(),
        },
      ].slice(-20);
      localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(updated));
    } catch {
      /* ignore storage errors */
    }
  }, [summary, isLoading]);

  const handleCopy = async () => {
    if (!summary) return;
    await navigator.clipboard.writeText(buildMarkdown(summary, privateMode));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!open) return null;

  const flowMeta = summary ? FLOW_META[summary.sentenceFlow] : null;
  const silentMeta = summary
    ? SILENT_POWER_META[summary.silentPower.label]
    : null;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop click-to-dismiss pattern
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click-to-dismiss pattern
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Session Summary"
        className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        style={{ maxHeight: "min(90vh, 760px)" }}
      >
        {/* ── Header ── */}
        <div className="flex flex-shrink-0 items-center gap-3 border-b border-border px-5 py-3.5">
          <Sparkles className="h-4 w-4 text-brand-warm" />
          <h2 className="flex-1 text-sm font-semibold text-foreground">
            Intellectual Health Checkup
          </h2>

          <button
            type="button"
            onClick={() => setPrivateMode((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
              privateMode
                ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
            title={
              privateMode
                ? "Private mode on — coaching hidden"
                : "Private mode off"
            }
          >
            {privateMode ? (
              <EyeOff className="h-3 w-3" />
            ) : (
              <Eye className="h-3 w-3" />
            )}
            Private
          </button>

          <button
            type="button"
            onClick={handleCopy}
            disabled={!summary}
            className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            title="Copy report as Markdown"
          >
            {copied ? (
              <Check className="h-3 w-3 text-emerald-400" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            {copied ? "Copied" : "Copy report"}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Column headers ── */}
        <div className="grid flex-shrink-0 grid-cols-2 border-b border-border">
          <div className="flex items-center gap-1.5 border-r border-border px-5 py-2">
            <Zap className="h-3.5 w-3.5 text-brand-warm" />
            <span className="text-xs font-semibold text-foreground">
              Logical Analysis
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-5 py-2">
            <Wind className="h-3.5 w-3.5 text-brand-blue" />
            <span className="text-xs font-semibold text-foreground">
              Communication Mechanics
            </span>
            {privateMode && (
              <span className="ml-auto flex items-center gap-1 text-[10px] text-amber-400">
                <EyeOff className="h-3 w-3" />
                Hidden
              </span>
            )}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {isLoading && (
            <div className="h-full overflow-y-auto">
              <LoadingSkeleton />
            </div>
          )}

          {error && !isLoading && (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-5 py-8 text-center">
              <AlertCircle className="h-8 w-8 text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
              <p className="text-xs text-muted-foreground">
                Please try again. Your session data is preserved.
              </p>
            </div>
          )}

          {summary && !isLoading && (
            <div className="grid h-full grid-cols-1 md:grid-cols-2">
              {/* ── LEFT: Logical Analysis ── */}
              <div className="overflow-y-auto border-b border-border px-5 py-5 md:border-b-0 md:border-r">
                <div className="space-y-6">
                  {/* Primary argument */}
                  <div>
                    <SectionLabel>Primary Argument</SectionLabel>
                    <p className="text-sm leading-relaxed text-foreground">
                      {summary.primaryArgument}
                    </p>
                  </div>

                  {/* Logical density */}
                  <div>
                    <SectionLabel>Logical Density</SectionLabel>
                    <DensityBar score={summary.logicalDensity} />
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      {summary.logicalDensity <= 3 &&
                        "Strong start — evidence nodes will deepen your argument next session."}
                      {summary.logicalDensity >= 4 &&
                        summary.logicalDensity <= 6 &&
                        "Good structural foundation. A few more evidence connections will unlock the next level."}
                      {summary.logicalDensity >= 7 &&
                        "Dense, well-connected argument. Your logic map is doing real work."}
                    </p>
                  </div>

                  {/* Key insights */}
                  {summary.keyInsights.length > 0 && (
                    <div>
                      <SectionLabel>Key Insights</SectionLabel>
                      <ul className="space-y-2.5">
                        {summary.keyInsights.map((ki, i) => (
                          // biome-ignore lint/suspicious/noArrayIndexKey: static list
                          <li key={i} className="flex gap-3">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                            <div>
                              <p className="text-sm text-foreground">
                                {ki.insight}
                              </p>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {ki.supportedBy}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summary.keyInsights.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Keep building — more connections will reveal your key
                      wins.
                    </p>
                  )}

                  {/* ── Communication Audit ── */}
                  {(summary.growthAudit.logicalFallacies.length > 0 ||
                    summary.growthAudit.structuralGaps.length > 0 ||
                    summary.growthAudit.fillerPatterns.length > 0) && (
                    <div>
                      <div className="mb-3 flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3 text-amber-400" />
                        <SectionLabel>
                          Communication Audit — Optimizing for Clarity
                        </SectionLabel>
                      </div>

                      <div className="space-y-3">
                        {/* Logical Fallacies */}
                        {summary.growthAudit.logicalFallacies.length > 0 && (
                          <div>
                            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-amber-400/80">
                              Logical Fallacies
                            </p>
                            <ul className="space-y-2">
                              {summary.growthAudit.logicalFallacies.map(
                                (f, i) => (
                                  // biome-ignore lint/suspicious/noArrayIndexKey: static list
                                  <li
                                    key={i}
                                    className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5"
                                  >
                                    <p className="text-xs font-semibold text-amber-300">
                                      {f.name}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                                      {f.definition}
                                    </p>
                                    <p className="mt-1 text-[10px] italic text-muted-foreground/70">
                                      Context: {f.context}
                                    </p>
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>
                        )}

                        {/* Structural Gaps */}
                        {summary.growthAudit.structuralGaps.length > 0 && (
                          <div>
                            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-sky-400/80">
                              Structural Gaps
                            </p>
                            <ul className="space-y-2">
                              {summary.growthAudit.structuralGaps.map(
                                (g, i) => (
                                  // biome-ignore lint/suspicious/noArrayIndexKey: static list
                                  <li
                                    key={i}
                                    className="rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2.5"
                                  >
                                    <p className="truncate text-xs font-semibold text-sky-300">
                                      &ldquo;{g.claimNode}&rdquo;
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                                      {g.impact}
                                    </p>
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>
                        )}

                        {/* Filler Patterns */}
                        {summary.growthAudit.fillerPatterns.length > 0 && (
                          <div>
                            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                              Filler Patterns
                            </p>
                            <ul className="space-y-2">
                              {summary.growthAudit.fillerPatterns.map(
                                (fp, i) => (
                                  // biome-ignore lint/suspicious/noArrayIndexKey: static list
                                  <li
                                    key={i}
                                    className="rounded-lg border border-border bg-muted/20 px-3 py-2.5"
                                  >
                                    <div className="mb-1 flex items-center gap-2">
                                      <span
                                        className={cn(
                                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                                          FILLER_FREQ_META[fp.frequency].color,
                                        )}
                                      >
                                        {fp.frequency}
                                      </span>
                                      <span className="text-[11px] text-muted-foreground">
                                        {fp.context}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground/80">
                                      {fp.note}
                                    </p>
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Unresolved Risks ── */}
                  {summary.unresolvedRisks.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center gap-1.5">
                        <ShieldAlert className="h-3 w-3 text-red-400" />
                        <SectionLabel>Unresolved Risks</SectionLabel>
                      </div>
                      <p className="mb-2 text-[11px] text-muted-foreground">
                        These counter-points were raised but not addressed by a
                        supporting evidence node.
                      </p>
                      <ul className="space-y-2">
                        {summary.unresolvedRisks.map((ur, i) => (
                          // biome-ignore lint/suspicious/noArrayIndexKey: static list
                          <li
                            key={i}
                            className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5"
                          >
                            <p className="truncate text-xs font-semibold text-red-300">
                              &ldquo;{ur.counterpoint}&rdquo;
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {ur.risk}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Growth chart */}
                  <GrowthChart
                    currentDensity={summary.logicalDensity}
                    currentFlowScore={FLOW_SCORE[summary.sentenceFlow]}
                    histAvgDensity={histAvgDensity}
                    histAvgFlowScore={histAvgFlowScore}
                    sessionCount={histCount}
                  />
                </div>
              </div>

              {/* ── RIGHT: Communication Mechanics ── */}
              <div className="overflow-y-auto px-5 py-5">
                {privateMode ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
                    <EyeOff className="h-8 w-8 text-amber-400" />
                    <p className="text-sm font-medium text-foreground">
                      Private mode is on
                    </p>
                    <p className="max-w-xs text-xs text-muted-foreground">
                      Coaching feedback is hidden. Toggle Private off in the
                      header when you're ready to review your communication
                      mechanics.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Sentence flow + Silent power row */}
                    <div className="grid grid-cols-2 gap-3">
                      {flowMeta && (
                        <div>
                          <SectionLabel>Sentence Flow</SectionLabel>
                          <div
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                              flowMeta.color,
                            )}
                          >
                            <Mic className="h-3 w-3" />
                            {flowMeta.label}
                          </div>
                          <p className="mt-1.5 text-[11px] text-muted-foreground">
                            {flowMeta.hint}
                          </p>
                        </div>
                      )}

                      {silentMeta && (
                        <div>
                          <SectionLabel>Silent Power</SectionLabel>
                          <div
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                              silentMeta.color,
                            )}
                          >
                            <Timer className="h-3 w-3" />
                            {silentMeta.label}
                          </div>
                          <p className="mt-1.5 text-[11px] text-muted-foreground">
                            {summary.silentPower.score}/10 —{" "}
                            {summary.silentPower.note}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Reflow Rewrite Engine */}
                    {summary.reflowSuggestions.length > 0 && (
                      <div>
                        <div className="mb-2 flex items-center gap-1.5">
                          <Wind className="h-3 w-3 text-sky-400" />
                          <SectionLabel>Reflow Rewrite Engine</SectionLabel>
                        </div>
                        <p className="mb-2.5 text-[11px] text-muted-foreground">
                          High-friction sentences identified. Each rewrite
                          preserves your logical intent while reducing
                          transmission effort.
                        </p>
                        <ul className="space-y-2.5">
                          {summary.reflowSuggestions.map((rs, i) => (
                            // biome-ignore lint/suspicious/noArrayIndexKey: stable list
                            <ReflowCard key={i} suggestion={rs} />
                          ))}
                        </ul>
                      </div>
                    )}

                    {summary.reflowSuggestions.length === 0 &&
                      summary.marathonSentences.length === 0 && (
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3.5 py-3">
                          <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                          <p className="text-xs text-emerald-300">
                            No high-friction sentences detected — your delivery
                            was well-paced.
                          </p>
                        </div>
                      )}

                    {/* Phonetic Optimization (lexical blocks) */}
                    {summary.lexicalBlocks.length > 0 && (
                      <div>
                        <div className="mb-2 flex items-center gap-1.5">
                          <BookOpen className="h-3 w-3 text-amber-400" />
                          <SectionLabel>Phonetic Optimization</SectionLabel>
                        </div>
                        <p className="mb-2 text-[11px] text-muted-foreground">
                          These words carry the highest articulatory load.
                          Lighter alternatives below.
                        </p>
                        <ul className="space-y-2">
                          {summary.lexicalBlocks.map((lb) => (
                            <li
                              key={lb.word}
                              className="rounded-lg border border-border bg-muted/30 px-3.5 py-3"
                            >
                              <div className="flex items-baseline gap-2">
                                <code className="text-xs font-semibold text-foreground">
                                  {lb.word}
                                </code>
                                <span className="text-[10px] text-muted-foreground">
                                  {lb.phonetic}
                                </span>
                              </div>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                Try:{" "}
                                <span className="font-medium text-brand-warm">
                                  {lb.synonym}
                                </span>
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {summary.lexicalBlocks.length === 0 &&
                      summary.frictionPoints.length === 0 && (
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3.5 py-3">
                          <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                          <p className="text-xs text-emerald-300">
                            No significant phonetic friction detected — your
                            energy was well-distributed.
                          </p>
                        </div>
                      )}

                    {/* Growth Goals (next-step drills) */}
                    {summary.nextStepDrills.length > 0 && (
                      <div>
                        <div className="mb-3 flex items-center gap-1.5">
                          <Dumbbell className="h-3.5 w-3.5 text-brand-warm" />
                          <SectionLabel>Growth Goals</SectionLabel>
                        </div>
                        <ul className="space-y-2.5">
                          {summary.nextStepDrills.map((drill, i) => (
                            <li
                              key={drill.name}
                              className="flex gap-3 rounded-lg border border-border bg-muted/20 px-3.5 py-3"
                            >
                              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-warm/20 text-[10px] font-bold text-brand-warm">
                                {i + 1}
                              </span>
                              <div>
                                <p className="text-xs font-semibold text-foreground">
                                  {drill.name}
                                </p>
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                  {drill.instruction}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
