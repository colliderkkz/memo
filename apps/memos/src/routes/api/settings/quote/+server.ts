import { env } from "cloudflare:workers";
import { z } from "zod";
import type { RequestHandler } from "./$types";

const QUOTE_KEY = "settings:quote";
const MAX_QUOTE_LENGTH = 500;

const quoteSchema = z.object({ text: z.string().trim().min(1).max(MAX_QUOTE_LENGTH) });

export const GET: RequestHandler = async () => {
  const text = await env.MEMOS_CACHE.get(QUOTE_KEY);
  return Response.json({ text });
};

export const PUT: RequestHandler = async ({ request }) => {
  const result = quoteSchema.safeParse(await request.json().catch(() => null));
  if (!result.success) {
    return Response.json(
      { error: `Quote text is required (max ${MAX_QUOTE_LENGTH} characters).` },
      { status: 400 },
    );
  }

  await env.MEMOS_CACHE.put(QUOTE_KEY, result.data.text);
  return Response.json({ text: result.data.text });
};

export const DELETE: RequestHandler = async () => {
  await env.MEMOS_CACHE.delete(QUOTE_KEY);
  return Response.json({ text: null });
};
