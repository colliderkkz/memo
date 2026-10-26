import type { Handle } from "@sveltejs/kit/hooks";

const LOCAL_USER = {
  id: "local-owner",
  name: "Owner",
  email: "owner@local",
  image: null,
};

export const handle: Handle = async ({ event, resolve }) => {
  if (event.url.pathname === "/favicon.ico") {
    return Response.redirect(new URL("/favicon.png", event.url), 301);
  }

  event.locals.user = LOCAL_USER;

  return resolve(event);
};
