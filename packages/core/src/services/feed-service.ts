import type { FeedCard, SourceItem, UserFeedback } from "@me-social/contracts";
import { sortFeedCards, scoreCandidate } from "../lib/ranking.js";
import { createId } from "../lib/id.js";
import { nowIso } from "../lib/time.js";
import type { LlmProvider } from "../integrations/llm/provider.js";
import type { WorkspaceRepository } from "../repositories/workspace-repository.js";

function buildCandidateGroups(items: SourceItem[]): SourceItem[][] {
  const active = items.filter((item) => item.status === "active");
  const singletons = active.map((item) => [item]);
  const pairings: SourceItem[][] = [];

  for (let index = 0; index < active.length; index += 1) {
    const current = active[index];
    const related = active.find((candidate, candidateIndex) => {
      if (candidateIndex === index) {
        return false;
      }

      return candidate.tags.some((tag) => current.tags.includes(tag));
    });

    if (related) {
      pairings.push([current, related]);
    }
  }

  return [...singletons, ...pairings];
}

function createSourceSignature(items: SourceItem[]): string {
  return items
    .map((item) => item.id)
    .sort()
    .join(":");
}

function createPromptContext(items: SourceItem[]): string {
  return items
    .map(
      (item) =>
        `Title: ${item.title}\nKind: ${item.kind}\nTags: ${item.tags.join(", ")}\nContent: ${item.content}`
    )
    .join("\n\n---\n\n");
}

export class FeedService {
  constructor(
    private readonly repository: WorkspaceRepository,
    private readonly llmProvider: LlmProvider
  ) {}

  async getFeed(userId: string, cursor: string | null, limit: number) {
    return this.repository.listFeedCards(userId, cursor, limit);
  }

  async getCard(userId: string, cardId: string) {
    return this.repository.getFeedCard(userId, cardId);
  }

  async refreshFeed(userId: string, limit = 12): Promise<FeedCard[]> {
    const connection = await this.repository.getConnection(userId);

    if (!connection) {
      return [];
    }

    const [sourceItems, feedback] = await Promise.all([
      this.repository.listSourceItems(connection.id),
      this.repository.listFeedback(userId)
    ]);

    const candidateGroups = buildCandidateGroups(sourceItems).slice(0, limit);
    const cards: FeedCard[] = [];
    const seenSignatures = new Set<string>();

    for (const group of candidateGroups) {
      const sourceSignature = createSourceSignature(group);

      if (seenSignatures.has(sourceSignature)) {
        continue;
      }

      seenSignatures.add(sourceSignature);
      const generated = await this.llmProvider.generateFeedCard({
        promptContext: createPromptContext(group),
        sources: group
      });

      cards.push(
        this.buildCard({
          workspaceId: connection.id,
          userId,
          sourceSignature,
          generated,
          sources: group,
          feedback
        })
      );
    }

    const sorted = sortFeedCards(cards);
    await this.repository.saveFeedCards(sorted);
    return sorted;
  }

  private buildCard({
    workspaceId,
    userId,
    sourceSignature,
    generated,
    sources,
    feedback
  }: {
    workspaceId: string;
    userId: string;
    sourceSignature: string;
    generated: Awaited<ReturnType<LlmProvider["generateFeedCard"]>>;
    sources: SourceItem[];
    feedback: UserFeedback[];
  }): FeedCard {
    const timestamp = nowIso();

    return {
      id: createId("card"),
      workspaceId,
      userId,
      headline: generated.headline,
      body: generated.body,
      rationale: generated.rationale,
      status: "ready",
      score: scoreCandidate(sources, feedback, sourceSignature),
      sourceSignature,
      mediaPrompt: null,
      sources: generated.sources,
      createdAt: timestamp,
      updatedAt: timestamp
    };
  }
}

