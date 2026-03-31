# Setup Notes

## Backend

1. Run `npm install`.
2. Copy [apps/api/.env.example](/Users/nikitaumov/code/me-social/apps/api/.env.example) to `apps/api/.env.local`.
3. Copy [apps/worker/.env.example](/Users/nikitaumov/code/me-social/apps/worker/.env.example) to `apps/worker/.env.local`.
4. For a real database, apply [apps/api/supabase-schema.sql](/Users/nikitaumov/code/me-social/apps/api/supabase-schema.sql) to your Supabase Postgres instance and set `DATABASE_URL`.
5. For live Notion connect, set `NOTION_MODE=live`, `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET`, `NOTION_OAUTH_REDIRECT_URI`, and `IOS_APP_CALLBACK_URI`.
6. In your Notion public integration settings, register the same redirect URI you use in `NOTION_OAUTH_REDIRECT_URI`. For local simulator work, the default is `http://127.0.0.1:3000/notion/oauth/callback`.
6. For live generation, set `OPENROUTER_API_KEY` and optionally `OPENROUTER_MODEL`.

## iOS

- Generate the Xcode project from [apps/ios/project.yml](/Users/nikitaumov/code/me-social/apps/ios/project.yml) with XcodeGen.
- The client defaults to `http://127.0.0.1:3000`, which works in the simulator against the local API.
- The current onboarding flow uses a real Notion connect button. In `mock` mode it simulates the OAuth round-trip locally; in `live` mode it sends the user through Notion’s page/database access picker and returns via the `mesocial://oauth/notion` URL scheme.

## Verification

- `npm run build`
- `npm run test`

The SwiftUI sources were added and reviewed, but full iOS compilation could not be verified in this environment because Xcode is not installed and the local command-line toolchain is mismatched with the SDK.
