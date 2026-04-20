"use client";

import { use, useEffect, useState } from "react";
import { LogicMap } from "~/components/logic-map";
import { useLiveSession } from "~/hooks/useLiveSession";

export default function AudienceViewPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);

  const { remoteGraph, remoteValidatedIds, viewerCount, isConnected } =
    useLiveSession({ sessionId, isSpeaker: false });

  // Increment on every graph update so AutoFitController re-fires fitView.
  // This keeps the map centered on mobile after each speaker broadcast.
  const [fitKey, setFitKey] = useState(0);
  useEffect(() => {
    if (remoteGraph) setFitKey((k) => k + 1);
  }, [remoteGraph]);

  return (
    <div className="relative h-full w-full">
      {remoteGraph ? (
        <LogicMap
          graph={remoteGraph}
          validatedIds={remoteValidatedIds}
          fitKey={fitKey}
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3">
          {isConnected ? (
            <>
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand-blue" />
              <p className="text-sm text-muted-foreground">
                Waiting for the speaker to go live…
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Connecting…</p>
          )}
        </div>
      )}

      {/* Live indicator — top-left */}
      {isConnected && (
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-red-500/40 bg-background/80 px-3 py-1.5 text-xs backdrop-blur-sm">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
          Live
        </div>
      )}

      {/* Viewer count — top-right */}
      <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs backdrop-blur-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-blue" />
        {viewerCount} {viewerCount === 1 ? "viewer" : "viewers"}
      </div>
    </div>
  );
}
