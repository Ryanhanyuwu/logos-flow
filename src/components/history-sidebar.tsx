"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import type { LogicGraph } from "~/actions/processSpeechLogic";
import { cn } from "~/lib/utils";
import {
  deleteSession,
  loadSessions,
  type SavedSession,
} from "~/lib/history-storage";

interface HistorySidebarProps {
  onLoadSession: (graph: LogicGraph) => void;
  isReviewMode: boolean;
  /** Incremented by the parent each time a new session is saved. */
  sessionsVersion: number;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function HistorySidebar({
  onLoadSession,
  isReviewMode,
  sessionsVersion,
}: HistorySidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sessions, setSessions] = useState<SavedSession[]>([]);

  // Reload sessions whenever the parent saves a new one.
  useEffect(() => {
    setSessions(loadSessions());
  }, [sessionsVersion]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteSession(id);
    setSessions(loadSessions());
  };

  return (
    <div
      className={cn(
        "relative flex h-full flex-shrink-0 flex-col border-r border-border bg-card transition-all duration-200",
        isCollapsed ? "w-10" : "w-60",
      )}
    >
      {/* Header / toggle row */}
      <div
        className={cn(
          "flex h-10 flex-shrink-0 items-center border-b border-border",
          isCollapsed ? "justify-center" : "px-3",
        )}
      >
        {!isCollapsed && (
          <span className="mr-auto text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            History
          </span>
        )}
        <button
          type="button"
          onClick={() => setIsCollapsed((v) => !v)}
          className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={
            isCollapsed ? "Expand history sidebar" : "Collapse history sidebar"
          }
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Session list — hidden when collapsed */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs leading-relaxed text-muted-foreground/60">
              No saved sessions yet.
              <br />
              Sessions auto-save every 10 s.
            </p>
          ) : (
            <ul>
              {sessions.map((session) => (
                <li key={session.id}>
                  <button
                    type="button"
                    onClick={() => onLoadSession(session.graph)}
                    className={cn(
                      "group relative w-full px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
                      isReviewMode && "cursor-default opacity-60",
                    )}
                  >
                    <p className="truncate pr-6 text-xs font-medium text-foreground">
                      {session.summary}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {formatDate(session.timestamp)}
                    </p>

                    {/* Delete — revealed on row hover */}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, session.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      aria-label="Delete session"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
