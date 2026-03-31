import type {
  GenerateDraftInput,
  GenerateDraftOutput,
  GenerateFeedCardInput,
  GenerateFeedCardOutput,
  LlmProvider
} from "@me-social/core";

export class MockLlmProvider implements LlmProvider {
  async generateFeedCard({ sources }: GenerateFeedCardInput): Promise<GenerateFeedCardOutput> {
    const title = sources.map((item) => item.title).join(" + ");
    const opening = sources[0]?.kind === "book_snippet" ? "A book fragment worth applying today:" : "An idea worth pushing further:";

    return {
      headline: `Remix: ${title}`,
      body: `${opening}\n\n${sources
        .map((item) => `• ${item.title}: ${item.content.slice(0, 160)}`)
        .join("\n")}\n\nTurn this into one concrete action before the day ends.`,
      rationale: "Mock provider blended the freshest connected notes into a single actionable post.",
      sources: sources.map((item) => ({
        sourceItemId: item.id,
        notionPageId: item.notionPageId,
        title: item.title,
        kind: item.kind,
        excerpt: item.content.slice(0, 200)
      }))
    };
  }

  async generateDraft({
    intent,
    prompt,
    sourceItems,
    existingCardBody
  }: GenerateDraftInput): Promise<GenerateDraftOutput> {
    const seed = sourceItems[0]?.title ?? "Untitled idea";
    return {
      title: intent === "rewrite_existing" ? `Rewrite: ${seed}` : `New idea: ${seed}`,
      body: `${existingCardBody ? `${existingCardBody}\n\n` : ""}Prompt: ${prompt}\n\nExpanded from: ${seed}\n\nShip a tighter, clearer version that is easy to review and save back into Notion.`
    };
  }
}
