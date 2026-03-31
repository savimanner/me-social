# Architecture

## Overview

`me-social` is split into three runtime pieces:

- `apps/api`: the authenticated HTTP surface for onboarding, feed delivery, generation requests, and Notion write-back
- `apps/worker`: a background process that periodically triggers sync and feed refresh cycles
- `apps/ios`: the SwiftUI client that consumes the API and edits generated content before persisting it

## Data Flow

1. The user connects a Notion source database and maps fields to the app's canonical model.
2. The API persists the workspace connection and syncs source rows into the local mirror.
3. The feed service clusters fresh source items, asks the LLM provider for generated cards, ranks them, and stores them per user.
4. The iOS client loads the ranked feed, records save/dismiss/approve feedback, and opens a detail screen with source traceability.
5. Draft generation happens from the detail screen. The user can then create a new Notion record, rewrite an existing one, or archive the source item.

## Runtime Modes

- If `DATABASE_URL` is not set, the API uses an in-memory repository.
- If `NOTION_MODE=mock`, the backend returns seeded sample databases and source content.
- If `OPENROUTER_API_KEY` is missing, the backend falls back to a deterministic mock LLM provider.
- Supabase JWT verification is enabled when `SUPABASE_JWKS_URL` and `SUPABASE_ISSUER` are configured. Otherwise the API uses a demo auth context for local development.

## Schema

The Postgres schema in [apps/api/supabase-schema.sql](/Users/nikitaumov/code/me-social/apps/api/supabase-schema.sql) mirrors:

- workspace connections
- source items mirrored from Notion
- generated feed cards
- explicit user feedback
- editable drafts

