"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  processSpeechLogic,
  validateGraphEdges,
  type InputType,
  type LogicGraph,
} from "~/actions/processSpeechLogic";
import { reconcileGraphState } from "~/lib/reconcile";

// ─── Tuning constants ─────────────────────────────────────────────────────────

/** Minimum finalized words before triggering an early LLM call. */
const WORD_THRESHOLD = 7;
/** Fire an LLM call this many ms after the last speech event. */
const PERIODIC_MS = 2000;
/** How long after the last graph change before running the edge-validation pass. */
const EDGE_VALIDATION_DELAY_MS = 2500;
/** How long after a node is added before it flips to "validated". */
const VALIDATION_DELAY_MS = 1000;

const wordCount = (s: string) =>
  s.trim() === "" ? 0 : s.trim().split(/\s+/).length;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSpeechLogic() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  // Combined finalized + interim text (drives the live transcript pill and ghost node)
  const [transcript, setTranscript] = useState("");
  const [graph, setGraph] = useState<LogicGraph>({ nodes: [], edges: [] });
  const [validatedIds, setValidatedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isReviewMode, setIsReviewMode] = useState(false);

  // ── Stable refs ──────────────────────────────────────────────────────────────
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const periodicTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const edgeValidationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const graphRef = useRef<LogicGraph>({ nodes: [], edges: [] });
  /** Words finalized by the browser but not yet sent to the LLM. */
  const segmentRef = useRef("");
  /** Current unstable interim fragment (not finalized by browser). */
  const interimRef = useRef("");
  const isListeningRef = useRef(false);
  const isProcessingRef = useRef(false);

  // Per-node validation: each new node ID gets a 1-second timer.
  const validationTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const scheduledIds = useRef<Set<string>>(new Set());

  // Stable function ref so recognition callbacks always call the latest version.
  const processSegmentRef = useRef<
    (text: string, inputType?: InputType) => Promise<void>
  >(async () => {});
  /** Text queued while the LLM is busy — drained after each call finishes. */
  const pendingTextRef = useRef<{ text: string; inputType: InputType } | null>(
    null,
  );
  /** Accumulates every finalized speech recognition result for coaching analysis. */
  const rawTranscriptRef = useRef("");

  // ── Validation helpers ────────────────────────────────────────────────────────

  const scheduleValidation = useCallback((nodeId: string) => {
    if (scheduledIds.current.has(nodeId)) return;
    scheduledIds.current.add(nodeId);

    const t = setTimeout(() => {
      setValidatedIds((prev) => new Set([...prev, nodeId]));
      validationTimers.current.delete(nodeId);
    }, VALIDATION_DELAY_MS);

    validationTimers.current.set(nodeId, t);
  }, []);

  const validateNow = useCallback((ids: string[]) => {
    if (!ids.length) return;
    for (const id of ids) {
      const t = validationTimers.current.get(id);
      if (t) {
        clearTimeout(t);
        validationTimers.current.delete(id);
      }
      scheduledIds.current.add(id);
    }
    setValidatedIds((prev) => new Set([...prev, ...ids]));
  }, []);

  // ── Edge validation (deferred second pass) ───────────────────────────────────

  const scheduleEdgeValidation = useCallback(() => {
    if (edgeValidationTimerRef.current) {
      clearTimeout(edgeValidationTimerRef.current);
    }
    edgeValidationTimerRef.current = setTimeout(async () => {
      edgeValidationTimerRef.current = null;
      const currentGraph = graphRef.current;
      if (currentGraph.edges.length === 0) return;
      try {
        const validatedEdges = await validateGraphEdges(currentGraph);
        if (!validatedEdges.length) return;
        // Merge updated validation statuses onto the existing edges
        const validationMap = new Map(
          validatedEdges.map((e) => [`${e.source}->${e.target}`, e.validation]),
        );
        const updatedGraph: LogicGraph = {
          ...currentGraph,
          edges: currentGraph.edges.map((e) => ({
            ...e,
            validation:
              validationMap.get(`${e.source}->${e.target}`) ?? e.validation,
          })),
        };
        graphRef.current = updatedGraph;
        setGraph(updatedGraph);
      } catch {
        // Edge validation is best-effort; silently ignore failures
      }
    }, EDGE_VALIDATION_DELAY_MS);
  }, []);

  // ── LLM call ─────────────────────────────────────────────────────────────────

  const processSegment = useCallback(
    async (text: string, inputType: InputType = "speech") => {
      if (!text.trim() || isProcessingRef.current) return;

      isProcessingRef.current = true;
      setIsProcessing(true);
      setError(null);

      try {
        const additions = await processSpeechLogic(
          text,
          graphRef.current,
          inputType,
        );
        const { merged, newlyValidatedIds } = reconcileGraphState(
          graphRef.current,
          additions,
        );

        graphRef.current = merged;
        setGraph(merged);

        for (const node of additions.nodes) scheduleValidation(node.id);
        validateNow(newlyValidatedIds);
        if (merged.edges.length > 0) scheduleEdgeValidation();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        isProcessingRef.current = false;
        setIsProcessing(false);
        // Drain any text that was queued while we were busy
        const pending = pendingTextRef.current;
        if (pending) {
          pendingTextRef.current = null;
          processSegmentRef.current(pending.text, pending.inputType);
        }
      }
    },
    [scheduleValidation, validateNow, scheduleEdgeValidation],
  );

  // ── Text input pipeline ───────────────────────────────────────────────────────

  const processTextInput = useCallback((text: string, inputType: InputType) => {
    if (!text.trim()) return;
    if (isProcessingRef.current) {
      // Queue the latest text; overwrite any previously pending text
      pendingTextRef.current = { text, inputType };
      return;
    }
    processSegmentRef.current(text, inputType);
  }, []);

  // Keep the ref current so closures in recognition callbacks always see latest.
  useEffect(() => {
    processSegmentRef.current = processSegment;
  }, [processSegment]);

  // ── Timer helpers ─────────────────────────────────────────────────────────────

  const clearPeriodic = useCallback(() => {
    if (periodicTimerRef.current) {
      clearTimeout(periodicTimerRef.current);
      periodicTimerRef.current = null;
    }
  }, []);

  /**
   * (Re)starts the periodic 2-second timer.
   * When it fires, send any accumulated finalized words to the LLM.
   */
  const resetPeriodicTimer = useCallback(() => {
    clearPeriodic();
    periodicTimerRef.current = setTimeout(() => {
      const text = segmentRef.current.trim();
      if (text && !isProcessingRef.current) {
        segmentRef.current = "";
        processSegmentRef.current(text);
      }
    }, PERIODIC_MS);
  }, [clearPeriodic]);

  // ── Finalize (user stops / manual trigger) ────────────────────────────────────

  const finalizeSegment = useCallback(async () => {
    clearPeriodic();
    const text = `${segmentRef.current} ${interimRef.current}`.trim();
    segmentRef.current = "";
    interimRef.current = "";
    setTranscript("");
    if (text) await processSegmentRef.current(text);
  }, [clearPeriodic]);

  // ── Recognition setup ─────────────────────────────────────────────────────────

  const startListening = useCallback(() => {
    const SR =
      typeof window !== "undefined"
        ? (window.SpeechRecognition ??
          (
            window as Window & {
              webkitSpeechRecognition?: typeof SpeechRecognition;
            }
          ).webkitSpeechRecognition)
        : undefined;

    if (!SR) {
      setError(
        "Web Speech API is not supported in this browser. Try Chrome or Edge.",
      );
      return;
    }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let newFinals = "";
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          newFinals += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (newFinals) {
        segmentRef.current += newFinals;
        rawTranscriptRef.current += `${newFinals} `;
      }
      interimRef.current = interim;
      setTranscript(`${segmentRef.current} ${interim}`.trim());

      // ── Word-count trigger ──────────────────────────────────────────────────
      // Fire as soon as the finalized buffer is dense enough, without waiting.
      if (
        wordCount(segmentRef.current) >= WORD_THRESHOLD &&
        !isProcessingRef.current
      ) {
        const text = segmentRef.current.trim();
        segmentRef.current = "";
        processSegmentRef.current(text);
        resetPeriodicTimer(); // keep the periodic clock running for what comes next
        return;
      }

      // ── Periodic trigger ────────────────────────────────────────────────────
      // Reset 2-second clock on every speech event.
      resetPeriodicTimer();
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== "aborted" && event.error !== "no-speech") {
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch {
          /* already starting */
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    isListeningRef.current = true;
    setIsListening(true);
    setError(null);
    recognition.start();
  }, [resetPeriodicTimer]);

  const stopListening = useCallback(() => {
    clearPeriodic();
    isListeningRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    finalizeSegment();
  }, [clearPeriodic, finalizeSegment]);

  const finishThought = useCallback(() => {
    finalizeSegment();
  }, [finalizeSegment]);

  const resetGraph = useCallback(() => {
    clearPeriodic();
    if (edgeValidationTimerRef.current) {
      clearTimeout(edgeValidationTimerRef.current);
      edgeValidationTimerRef.current = null;
    }
    for (const t of validationTimers.current.values()) clearTimeout(t);
    validationTimers.current.clear();
    scheduledIds.current.clear();

    graphRef.current = { nodes: [], edges: [] };
    segmentRef.current = "";
    interimRef.current = "";
    rawTranscriptRef.current = "";
    setGraph({ nodes: [], edges: [] });
    setValidatedIds(new Set());
    setTranscript("");
    setError(null);
    setIsReviewMode(false);
  }, [clearPeriodic]);

  /**
   * Load a saved graph into the canvas and enter review mode.
   * Stops any active recognition and disables mic/text input until
   * the user explicitly exits review mode or resets.
   */
  const loadGraph = useCallback(
    (newGraph: LogicGraph) => {
      // Stop recognition
      clearPeriodic();
      if (edgeValidationTimerRef.current) {
        clearTimeout(edgeValidationTimerRef.current);
        edgeValidationTimerRef.current = null;
      }
      for (const t of validationTimers.current.values()) clearTimeout(t);
      validationTimers.current.clear();
      scheduledIds.current.clear();

      isListeningRef.current = false;
      recognitionRef.current?.stop();
      recognitionRef.current = null;

      segmentRef.current = "";
      interimRef.current = "";
      pendingTextRef.current = null;

      // All nodes in a saved session are already validated
      graphRef.current = newGraph;
      setGraph(newGraph);
      setValidatedIds(new Set(newGraph.nodes.map((n) => n.id)));
      setIsListening(false);
      setIsProcessing(false);
      setTranscript("");
      setError(null);
      setIsReviewMode(true);
    },
    [clearPeriodic],
  );

  const exitReviewMode = useCallback(() => {
    setIsReviewMode(false);
  }, []);

  // ── Cleanup on unmount ────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      clearPeriodic();
      if (edgeValidationTimerRef.current)
        clearTimeout(edgeValidationTimerRef.current);
      for (const t of validationTimers.current.values()) clearTimeout(t);
      isListeningRef.current = false;
      recognitionRef.current?.stop();
    };
  }, [clearPeriodic]);

  return {
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
    getRawTranscript: () => rawTranscriptRef.current,
  };
}
