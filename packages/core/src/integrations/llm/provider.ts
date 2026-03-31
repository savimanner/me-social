import type { DraftIntent, FeedCardSource, SourceItem } from "@me-social/contracts";

export interface GenerateFeedCardInput {
  promptContext: string;
  sources: SourceItem[];
}

export interface GenerateFeedCardOutput {
  headline: string;
  body: string;
  rationale: string;
  sources: FeedCardSource[];
}

export interface GenerateDraftInput {
  intent: DraftIntent;
  prompt: string;
  sourceItems: SourceItem[];
  existingCardBody?: string;
}

export interface GenerateDraftOutput {
  title: string;
  body: string;
}

export interface LlmProvider {
  generateFeedCard(input: GenerateFeedCardInput): Promise<GenerateFeedCardOutput>;
  generateDraft(input: GenerateDraftInput): Promise<GenerateDraftOutput>;
}

