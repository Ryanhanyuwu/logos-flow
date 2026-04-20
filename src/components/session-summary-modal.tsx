"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  Sparkles,
  Zap,
  TrendingUp,
  Wind,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "~/lib/utils";
import type {
  HolisticSummary,
  SentenceFlow,
} from "~/actions/generateHolisticSummary";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionSummaryModalProps {
  open: boolean;
  onClose: () => void;
  summary: HolisticSummary | null;
  isLoading: boolean;
  error: string | null;
}

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

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-4 w-2/3 rounded bg-muted" />
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-5/6 rounded bg-muted" />
        <div className="h-3 w-4/5 rounded bg-muted" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-muted" />
        ))}
      </div>
      <div className="space-y-2">
        <div className="h-3 w-1/2 rounded bg-muted" />
        <div className="h-3 w-3/4 rounded bg-muted" />
      </div>
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
    "# Logos Flow — Session Summary",
    `*Generated: ${date}*`,
    "",
    "---",
    "",
    "## Logical Impact",
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

  if (!privateMode) {
    lines.push(
      "---",
      "",
      "## Communication Flow",
      "",
      `**Sentence Flow:** ${summary.sentenceFlow.charAt(0).toUpperCase()}${summary.sentenceFlow.slice(1)}`,
      "",
    );

    if (summary.frictionPoints.length) {
      lines.push("**Friction Points to Explore**", "");
      for (const fp of summary.frictionPoints) {
        lines.push(`- \`${fp.cluster}\` → ${fp.suggestion}`);
      }
      lines.push("");
    }

    if (summary.growthPlan.length) {
      lines.push("**Growth Plan**", "");
      for (const gp of summary.growthPlan) {
        lines.push(`### ${gp.tip}`, gp.exercise, "");
      }
    }
  }

  return lines.join("\n");
}

// ─── Modal ────────────────────────────────────────────────────────────────────

type Tab = "logical" | "flow";

export function SessionSummaryModal({
  open,
  onClose,
  summary,
  isLoading,
  error,
}: SessionSummaryModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("logical");
  const [privateMode, setPrivateMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Reset tab when opened
  useEffect(() => {
    if (open) setActiveTab("logical");
  }, [open]);

  const handleCopy = async () => {
    if (!summary) return;
    await navigator.clipboard.writeText(buildMarkdown(summary, privateMode));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!open) return null;

  const flowMeta = summary ? FLOW_META[summary.sentenceFlow] : null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Session Summary"
        className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        style={{ maxHeight: "min(90vh, 700px)" }}
      >
        {/* ── Header ── */}
        <div className="flex flex-shrink-0 items-center gap-3 border-b border-border px-5 py-3.5">
          <Sparkles className="h-4 w-4 text-brand-warm" />
          <h2 className="flex-1 text-sm font-semibold text-foreground">
            Session Complete
          </h2>

          {/* Private mode toggle */}
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

          {/* Copy report */}
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

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex flex-shrink-0 gap-1 border-b border-border px-4 pt-2 pb-0">
          <TabButton
            active={activeTab === "logical"}
            onClick={() => setActiveTab("logical")}
          >
            <Zap className="h-3.5 w-3.5" />
            Logical Impact
          </TabButton>
          <TabButton
            active={activeTab === "flow"}
            onClick={() => setActiveTab("flow")}
          >
            <Wind className="h-3.5 w-3.5" />
            Communication Flow
          </TabButton>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {isLoading && <LoadingSkeleton />}

          {error && !isLoading && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <AlertCircle className="h-8 w-8 text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
              <p className="text-xs text-muted-foreground">
                Please try again. Your session data is preserved.
              </p>
            </div>
          )}

          {summary && !isLoading && (
            <>
              {/* ── TAB: Logical Impact ── */}
              {activeTab === "logical" && (
                <div className="space-y-6">
                  {/* Primary argument */}
                  <div>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Primary Argument
                    </p>
                    <p className="text-sm leading-relaxed text-foreground">
                      {summary.primaryArgument}
                    </p>
                  </div>

                  {/* Logical density */}
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Logical Density
                    </p>
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
                      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Key Insights
                      </p>
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
                </div>
              )}

              {/* ── TAB: Communication Flow ── */}
              {activeTab === "flow" && (
                <div className="space-y-6">
                  {privateMode ? (
                    <div className="flex flex-col items-center gap-3 py-10 text-center">
                      <EyeOff className="h-8 w-8 text-amber-400" />
                      <p className="text-sm font-medium text-foreground">
                        Private mode is on
                      </p>
                      <p className="max-w-xs text-xs text-muted-foreground">
                        Coaching feedback is hidden. Toggle Private off in the
                        header when you're ready to review your communication
                        flow.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Sentence flow */}
                      {flowMeta && (
                        <div>
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            Sentence Flow
                          </p>
                          <div
                            className={cn(
                              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
                              flowMeta.color,
                            )}
                          >
                            {flowMeta.label}
                          </div>
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            {flowMeta.hint}
                          </p>
                        </div>
                      )}

                      {/* Friction points */}
                      {summary.frictionPoints.length > 0 && (
                        <div>
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            Reducing Physical Effort
                          </p>
                          <p className="mb-3 text-[11px] text-muted-foreground">
                            These clusters took the most energy. Lighter options
                            are below.
                          </p>
                          <ul className="space-y-2">
                            {summary.frictionPoints.map((fp, i) => (
                              // biome-ignore lint/suspicious/noArrayIndexKey: static list
                              <li
                                key={i}
                                className="rounded-lg border border-border bg-muted/30 px-3.5 py-3"
                              >
                                <code className="text-xs font-semibold text-foreground">
                                  {fp.cluster}
                                </code>
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  {fp.suggestion}
                                </p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {summary.frictionPoints.length === 0 && (
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3.5 py-3">
                          <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                          <p className="text-xs text-emerald-300">
                            No significant friction clusters detected — your
                            energy was well-distributed.
                          </p>
                        </div>
                      )}

                      {/* Growth plan */}
                      {summary.growthPlan.length > 0 && (
                        <div>
                          <div className="mb-3 flex items-center gap-2">
                            <TrendingUp className="h-3.5 w-3.5 text-brand-warm" />
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                              Your Growth Plan
                            </p>
                          </div>
                          <ul className="space-y-2.5">
                            {summary.growthPlan.map((gp, i) => (
                              // biome-ignore lint/suspicious/noArrayIndexKey: static list
                              <li
                                key={i}
                                className="flex gap-3 rounded-lg border border-border bg-muted/20 px-3.5 py-3"
                              >
                                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-warm/20 text-[10px] font-bold text-brand-warm">
                                  {i + 1}
                                </span>
                                <div>
                                  <p className="text-xs font-semibold text-foreground">
                                    {gp.tip}
                                  </p>
                                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                                    {gp.exercise}
                                  </p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
