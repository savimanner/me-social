import type { DraftEdit, GenerateDraftRequest } from "@me-social/contracts";
import { createId } from "../lib/id.js";
import { nowIso } from "../lib/time.js";
import type { LlmProvider } from "../integrations/llm/provider.js";
import type { WorkspaceRepository } from "../repositories/workspace-repository.js";

export class DraftService {
  constructor(
    private readonly repository: WorkspaceRepository,
    private readonly llmProvider: LlmProvider
  ) {}

  async generate(userId: string, input: GenerateDraftRequest): Promise<DraftEdit> {
    const connection = await this.repository.getConnection(userId);

    if (!connection) {
      throw new Error("Workspace connection not found");
    }

    const [sourceItem, card] = await Promise.all([
      input.sourceItemId ? this.repository.getSourceItem(connection.id, input.sourceItemId) : null,
      input.cardId ? this.repository.getFeedCard(userId, input.cardId) : null
    ]);

    const draftBody = await this.llmProvider.generateDraft({
      intent: input.intent,
      prompt: input.prompt,
      sourceItems: sourceItem ? [sourceItem] : [],
      existingCardBody: card?.body
    });

    const timestamp = nowIso();
    const draft: DraftEdit = {
      id: createId("draft"),
      workspaceId: connection.id,
      userId,
      intent: input.intent,
      title: draftBody.title,
      body: draftBody.body,
      originCardId: card?.id ?? null,
      originSourceItemId: sourceItem?.id ?? null,
      prompt: input.prompt,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    return this.repository.saveDraft(draft);
  }
}

