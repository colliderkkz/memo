import { env } from "cloudflare:workers";
import { listTagCounts } from "#lib/server/memos/index.ts";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
  return Response.json({ tags: await listTagCounts(env.DB) });
};
