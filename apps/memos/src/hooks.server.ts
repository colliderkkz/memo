import { env } from "cloudflare:workers";
import type { Handle } from "@sveltejs/kit/hooks";
import { AVATAR_R2_KEY, getProfileName } from "#lib/server/profile.ts";

export const handle: Handle = async ({ event, resolve }) => {
  if (event.url.pathname === "/favicon.ico") {
    return Response.redirect(new URL("/favicon.png", event.url), 301);
  }

  const [name, avatar] = await Promise.all([
    getProfileName(env.MEMOS_CACHE),
    env.MEMOS_BUCKET.head(AVATAR_R2_KEY).catch(() => null),
  ]);

  event.locals.user = {
    id: "local-owner",
    name,
    email: "owner@local",
    image: avatar ? "/api/profile/avatar" : null,
  };

  return resolve(event);
};
