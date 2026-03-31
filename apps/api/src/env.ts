import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url().optional().or(z.literal("")),
  SUPABASE_JWKS_URL: z.string().url().optional().or(z.literal("")),
  SUPABASE_ISSUER: z.string().optional().or(z.literal("")),
  SUPABASE_AUDIENCE: z.string().optional().or(z.literal("")),
  OPENROUTER_API_KEY: z.string().optional().or(z.literal("")),
  OPENROUTER_MODEL: z.string().default("openai/gpt-5.2"),
  NOTION_MODE: z.enum(["mock", "live"]).default("mock"),
  NOTION_CLIENT_ID: z.string().optional().or(z.literal("")),
  NOTION_CLIENT_SECRET: z.string().optional().or(z.literal("")),
  NOTION_OAUTH_REDIRECT_URI: z.string().optional().or(z.literal("")),
  IOS_APP_CALLBACK_URI: z.string().default("mesocial://oauth/notion"),
  APP_PUBLIC_URL: z.string().url().default("http://127.0.0.1:3000"),
  DEV_DEFAULT_USER_ID: z.string().default("user_demo"),
  DEV_DEFAULT_EMAIL: z.string().email().default("demo@me-social.local")
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  return EnvSchema.parse(process.env);
}
