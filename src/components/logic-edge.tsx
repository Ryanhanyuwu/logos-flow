"use client";

import { useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import { Popover } from "radix-ui";
import { Loader2, Zap } from "lucide-react";
import type { EdgeValidation } from "~/actions/processSpeechLogic";
import { strengthenConnection } from "~/actions/strengthenConnection";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const EDGE_CONFIG: Record<
  EdgeValidation,
  { stroke: string; strokeWidth: number; strokeDasharray?: string }
> = {
  valid: { stroke: "#22c55e", strokeWidth: 2 },
  // Pending edges get a dash pattern so the flowing animation is visible
  pending: { stroke: "#94a3b8", strokeWidth: 1.5, strokeDasharray: "5 5" },
  invalid: { stroke: "#ef4444", strokeWidth: 2.5, strokeDasharray: "6 3" },
};

export function LogicEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
}: EdgeProps) {
  const validation = (data?.validation as EdgeValidation) ?? "pending";
  const sourceLabel = (data?.sourceLabel as string) ?? "";
  const targetLabel = (data?.targetLabel as string) ?? "";
  const config = EDGE_CONFIG[validation];

  const [open, setOpen] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  async function handleStrengthen() {
    if (loading) return;
    setSuggestion(null);
    setLoading(true);
    try {
      const result = await strengthenConnection(sourceLabel, targetLabel);
      setSuggestion(result);
    } catch {
      setSuggestion("Failed to get a suggestion. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setSuggestion(null);
      setLoading(false);
    }
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: config.stroke,
          strokeWidth: config.strokeWidth,
          strokeDasharray: config.strokeDasharray,
        }}
      />

      {validation === "invalid" && (
        <EdgeLabelRenderer>
          <Popover.Root open={open} onOpenChange={handleOpenChange}>
            <Popover.Trigger asChild>
              {/* Invisible hit area + pulsing indicator at edge midpoint */}
              <button
                type="button"
                title="Click for suggestions to strengthen this connection"
                style={{
                  position: "absolute",
                  transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                  pointerEvents: "all",
                }}
                className="nodrag nopan flex size-5 items-center justify-center rounded-full border border-red-500/60 bg-red-500/20 shadow-sm shadow-red-500/30 transition-colors hover:bg-red-500/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
              >
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-red-500" />
                </span>
              </button>
            </Popover.Trigger>

            <Popover.Portal>
              <Popover.Content
                side="top"
                sideOffset={8}
                align="center"
                avoidCollisions
                className={cn(
                  "z-50 w-72 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-xl",
                  "data-[state=open]:animate-in data-[state=closed]:animate-out",
                  "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                  "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                  "data-[side=top]:slide-in-from-bottom-2",
                )}
              >
                {/* Header */}
                <div className="mb-3 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-red-400">
                    Weak connection
                  </p>
                  <div className="flex flex-col gap-1 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
                    <span className="text-muted-foreground">Source</span>
                    <span className="font-medium text-foreground line-clamp-2">
                      {sourceLabel}
                    </span>
                    <span className="mt-1 text-muted-foreground">→ Target</span>
                    <span className="font-medium text-foreground line-clamp-2">
                      {targetLabel}
                    </span>
                  </div>
                </div>

                {/* Suggestion area */}
                {suggestion && (
                  <div className="mb-3 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs leading-relaxed text-foreground">
                    {suggestion}
                  </div>
                )}

                {/* CTA button */}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-1.5 text-xs"
                  onClick={handleStrengthen}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Zap className="size-3" />
                  )}
                  {suggestion
                    ? "Regenerate suggestion"
                    : "How can I strengthen this connection?"}
                </Button>

                <Popover.Arrow className="fill-border" />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
