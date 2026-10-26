# AGENTS

This file is the entrypoint for agents and maintainers working in this repository.

## Project Summary

`my-memos` is a `pnpm` workspace centered on a SvelteKit memo application. It is a local
single-user fork: authentication, AI chat, and the MCP endpoint have been removed, and storage
runs on wrangler's local simulation (D1/R2/KV under `apps/memos/.wrangler/state`). The main app
lives in [apps/memos](apps/memos), and the shared component/theme package lives in
[packages/ui](packages/ui).

## Read These First

- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Design system and tokens: [docs/DESIGN.md](docs/DESIGN.md)
- Code style guide: [docs/STYLEGUIDE.md](docs/STYLEGUIDE.md)

## Working Expectations

- Prefer root-level commands from [package.json](package.json).
- Run `pnpm` commands that touch the registry or run project checks outside the sandbox with approval to avoid sandbox-related hangs and timeouts.
- Keep Cloudflare binding changes synchronized across [apps/memos/wrangler.json](apps/memos/wrangler.json), [apps/memos/src/app.d.ts](apps/memos/src/app.d.ts), and the docs above.
- Treat `D1` as metadata storage, `R2` as memo body storage, and `KV` as cache only.
- Reuse `packages/ui` for generic UI primitives; keep route-specific composition in `apps/memos`.
- The app has no auth: `hooks.server.ts` assigns a synthetic owner user to every request. Do not reintroduce auth checks unless explicitly asked.
- Do not overwrite or revert unrelated local changes unless explicitly asked.

## Change Checklist

Before finishing a non-trivial change:

1. Run `pnpm check`.
2. If directory responsibilities, data flow, or bindings changed, update [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
3. If theme tokens or visual primitives changed, update [docs/DESIGN.md](docs/DESIGN.md).
