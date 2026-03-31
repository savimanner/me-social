import type { FeedbackAction, UserFeedback } from "@me-social/contracts";
import { createId } from "../lib/id.js";
import { nowIso } from "../lib/time.js";
import type { WorkspaceRepository } from "../repositories/workspace-repository.js";

export class FeedbackService {
  constructor(private readonly repository: WorkspaceRepository) {}

  async record(userId: string, cardId: string, action: FeedbackAction): Promise<UserFeedback> {
    const feedback: UserFeedback = {
      id: createId("fb"),
      cardId,
      userId,
      action,
      createdAt: nowIso()
    };

    await this.repository.recordFeedback(feedback);
    return feedback;
  }
}

