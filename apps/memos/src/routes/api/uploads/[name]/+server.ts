import { env } from "cloudflare:workers";
import { error } from "@sveltejs/kit";
import { UPLOAD_NAME_RE, contentTypeForName, uploadR2Key } from "#lib/server/uploads.ts";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params }) => {
  const name = params.name;
  if (!UPLOAD_NAME_RE.test(name)) {
    error(404, "Upload not found.");
  }

  const object = await env.MEMOS_BUCKET.get(uploadR2Key(name));
  if (!object) {
    error(404, "Upload not found.");
  }

  return new Response(object.body, {
    headers: {
      "Content-Type":
        object.httpMetadata?.contentType ?? contentTypeForName(name) ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
};
