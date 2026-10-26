# Architecture

This repository is a `pnpm` workspace with one app and one reusable package. It is a local
single-user fork: authentication, AI chat, and the MCP endpoint from the upstream project have
been removed, and all Cloudflare bindings run on wrangler's local simulation.

## Repository Layout

| Path                                                    | Role                                                          |
| ------------------------------------------------------- | ------------------------------------------------------------- |
| [apps/memos](../apps/memos)                             | Main SvelteKit application (Cloudflare Worker build target)   |
| [packages/ui](../packages/ui)                           | Shared Svelte UI components, theme tokens, and local demo app |
| [docs](../docs)                                         | Maintainer-facing documentation                               |
| [apps/memos/wrangler.json](../apps/memos/wrangler.json) | Worker entrypoint and bindings (all local)                    |

## High-Level System

```text
Browser (Svelte 5 runes state)
  -> SvelteKit routes (/api/memos, /api/tags, /api/memos/import/x, /api/memos/[id]/og)
  -> typed domain services in apps/memos/src/lib/server
  -> Cloudflare bindings (locally simulated by miniflare under apps/memos/.wrangler/state)
     - D1: structured memo indexes and searchable body mirrors
     - R2: full memo markdown (canonical)
     - KV: derived caches (OG images, fonts)
```

## Workspace Structure

### App: `apps/memos`

The deployable application is the `@my-memos/app` workspace package defined in [apps/memos/package.json](../apps/memos/package.json).

Void is configured at [apps/memos/void.json](../apps/memos/void.json), beside the SvelteKit package it prepares. The repository-root scripts delegate Void commands to this workspace package. D1 remains owned by the existing Wrangler migrations; the app does not opt into Void's `void/db` schema or migration layer.

Key areas:

- [apps/memos/src/routes](../apps/memos/src/routes)
  Page routes and API endpoints.
- [apps/memos/src/lib/server](../apps/memos/src/lib/server)
  Server-only filters, domain services, and persistence adapters.
  - [apps/memos/src/lib/server/db/schema.ts](../apps/memos/src/lib/server/db/schema.ts)
    Drizzle ORM schema for the `memos` table; exports `MemoRow` inferred type.
  - `apps/memos/src/lib/server/memos`
    Memo domain split into D1 repository queries, R2 body storage, KV-derived cache handling,
    and a service that coordinates operations spanning those boundaries.
  - `apps/memos/src/lib/server/og`
    Open Graph share-image rendering (`@resvg/resvg-wasm`) and KV caching of images and fonts.
    In dev (Node SSR) the wasm module is loaded from bytes; in workerd it is ESM-imported.
  - `apps/memos/src/lib/server/x-import.ts`
    Validates X/Twitter status URLs and the FxTwitter response fields used by the import route.
  - `apps/memos/src/lib/server/discovery`
    Generates robots.txt, sitemap.xml, rss.xml, and llms.txt from public memos.
- [apps/memos/src/lib/components](../apps/memos/src/lib/components)
  App-specific Svelte UI not exported as reusable package components.
  Contains two layout generations:
  - `views/` — default `Home`, `Favorites`, and `Archive` views using the masthead-based layout and timeline feed.
  - `views-legacy/` — classic views kept for comparison via the in-page toggle; these use `AppShell` + `Sidebar` where applicable.
- [apps/memos/migrations](../apps/memos/migrations)
  D1 schema migrations applied by wrangler. These numbered SQL files are the source of truth; the Drizzle schema mirrors the runtime table shape for query building.

### Package: `packages/ui`

The shared package `@my-memos/ui` exports:

- reusable UI primitives from [packages/ui/src/components](../packages/ui/src/components)
  - Includes the `Timeline` component and `TimelineGroup` type used by the new layout feed.
- theme and utility helpers from [packages/ui/src/lib](../packages/ui/src/lib)
- CSS entrypoints exposed in [packages/ui/package.json](../packages/ui/package.json)

It also contains a local demo surface in [packages/ui/dev](../packages/ui/dev) for component iteration.

## Request Model

Every request is treated as the owner: [apps/memos/src/hooks.server.ts](../apps/memos/src/hooks.server.ts)
assigns a synthetic `locals.user` (see Identity below) and does nothing else beyond a
`/favicon.ico` redirect. There is no session lookup and no auth guard on any route.

### Pages

- `/` loads memos and tag counts with optional filters; `view=public` toggles a public-only view.
- `/memo/[id]` is the canonical permalink for a memo, server-rendered with canonical, Open Graph,
  and JSON-LD metadata. Private and archived memos get `noindex, nofollow`.
- `/archive` loads archived memos and tag counts.
- `/favorites` lists non-archived favorite memos and owns the X/Twitter import form. Imported
  posts are created as favorite memos so they appear in the current list after invalidation.
- Both layout generations share the `my-memos:layout` localStorage preference; the theme lives in
  `my-memos:theme`.
- The home search control accepts `sort=updated` to order card results by `updated_at`; the
  default timeline remains grouped by `created_at`.

The main page load lives in [apps/memos/src/routes/+page.server.ts](../apps/memos/src/routes/+page.server.ts).

### Crawler Discovery

`/robots.txt`, `/sitemap.xml`, `/rss.xml`, and `/llms.txt` are generated from public, non-archived
memos by [apps/memos/src/lib/server/discovery](../apps/memos/src/lib/server/discovery/index.ts).
`robots.txt` disallows `/api/` (except memo OG images), `/archive`, and `/favorites`. The site
origin is taken from the incoming request URL.

Memo markdown renders to HTML during SSR through
[apps/memos/src/lib/utils/markdown.ts](../apps/memos/src/lib/utils/markdown.ts), so crawlers and the
first paint receive formatted content without running JavaScript. Its rules: CommonMark with GFM
tables, footnotes, strikethrough and task lists; soft breaks become line breaks; an unindented
line after a list item ends the list; raw HTML is shown as text; bare scheme URLs are linked
outside code and links; destinations other than relative, HTTP(S) and `mailto:` are neutralized.

## Identity

There is no authentication. `hooks.server.ts` sets `event.locals.user` to a fixed synthetic owner
(`{ id: "local-owner", name: "Owner", email: "owner@local", image: null }`); `+layout.server.ts`
passes it to the layout for the avatar display, and all load functions and API routes treat the
request as the owner. The upstream Better Auth + Google OAuth implementation was removed in this
fork; consult the upstream repository if auth must be reintroduced before any public deployment.

## Memo Storage Model

Memo persistence is split deliberately across D1 and R2.

### D1

Table defined in [apps/memos/migrations/0001_create_memos.sql](../apps/memos/migrations/0001_create_memos.sql). The Drizzle schema mirror lives in [apps/memos/src/lib/server/db/schema.ts](../apps/memos/src/lib/server/db/schema.ts).

Columns: `id`, `r2_key`, `tags_json`, `excerpt`, `created_at`, `updated_at`, `visibility`,
`pinned`, `favorite`, `archived`.

Use D1 for list queries and filtering by date, tag, archive state, and visibility.

Despite its name, `excerpt` currently mirrors the complete trimmed memo body so list rendering and `LIKE` search do not read R2. R2 remains canonical when loading an individual memo.

### R2

R2 stores the full memo markdown body. During `pnpm dev` the binding is locally simulated
(`remoteBindings: false` in [apps/memos/vite.config.ts](../apps/memos/vite.config.ts)); state
persists under `apps/memos/.wrangler/state`.

### KV

KV stores generated Open Graph images and fetched font bytes. Tag counts are queried directly
from D1 so page rendering does not depend on KV availability.

Memo lists are **not** cached in KV — full-list JSON blobs caused KV size/corruption issues and CPU rate limits on Workers upstream. Instead, lists are paginated via cursor-based `limit=25` queries directly against D1.

Cache invalidation happens in domain services after successful mutations. Cache adapters own
the concrete KV keys and generated OG invalidation calls.

## Server Domain Logic

Memo server logic lives under `apps/memos/src/lib/server/memos` with explicit external
boundaries.

Responsibilities:

- `repository.ts` maps D1 rows and owns memo list, statistics, and tag queries through Drizzle ORM
  (`drizzle-orm/d1`).
- `storage.ts` owns canonical memo body reads and writes in R2.
- `cache.ts` owns generated OG cache invalidation in KV.
- `service.ts` owns create, update, delete, and canonical-body loading orchestration across D1,
  R2, and the generated-image cache boundary.

SvelteKit routes validate transport input and map typed domain errors to HTTP responses.

X post import is a narrow external boundary: the server accepts only HTTPS status URLs on
`x.com` or `twitter.com`, extracts the numeric post ID, and requests the fixed
`api.fxtwitter.com` host without user credentials. The resulting text, photo URLs rendered as
separate Markdown image blocks, author attribution, and canonical source URL pass through the
normal memo creation service and D1/R2 write path. X imports set the new memo's `favorite` flag
during that same creation path.

The Wrangler SQL migrations are authoritative for the schema. The Drizzle mirror (`apps/memos/src/lib/server/db/schema.ts`) describes that table to application code and exports `MemoRow` via `typeof memos.$inferSelect`, eliminating hand-written row types.

## API Surface

Memo responses use the shared `Memo` contract and include `id`, `r2Key`, `content`, tags,
timestamps, visibility, pin, favorite, and archive state. `r2Key` is the canonical object path used
for the memo body in R2. All routes are unauthenticated in this fork.

### `/api/memos`

File: [apps/memos/src/routes/api/memos/+server.ts](../apps/memos/src/routes/api/memos/+server.ts)

- `GET`
  Paginated memo list. Accepts `cursor` (base64-encoded compound cursor), `limit` (default 25, max 100), `search` (at most 48 UTF-8 bytes), `date` (a valid `YYYY-MM-DD` value), `tags` (comma-separated), `publicOnly`, `archivedOnly`, `favoritesOnly`, `sortByUpdated` query params. Returns `{ memos: Memo[], nextCursor: string | null }`. Used by the client for infinite-scroll loading.
- `POST`
  Creates a memo.

### `/api/memos/[id]`

File: [apps/memos/src/routes/api/memos/[id]/+server.ts](../apps/memos/src/routes/api/memos/[id]/+server.ts)

- `GET` returns `{ memo }`.
- `PATCH` updates content, tags, visibility, pin state, favorite state, or archive state.
- `DELETE` deletes a memo and its stored content.

### `/api/memos/[id]/og`

Renders the memo's Open Graph share image. `?format=svg` returns the intermediate SVG; the PNG
path caches rendered images and fetched fonts in KV. Public memos only.

### `/api/memos/import/x`

- `POST` imports an X/Twitter status URL through FxTwitter, then creates a favorite memo with the
  requested visibility.

### `/api/tags`

- `GET` returns tag counts.

## Type Boundaries

The runtime contract for Cloudflare bindings is `AppEnv` in [apps/memos/src/lib/server/types.ts](../apps/memos/src/lib/server/types.ts), merged into `Cloudflare.Env` by [apps/memos/src/app.d.ts](../apps/memos/src/app.d.ts) for `import { env } from "cloudflare:workers"`. Keep it in sync with:

- `apps/memos/wrangler.json`
- any new bindings
- any platform-dependent server code

If these drift, the app may still compile but fail at runtime.

## Known Inconsistencies To Watch

- D1's `excerpt` column currently mirrors the full memo body; the name understates its role and duplicates canonical R2 data.
- Schema changes should be made as Wrangler SQL migrations first, then mirrored in the Drizzle schema. Do not mix Void- or Drizzle-generated migrations with Wrangler-applied SQL files.
- `wrangler.json` carries placeholder `database_id` / KV `id` values; they satisfy the config schema but are meaningless locally. Replace them with real IDs only if you deploy to your own Cloudflare account.
