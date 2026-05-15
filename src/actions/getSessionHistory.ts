"use server";

import { createClient } from "~/lib/supabase/server";

export interface SessionHistoryResult {
  isAuthenticated: boolean;
  avgLogicalDensity: number | null;
  avgSentenceFlowScore: number | null;
  count: number;
}

export async function getSessionHistory(): Promise<SessionHistoryResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      isAuthenticated: false,
      avgLogicalDensity: null,
      avgSentenceFlowScore: null,
      count: 0,
    };
  }

  const { data } = await supabase
    .from("session_scores")
    .select("logical_density, sentence_flow_score")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!data || data.length === 0) {
    return {
      isAuthenticated: true,
      avgLogicalDensity: null,
      avgSentenceFlowScore: null,
      count: 0,
    };
  }

  const avg = (nums: number[]) =>
    Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;

  return {
    isAuthenticated: true,
    avgLogicalDensity: avg(data.map((r) => r.logical_density)),
    avgSentenceFlowScore: avg(data.map((r) => r.sentence_flow_score)),
    count: data.length,
  };
}
