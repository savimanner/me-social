# me-social

Greenfield monorepo for an iPhone-first app and backend that turns a personal Notion knowledge base into a useful AI-generated feed.

## Repo Layout

- `apps/api`: Fastify API for auth, feed delivery, Notion sync, and write-back
- `apps/worker`: background refresh and sync worker
- `apps/ios`: SwiftUI iPhone app source tree and XcodeGen project spec
- `packages/contracts`: shared TypeScript API/domain contracts
- `packages/core`: backend domain services, ranking, orchestration, and integration interfaces
- `docs`: setup notes and architecture details

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Copy environment templates:

```bash
cp apps/api/.env.example apps/api/.env.local
cp apps/worker/.env.example apps/worker/.env.local
```

3. Run the API:

```bash
npm run dev:api
```

4. Run the worker in a second terminal:

```bash
npm run dev:worker
```

## Current State

- The backend runs locally with an in-memory repository by default.
- When `DATABASE_URL`, `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET`, and `OPENROUTER_API_KEY` are configured, the scaffold switches to the real integrations that are already wired into the service layer.
- The iOS app source is included as a SwiftUI/XcodeGen scaffold because full Xcode is not installed in this environment.
- The onboarding flow now uses a backend-driven Notion OAuth connect step and deep-links back into the app via `mesocial://oauth/notion`.
