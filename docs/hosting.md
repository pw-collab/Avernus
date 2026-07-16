# Hosting on Cloudflare Pages

The Avernus Archives builds to a fully static site (`output: 'static'` in
`astro.config.mjs`) plus a Pagefind search index. There is **no server runtime**
and **no adapter** required — Cloudflare Pages serves the `dist/` directory
directly. This is the preferred setup (see the build prompt's hosting note): pure
static, zero infrastructure to operate.

## Cloudflare Pages settings

Create a Pages project connected to this repository with:

| Setting | Value |
|---|---|
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Node version** | 20 or newer (set `NODE_VERSION=20` env var if needed) |

`npm run build` runs `astro build` and then `pagefind --site dist`, so the search
index is generated as part of every deploy — no separate index step or search
server to run.

## Custom domain

`astro.config.mjs` reads the public URL from the `SITE_URL` environment variable,
falling back to `https://avernus-archives.pages.dev`. Set `SITE_URL` in the Pages
project to your real domain once one is registered (this feeds canonical URLs,
Open Graph tags, JSON-LD, and the sitemap). Also update the `Sitemap:` line in
`public/robots.txt`.

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
