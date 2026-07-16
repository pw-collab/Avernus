// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// The public site URL. Cloudflare Pages assigns a *.pages.dev subdomain by
// default; override with a custom domain here once one is registered (see the
// "Site name and domain" open question in PRD.md §13).
const SITE_URL = process.env.SITE_URL ?? 'https://avernus-archives.pages.dev';

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
  ],
  build: {
    // Emit `/domains/barovia/index.html` so clean, extensionless URLs work on
    // Cloudflare Pages without redirect rules.
    format: 'directory',
  },
});
