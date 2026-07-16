import type { APIRoute } from 'astro';
import { buildSearchIndex } from '../lib/searchIndex';

/**
 * Static build-time endpoint emitting the search index as JSON. Prerendered to
 * `/search-index.json` in the static build (no server). See src/lib/searchIndex.ts.
 */
export const prerender = true;

export const GET: APIRoute = async () => {
  const records = await buildSearchIndex();
  return new Response(JSON.stringify(records), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
