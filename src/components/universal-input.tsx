"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { InputType } from "~/actions/processSpeechLogic";
import { cn } from "~/lib/utils";

/** Characters required in a paste to bypass the debounce and go straight to bulk processing. */
const PASTE_THRESHOLD = 120;
/** Debounce delay for incremental typing (ms). */
const DEBOUNCE_MS = 800;

interface UniversalInputProps {
  isProcessing: boolean;
  onTextInput: (text: string, inputType: InputType) => void;
}

export function UniversalInput({
  isProcessing,
  onTextInput,
}: UniversalInputProps) {
  const [liveMode, setLiveMode] = useState(true);
  const [value, setValue] = useState("");
  const [isBulkFlash, setIsBulkFlash] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveModeRef = useRef(liveMode);

  // Keep live-mode ref in sync so the paste handler always sees the current value.
  useEffect(() => {
    liveModeRef.current = liveMode;
  }, [liveMode]);

  // Auto-grow textarea height to fit content.
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  const clearDebounce = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      setValue(text);
      autoResize();

      if (!liveModeRef.current) return;

      clearDebounce();
      debounceRef.current = setTimeout(() => {
        if (text.trim()) onTextInput(text, "incremental");
      }, DEBOUNCE_MS);
    },
    [autoResize, clearDebounce, onTextInput],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      if (!liveModeRef.current) return;

      const pasted = e.clipboardData.getData("text");
      if (pasted.length >= PASTE_THRESHOLD) {
        clearDebounce();
        // Update value synchronously after React processes the paste event.
        setTimeout(() => {
          const fullText = textareaRef.current?.value ?? pasted;
          setIsBulkFlash(true);
          onTextInput(fullText, "paste");
          setTimeout(() => setIsBulkFlash(false), 1200);
        }, 0);
      }
    },
    [clearDebounce, onTextInput],
  );

  // Cleanup debounce on unmount.
  useEffect(() => () => clearDebounce(), [clearDebounce]);

  const showIndicator = isProcessing || isBulkFlash;

  return (
    <div
      className={cn(
        "relative w-full max-w-lg rounded-2xl border bg-background/80 shadow-lg backdrop-blur-sm transition-colors",
        isBulkFlash ? "border-blue-500/60" : "border-border",
      )}
    >
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onPaste={handlePaste}
        rows={2}
        placeholder={
          liveMode
            ? "Type or paste a thought…"
            : "Type here, then press ⏎ to process"
        }
        className={cn(
          "w-full resize-none overflow-hidden rounded-2xl bg-transparent px-4 pb-10 pt-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none",
          isBulkFlash && "animate-pulse",
        )}
        onKeyDown={(e) => {
          if (!liveMode && e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (value.trim()) {
              clearDebounce();
              onTextInput(value, "incremental");
            }
          }
        }}
      />

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between rounded-b-2xl px-3 py-2">
        {/* Live Mode toggle */}
        <button
          type="button"
          onClick={() => setLiveMode((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <span
            className={cn(
              "relative inline-flex h-4 w-7 flex-shrink-0 rounded-full border transition-colors",
              liveMode
                ? "border-foreground/40 bg-foreground/20"
                : "border-border bg-muted",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-3 w-3 rounded-full bg-foreground transition-transform",
                liveMode ? "translate-x-3.5" : "translate-x-0.5",
              )}
            />
          </span>
          Live
        </button>

        {/* Processing indicator */}
        <div
          className={cn(
            "flex items-center gap-1.5 text-xs transition-opacity",
            showIndicator ? "opacity-100" : "opacity-0",
          )}
        >
          {isBulkFlash ? (
            <>
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-blue-400" />
              <span className="text-blue-400">Bulk processing…</span>
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground" />
              <span className="text-muted-foreground">Processing…</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
