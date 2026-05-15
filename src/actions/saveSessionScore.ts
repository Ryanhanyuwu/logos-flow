"use server";

import { createClient } from "~/lib/supabase/server";

export async function saveSessionScore(
  logicalDensity: number,
  sentenceFlowScore: number,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.from("session_scores").insert({
    user_id: user.id,
    logical_density: logicalDensity,
    sentence_flow_score: sentenceFlowScore,
  });
}
