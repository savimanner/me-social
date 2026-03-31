import { z } from "zod";

export const SourceItemKindSchema = z.enum(["note", "book_snippet", "idea"]);
export type SourceItemKind = z.infer<typeof SourceItemKindSchema>;

export const SourceItemStatusSchema = z.enum(["active", "archived"]);
export type SourceItemStatus = z.infer<typeof SourceItemStatusSchema>;

export const FeedCardStatusSchema = z.enum(["ready", "saved", "dismissed", "approved"]);
export type FeedCardStatus = z.infer<typeof FeedCardStatusSchema>;

export const FeedbackActionSchema = z.enum(["save", "dismiss", "approve"]);
export type FeedbackAction = z.infer<typeof FeedbackActionSchema>;

export const DraftIntentSchema = z.enum(["rewrite_existing", "create_new"]);
export type DraftIntent = z.infer<typeof DraftIntentSchema>;

export const NotionFieldMappingSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  kind: z.string().min(1),
  status: z.string().min(1),
  tags: z.string().min(1),
  author: z.string().optional(),
  sourceTitle: z.string().optional(),
  sourceUrl: z.string().optional()
});
export type NotionFieldMapping = z.infer<typeof NotionFieldMappingSchema>;

export const WorkspaceConnectionSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  workspaceName: z.string().min(1),
  notionWorkspaceId: z.string().min(1),
  notionDatabaseId: z.string().min(1),
  notionDatabaseTitle: z.string().min(1),
  notionAccessTokenRef: z.string().min(1),
  mapping: NotionFieldMappingSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastSyncedAt: z.string().datetime().nullable().default(null)
});
export type WorkspaceConnection = z.infer<typeof WorkspaceConnectionSchema>;

export const SourceItemSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  notionPageId: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  kind: SourceItemKindSchema,
  status: SourceItemStatusSchema,
  tags: z.array(z.string()),
  author: z.string().nullable().default(null),
  sourceTitle: z.string().nullable().default(null),
  sourceUrl: z.string().url().nullable().default(null),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type SourceItem = z.infer<typeof SourceItemSchema>;

export const FeedCardSourceSchema = z.object({
  sourceItemId: z.string().min(1),
  notionPageId: z.string().min(1),
  title: z.string().min(1),
  kind: SourceItemKindSchema,
  excerpt: z.string().min(1)
});
export type FeedCardSource = z.infer<typeof FeedCardSourceSchema>;

export const FeedCardSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  userId: z.string().min(1),
  headline: z.string().min(1),
  body: z.string().min(1),
  rationale: z.string().min(1),
  status: FeedCardStatusSchema,
  score: z.number(),
  sourceSignature: z.string().min(1),
  mediaPrompt: z.string().nullable().default(null),
  sources: z.array(FeedCardSourceSchema).min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type FeedCard = z.infer<typeof FeedCardSchema>;

export const UserFeedbackSchema = z.object({
  id: z.string().min(1),
  cardId: z.string().min(1),
  userId: z.string().min(1),
  action: FeedbackActionSchema,
  createdAt: z.string().datetime()
});
export type UserFeedback = z.infer<typeof UserFeedbackSchema>;

export const DraftEditSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  userId: z.string().min(1),
  intent: DraftIntentSchema,
  title: z.string().min(1),
  body: z.string().min(1),
  originCardId: z.string().nullable().default(null),
  originSourceItemId: z.string().nullable().default(null),
  prompt: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type DraftEdit = z.infer<typeof DraftEditSchema>;

export const FeedPageSchema = z.object({
  items: z.array(FeedCardSchema),
  nextCursor: z.string().nullable()
});
export type FeedPage = z.infer<typeof FeedPageSchema>;

export const RecordFeedbackInputSchema = z.object({
  action: FeedbackActionSchema
});
export type RecordFeedbackInput = z.infer<typeof RecordFeedbackInputSchema>;

export const GenerateDraftRequestSchema = z.object({
  cardId: z.string().optional(),
  sourceItemId: z.string().optional(),
  intent: DraftIntentSchema,
  prompt: z.string().min(1)
});
export type GenerateDraftRequest = z.infer<typeof GenerateDraftRequestSchema>;

export const GenerateDraftResponseSchema = z.object({
  draft: DraftEditSchema
});
export type GenerateDraftResponse = z.infer<typeof GenerateDraftResponseSchema>;

export const CreateNotionItemInputSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  kind: SourceItemKindSchema,
  tags: z.array(z.string()).default([]),
  author: z.string().optional(),
  sourceTitle: z.string().optional(),
  sourceUrl: z.string().url().optional()
});
export type CreateNotionItemInput = z.infer<typeof CreateNotionItemInputSchema>;

export const UpdateNotionItemInputSchema = z.object({
  title: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  kind: SourceItemKindSchema.optional(),
  tags: z.array(z.string()).optional(),
  author: z.string().nullable().optional(),
  sourceTitle: z.string().nullable().optional(),
  sourceUrl: z.string().url().nullable().optional()
});
export type UpdateNotionItemInput = z.infer<typeof UpdateNotionItemInputSchema>;

export const DatabaseOptionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1)
});
export type DatabaseOption = z.infer<typeof DatabaseOptionSchema>;

export const NotionOAuthStartResponseSchema = z.object({
  authorizationUrl: z.string().min(1),
  state: z.string().min(1)
});
export type NotionOAuthStartResponse = z.infer<typeof NotionOAuthStartResponseSchema>;

export const NotionOAuthSessionSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  workspaceId: z.string().min(1),
  workspaceName: z.string().min(1),
  accessToken: z.string().min(1),
  databases: z.array(DatabaseOptionSchema),
  createdAt: z.string().datetime()
});
export type NotionOAuthSession = z.infer<typeof NotionOAuthSessionSchema>;

export const NotionOAuthSessionResponseSchema = z.object({
  session: NotionOAuthSessionSchema
});
export type NotionOAuthSessionResponse = z.infer<typeof NotionOAuthSessionResponseSchema>;

export const ConnectWorkspaceInputSchema = z.object({
  workspaceName: z.string().min(1),
  notionWorkspaceId: z.string().min(1),
  notionDatabaseId: z.string().min(1),
  notionDatabaseTitle: z.string().min(1),
  notionAccessToken: z.string().min(1),
  mapping: NotionFieldMappingSchema
});
export type ConnectWorkspaceInput = z.infer<typeof ConnectWorkspaceInputSchema>;

export const ConnectWorkspaceFromOAuthInputSchema = z.object({
  oauthSessionId: z.string().min(1),
  notionDatabaseId: z.string().min(1),
  notionDatabaseTitle: z.string().min(1),
  mapping: NotionFieldMappingSchema
});
export type ConnectWorkspaceFromOAuthInput = z.infer<typeof ConnectWorkspaceFromOAuthInputSchema>;

export const SessionBootstrapSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  connection: WorkspaceConnectionSchema.nullable(),
  databases: z.array(DatabaseOptionSchema)
});
export type SessionBootstrap = z.infer<typeof SessionBootstrapSchema>;
