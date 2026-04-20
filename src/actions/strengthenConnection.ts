"use server";

import { env } from "~/env";

export async function strengthenConnection(
  sourceLabel: string,
  targetLabel: string,
): Promise<string> {
  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        messages: [
          {
            role: "user",
            content: `Given the claim "${targetLabel}" and the supporting point "${sourceLabel}", the current connection is weak. Suggest one concrete way to rephrase the source or add a specific type of evidence (e.g., 'statistical data' or 'expert testimony') to make the logic sound. Be concise — two or three sentences maximum.`,
          },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error ${response.status}: ${error}`);
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[];
  };

  return (
    data.choices[0]?.message?.content?.trim() ?? "No suggestion available."
  );
}
