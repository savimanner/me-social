import type {
  GenerateDraftInput,
  GenerateDraftOutput,
  GenerateFeedCardInput,
  GenerateFeedCardOutput,
  LlmProvider
} from "@me-social/core";
import type { Env } from "../../env.js";

async function callOpenRouter<T>({
  apiKey,
  model,
  prompt,
  publicUrl,
  schemaName
}: {
  apiKey: string;
  model: string;
  prompt: string;
  publicUrl: string;
  schemaName: string;
}): Promise<T> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": publicUrl,
      "X-OpenRouter-Title": "Me Social"
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You write concise, useful social-feed style content and always return JSON for schema ${schemaName}.`
        },
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter request failed with ${response.status}`);
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };

  const rawContent = body.choices?.[0]?.message?.content;

  if (!rawContent) {
    throw new Error("OpenRouter returned an empty response");
  }

  return JSON.parse(rawContent) as T;
}

export class OpenRouterProvider implements LlmProvider {
  constructor(private readonly env: Env) {}

  async generateFeedCard({
    promptContext,
    sources
  }: GenerateFeedCardInput): Promise<GenerateFeedCardOutput> {
    return callOpenRouter<GenerateFeedCardOutput>({
      apiKey: this.env.OPENROUTER_API_KEY!,
      model: this.env.OPENROUTER_MODEL,
      publicUrl: this.env.APP_PUBLIC_URL,
      schemaName: "feed_card",
      prompt: `Using the following source notes, generate one text-only feed card.

Return JSON with keys: headline, body, rationale, sources.
Each source must contain: sourceItemId, notionPageId, title, kind, excerpt.

Sources:
${JSON.stringify(
  sources.map((item) => ({
    id: item.id,
    notionPageId: item.notionPageId,
    title: item.title,
    kind: item.kind,
    content: item.content,
    tags: item.tags
  })),
  null,
  2
)}

Context:
${promptContext}`
    });
  }

  async generateDraft({
    intent,
    prompt,
    sourceItems,
    existingCardBody
  }: GenerateDraftInput): Promise<GenerateDraftOutput> {
    return callOpenRouter<GenerateDraftOutput>({
      apiKey: this.env.OPENROUTER_API_KEY!,
      model: this.env.OPENROUTER_MODEL,
      publicUrl: this.env.APP_PUBLIC_URL,
      schemaName: "draft_edit",
      prompt: `Generate an editable Notion-ready draft.

Intent: ${intent}
Prompt: ${prompt}
Existing generated card body:
${existingCardBody ?? "(none)"}

Source items:
${JSON.stringify(
  sourceItems.map((item) => ({
    title: item.title,
    content: item.content,
    kind: item.kind,
    tags: item.tags
  })),
  null,
  2
)}

Return JSON with keys: title, body.`
    });
  }
}
