import type { FeedCard, SourceItem, UserFeedback } from "@me-social/contracts";

function ageInHours(iso: string): number {
  return Math.max(0, (Date.now() - new Date(iso).getTime()) / 3_600_000);
}

export function scoreCandidate(
  sources: SourceItem[],
  feedback: UserFeedback[],
  sourceSignature: string
): number {
  const freshnessScore =
    sources.reduce((sum, item) => sum + Math.max(0, 48 - ageInHours(item.updatedAt)), 0) /
    Math.max(sources.length, 1);

  const diversityScore = new Set(sources.map((item) => item.kind)).size * 8;
  const tagSpread = new Set(sources.flatMap((item) => item.tags)).size * 1.5;

  const negativeSignals = feedback.filter(
    (entry) => entry.action === "dismiss" && entry.cardId.includes(sourceSignature.slice(0, 8))
  ).length;

  return Number((freshnessScore + diversityScore + tagSpread - negativeSignals * 6).toFixed(2));
}

export function sortFeedCards(cards: FeedCard[]): FeedCard[] {
  return [...cards].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

