import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  API_BASE_URL: z.string().url().default("http://localhost:3000"),
  WORKSPACE_SYNC_INTERVAL_MINUTES: z.coerce.number().min(1).default(30),
  FEED_REFRESH_LIMIT: z.coerce.number().min(1).max(50).default(12),
  WORKER_BEARER_TOKEN: z.string().optional().or(z.literal(""))
});

const env = EnvSchema.parse(process.env);

async function post(path: string, body?: unknown) {
  const response = await fetch(new URL(path, env.API_BASE_URL), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(env.WORKER_BEARER_TOKEN
        ? {
            Authorization: `Bearer ${env.WORKER_BEARER_TOKEN}`
          }
        : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${path} failed with ${response.status}: ${errorText}`);
  }

  return response.json().catch(() => null);
}

async function runCycle() {
  console.log(`[worker] sync started at ${new Date().toISOString()}`);

  try {
    await post("/workspace/sync");
  } catch (error) {
    console.error("[worker] sync failed", error);
  }

  try {
    await post("/feed/refresh", { limit: env.FEED_REFRESH_LIMIT });
    console.log(`[worker] refresh completed at ${new Date().toISOString()}`);
  } catch (error) {
    console.error("[worker] refresh failed", error);
  }
}

await runCycle();

setInterval(runCycle, env.WORKSPACE_SYNC_INTERVAL_MINUTES * 60_000);
