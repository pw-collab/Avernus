// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import keystatic from '@keystatic/astro';

import cloudflare from '@astrojs/cloudflare';

// The public site URL. Feeds canonical links, the sitemap, JSON-LD, and OG/
// Twitter image URLs, so it must match the deployed origin. Currently the
// temporary Workers domain; set the SITE_URL env var (in the Workers build
// settings) to override this default once a permanent domain is registered —
// no code change needed then. See the "Site name and domain" open question in
// PRD.md §13, and also update the Sitemap line in public/robots.txt.
const SITE_URL = process.env.SITE_URL ?? 'https://avernus.pedrowah.workers.dev';

// The Keystatic CMS (Phase 3) injects server-rendered admin/API routes, which
// only make sense during local editing. Gating the integration to the `dev`
// command keeps `astro build` a PURE STATIC build — no adapter, no server
// routes — so the Cloudflare Pages deploy is unchanged. Run `npm run dev` and
// open /keystatic to edit content locally. See admin/README.md for the hosted
// (GitHub-backed) upgrade path.
const isDev = process.argv.includes('dev');

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,

  // Pure static output. Cloudflare Pages serves the `dist/` directory directly
  // with zero server runtime — see docs/hosting.md. Pagefind (run as a
  // postbuild step) indexes the static HTML, so no server is required for
  // search either. If an SSR-adjacent feature is ever needed, swap in
  // `@astrojs/cloudflare` as the adapter; nothing in the content or component
  // layer depends on the output mode.
  output: 'static',

  trailingSlash: 'never',

  integrations: [
    react(),
    mdx(),
    sitemap(),
    ...(isDev ? [keystatic()] : []),
  ],

  build: {
    // Emit `/domains/barovia/index.html` so clean, extensionless URLs work on
    // Cloudflare Pages without redirect rules.
    format: 'directory',
  },

  adapter: cloudflare(),
});