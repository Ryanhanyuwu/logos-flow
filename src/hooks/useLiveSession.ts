"use client";

import { useEffect, useRef, useState } from "react";
import throttle from "lodash.throttle";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "~/lib/supabase/client";
import type { LogicGraph } from "~/actions/processSpeechLogic";

interface UseLiveSessionOptions {
  sessionId: string | null;
  isSpeaker: boolean;
  /** Only required when isSpeaker=true */
  graph?: LogicGraph;
  /** Only required when isSpeaker=true */
  validatedIds?: Set<string>;
}

export interface LiveSessionState {
  viewerCount: number;
  remoteGraph: LogicGraph | null;
  remoteValidatedIds: Set<string>;
  isConnected: boolean;
}

export function useLiveSession({
  sessionId,
  isSpeaker,
  graph,
  validatedIds,
}: UseLiveSessionOptions): LiveSessionState {
  const [viewerCount, setViewerCount] = useState(0);
  const [remoteGraph, setRemoteGraph] = useState<LogicGraph | null>(null);
  const [remoteValidatedIds, setRemoteValidatedIds] = useState<Set<string>>(
    new Set(),
  );
  const [isConnected, setIsConnected] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);

  // Refs let the throttled function always read the latest values
  // without being re-created when graph changes.
  const graphRef = useRef(graph);
  const validatedIdsRef = useRef(validatedIds);
  graphRef.current = graph;
  validatedIdsRef.current = validatedIds;

  // Create the throttled broadcast exactly once per component lifetime.
  const throttledBroadcastRef = useRef(
    throttle(
      () => {
        const channel = channelRef.current;
        const g = graphRef.current;
        if (!channel || !g) return;
        void channel.send({
          type: "broadcast",
          event: "graph-update",
          payload: {
            graph: g,
            validatedIds: [...(validatedIdsRef.current ?? new Set())],
          },
        });
      },
      800,
      { leading: true, trailing: true },
    ),
  );

  // Cancel any pending trailing call on unmount.
  useEffect(() => {
    const fn = throttledBroadcastRef.current;
    return () => fn.cancel();
  }, []);

  // Channel lifecycle — subscribe/unsubscribe when sessionId or role changes.
  useEffect(() => {
    if (!sessionId) return;

    const supabase = createClient();
    const channel = supabase.channel(`session:${sessionId}`);
    channelRef.current = channel;

    // Presence sync → update viewer count on both speaker and audience screens.
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<{ role: string }>();
      const viewers = Object.values(state)
        .flat()
        .filter((p) => p.role === "viewer").length;
      setViewerCount(viewers);
    });

    // Audience only: receive graph state pushed by the speaker.
    if (!isSpeaker) {
      channel.on(
        "broadcast",
        { event: "graph-update" },
        ({
          payload,
        }: {
          payload: { graph: LogicGraph; validatedIds: string[] };
        }) => {
          setRemoteGraph(payload.graph);
          setRemoteValidatedIds(new Set(payload.validatedIds));
        },
      );
    }

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        setIsConnected(true);
        await channel.track({ role: isSpeaker ? "speaker" : "viewer" });
      }
    });

    return () => {
      setIsConnected(false);
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [sessionId, isSpeaker]);

  // Speaker: fire the throttled broadcast whenever graph state changes.
  useEffect(() => {
    if (!isSpeaker || !sessionId) return;
    throttledBroadcastRef.current();
  }, [isSpeaker, sessionId, graph, validatedIds]);

  return { viewerCount, remoteGraph, remoteValidatedIds, isConnected };
}
