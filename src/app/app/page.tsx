"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, EyeOff, Eye, Radio, Sparkles, Waves, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { LogicMap } from "~/components/logic-map";
import { UniversalInput } from "~/components/universal-input";
import { HistorySidebar } from "~/components/history-sidebar";
import { SessionSummaryModal } from "~/components/session-summary-modal";
import { BreathingPacer } from "~/components/breathing-pacer";
import { useSpeechLogic } from "~/hooks/useSpeechLogic";
import { useLiveSession } from "~/hooks/useLiveSession";
import {
  generateHolisticSummary,
  type HolisticSummary,
} from "~/actions/generateHolisticSummary";
import { saveSession } from "~/lib/history-storage";
import { useCalmMode } from "~/lib/calm-mode-context";
import { cn } from "~/lib/utils";

export default function Home() {
  const {
    isListening,
    isProcessing,
    transcript,
    graph,
    validatedIds,
    error,
    isReviewMode,
    startListening,
    stopListening,
    finishThought,
    resetGraph,
    loadGraph,
    exitReviewMode,
    processTextInput,
    getRawTranscript,
  } = useSpeechLogic();

  const { isCalmMode, isAcousticMode, toggleCalmMode, toggleAcousticMode } =
    useCalmMode();

  // ── Auto-save every 10 s ──────────────────────────────────────────────────────
  const [sessionsVersion, setSessionsVersion] = useState(0);
  const lastSavedRef = useRef("");

  useEffect(() => {
    const id = setInterval(() => {
      if (isReviewMode || !graph.nodes.length) return;
      const serialized = JSON.stringify(graph);
      if (serialized === lastSavedRef.current) return;
      lastSavedRef.current = serialized;
      saveSession(graph);
      setSessionsVersion((v) => v + 1);
    }, 10_000);
    return () => clearInterval(id);
  }, [graph, isReviewMode]);

  // ── Summary modal state ───────────────────────────────────────────────────────
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summary, setSummary] = useState<HolisticSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const handleSummarize = useCallback(async () => {
    setSummaryOpen(true);
    setSummaryLoading(true);
    setSummaryError(null);
    setSummary(null);
    try {
      const result = await generateHolisticSummary(graph, getRawTranscript());
      setSummary(result);
    } catch (e) {
      setSummaryError(
        e instanceof Error
          ? e.message
          : "Failed to generate summary. Please try again.",
      );
    } finally {
      setSummaryLoading(false);
    }
  }, [graph, getRawTranscript]);

  const handleCloseModal = useCallback(() => {
    setSummaryOpen(false);
  }, []);

  // ── Live session ──────────────────────────────────────────────────────────────
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const isLive = sessionId !== null;

  const { viewerCount } = useLiveSession({
    sessionId,
    isSpeaker: true,
    graph,
    validatedIds,
  });

  function handleGoLive() {
    const id = crypto.randomUUID();
    setSessionId(id);
    setShareUrl(`${window.location.origin}/view/${id}`);
  }

  function handleStopLive() {
    setSessionId(null);
    setShareUrl("");
    setCopied(false);
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <div className="flex h-full w-full">
        {/* ── Left sidebar ── */}
        <HistorySidebar
          onLoadSession={loadGraph}
          isReviewMode={isReviewMode}
          sessionsVersion={sessionsVersion}
        />

        {/* ── Main canvas area ── */}
        <div
          className={cn(
            "relative flex-1 min-w-0 transition-colors duration-700",
            isCalmMode && "bg-slate-900",
          )}
        >
          {/* Full-screen canvas — hidden in acoustic mode */}
          {!isAcousticMode ? (
            <LogicMap
              graph={graph}
              validatedIds={validatedIds}
              ghostText={transcript}
              calmMode={isCalmMode}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <BreathingPacer large />
            </div>
          )}

          {/* Breathing pacer overlay — calm mode only, non-acoustic */}
          {isCalmMode && !isAcousticMode && (
            <div className="pointer-events-none absolute bottom-4 right-4 z-10">
              <BreathingPacer />
            </div>
          )}

          {/* ── Live share panel (top-right) ── */}
          {isLive && (
            <div className="absolute right-3 top-3 z-10 w-52 rounded-xl border border-border bg-background/95 p-4 shadow-xl backdrop-blur-sm">
              {/* Header */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
                  <span className="text-xs font-semibold">Live</span>
                  <span className="text-xs text-muted-foreground">
                    · {viewerCount} {viewerCount === 1 ? "viewer" : "viewers"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleStopLive}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Stop live session"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              {/* QR code */}
              <div className="mb-3 flex justify-center rounded-lg bg-white p-2">
                <QRCodeSVG value={shareUrl} size={140} />
              </div>

              {/* URL + copy */}
              <p className="mb-2 truncate text-[10px] text-muted-foreground">
                {shareUrl}
              </p>
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {copied ? (
                  <Check className="size-3 text-emerald-400" />
                ) : (
                  <Copy className="size-3" />
                )}
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>
          )}

          {/* ── Floating control bar (bottom-centre) ── */}
          <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
            <div className="pointer-events-auto flex flex-col items-center gap-2">
              {/* Review mode banner */}
              {isReviewMode && (
                <div className="flex items-center gap-2.5 rounded-full border border-amber-500/40 bg-background/80 px-4 py-1.5 text-xs backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span className="text-amber-300">
                    Reviewing saved session — input paused
                  </span>
                  <button
                    type="button"
                    onClick={exitReviewMode}
                    className="ml-1 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Exit
                  </button>
                </div>
              )}

              {/* Live transcript pill */}
              {!isReviewMode && (transcript || isProcessing) && (
                <div className="max-w-sm rounded-full border border-border bg-background/80 px-4 py-1.5 text-center text-xs text-muted-foreground backdrop-blur-sm">
                  {isProcessing ? (
                    <span className="animate-pulse">Processing…</span>
                  ) : (
                    transcript
                  )}
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-2 shadow-lg backdrop-blur-sm sm:gap-3 sm:px-4">
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  disabled={isReviewMode}
                  className={cn(
                    "flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors sm:min-h-[32px] sm:px-3 sm:text-xs",
                    isListening
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                    isReviewMode && "cursor-not-allowed opacity-40",
                  )}
                >
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full sm:h-1.5 sm:w-1.5",
                      isListening
                        ? "animate-pulse bg-red-400"
                        : "bg-muted-foreground",
                    )}
                  />
                  {isListening ? "Stop" : "Start"}
                </button>

                <button
                  type="button"
                  onClick={finishThought}
                  disabled={isReviewMode || !transcript.trim() || isProcessing}
                  className="min-h-[44px] rounded-full px-4 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 sm:min-h-[32px] sm:px-3 sm:text-xs"
                >
                  Finish thought
                </button>

                <div className="h-5 w-px bg-border sm:h-4" />

                <button
                  type="button"
                  onClick={resetGraph}
                  className="min-h-[44px] rounded-full px-4 text-sm text-muted-foreground transition-colors hover:text-foreground sm:min-h-[32px] sm:px-3 sm:text-xs"
                >
                  Reset
                </button>

                <button
                  type="button"
                  onClick={isLive ? handleStopLive : handleGoLive}
                  className={cn(
                    "flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-sm transition-colors sm:min-h-[32px] sm:px-3 sm:text-xs",
                    isLive
                      ? "text-red-400 hover:text-red-300"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Radio className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                  {isLive ? (
                    <span>
                      Stop{" "}
                      {viewerCount > 0 && (
                        <span className="text-muted-foreground">
                          ({viewerCount})
                        </span>
                      )}
                    </span>
                  ) : (
                    "Go Live"
                  )}
                </button>

                <div className="h-5 w-px bg-border sm:h-4" />

                <button
                  type="button"
                  onClick={handleSummarize}
                  disabled={graph.nodes.length === 0 || summaryLoading}
                  className={cn(
                    "flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-sm transition-colors sm:min-h-[32px] sm:px-3 sm:text-xs",
                    graph.nodes.length > 0
                      ? "text-brand-warm hover:text-brand-warm/80"
                      : "text-muted-foreground opacity-30",
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                  {summaryLoading ? "Analyzing…" : "Summary"}
                </button>

                <div className="h-5 w-px bg-border sm:h-4" />

                {/* Calm mode toggle */}
                <button
                  type="button"
                  onClick={toggleCalmMode}
                  title={isCalmMode ? "Disable Calm Mode" : "Enable Calm Mode"}
                  className={cn(
                    "flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-sm transition-colors sm:min-h-[32px] sm:px-3 sm:text-xs",
                    isCalmMode
                      ? "text-sky-400 hover:text-sky-300"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Waves className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                  Calm
                </button>

                {/* Acoustic mode toggle — only visible when calm mode is on */}
                {isCalmMode && (
                  <button
                    type="button"
                    onClick={toggleAcousticMode}
                    title={
                      isAcousticMode
                        ? "Show visual map"
                        : "Hide visual map (Acoustic Mode)"
                    }
                    className={cn(
                      "flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-sm transition-colors sm:min-h-[32px] sm:px-3 sm:text-xs",
                      isAcousticMode
                        ? "text-amber-400 hover:text-amber-300"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {isAcousticMode ? (
                      <Eye className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                    )}
                  </button>
                )}
              </div>

              {/* Text input — disabled in review mode */}
              {!isReviewMode && (
                <UniversalInput
                  isProcessing={isProcessing}
                  onTextInput={processTextInput}
                />
              )}

              {/* Error */}
              {error && (
                <p className="max-w-sm rounded border border-red-800/50 bg-background/80 px-3 py-1.5 text-center text-xs text-red-400 backdrop-blur-sm">
                  {error}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Summary modal (rendered outside the flex layout) ── */}
      <SessionSummaryModal
        open={summaryOpen}
        onClose={handleCloseModal}
        summary={summary}
        isLoading={summaryLoading}
        error={summaryError}
      />
    </>
  );
}
