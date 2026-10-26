import type { AppEnv } from "#lib/server/types.ts";

declare global {
  namespace App {
    interface Locals {
      user: {
        id: string;
        name: string;
        email: string;
        image: string | null;
      };
    }
  }

  namespace Cloudflare {
    interface Env extends AppEnv {}
  }
}

export {};
