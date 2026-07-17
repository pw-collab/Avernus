# Hosting on Cloudflare

The Avernus Archives builds to fully prerendered pages (`output: 'static'` in
`astro.config.mjs`) and deploys to Cloudflare via the **`@astrojs/cloudflare`
adapter** (Cloudflare Workers static assets). All content is still prerendered —
there is no per-request rendering of content pages — but the adapter changes the
output layout:

- prerendered pages and public assets are emitted to **`dist/client/`** (this is
  the served root), and
- a small Worker entry is emitted to `dist/server/`.

Because `dist/client/` is what gets served, the Pagefind search index must live
there too. `npm run build` runs `astro build && pagefind --site dist/client`, so
the index is generated into `dist/client/pagefind/` alongside the pages — served
at `/pagefind/…` as the search island expects. (Indexing plain `dist/` instead
would write the index to a sibling directory that never gets served, silently
breaking search — that is exactly the trap this path avoids.)

## Deploying

Deployment uses Wrangler (added by Cloudflare's Workers autoconfig):

| Command | Purpose |
|---|---|
| `npm run build` | Prerender + build the search index |
| `npm run deploy` | `npm run build` then `wrangler deploy` |
| `npm run preview` | `npm run build` then `wrangler dev` (local Workers preview) |

If you instead wire up a Git-connected Cloudflare project, use build command
`npm run build`. The Node version should be 20 or newer.

## Custom domain

`astro.config.mjs` reads the public URL from the `SITE_URL` environment variable,
falling back to the current temporary Workers domain
`https://avernus.pedrowah.workers.dev`. Once a permanent domain is registered,
set `SITE_URL` in the Workers build settings to override the default (this feeds
canonical URLs, Open Graph/Twitter image tags, JSON-LD, and the sitemap) and
update the `Sitemap:` line in `public/robots.txt` to match.

## Caching

`public/_headers` sets long-lived, immutable caching for hashed build assets and
the Pagefind index directory. Cloudflare Pages applies these automatically.

## If SSR-adjacent features are ever needed

Nothing in the content or component layer depends on static output. If a future
feature needs on-request rendering, install `@astrojs/cloudflare` and set it as
the `adapter` with `output: 'server'` (or `'hybrid'`); the rest of the site is
unaffected. Prefer staying static for as long as possible.

## When to revisit search

Search runs on Pagefind (client-side, fully static). If traffic and corpus size
grow to the point where server-side search is warranted (see `PRD.md` §13), swap
the provider in `src/lib/search/index.ts` for a Meilisearch/Typesense
implementation. That is the only file that needs to change; a small search VPS or
managed instance would then run alongside Pages.
