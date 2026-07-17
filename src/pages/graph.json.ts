import type { APIRoute } from 'astro';
import { buildGraph } from '../lib/graph';

/**
 * Static build-time endpoint emitting the relationship graph as JSON.
 * Prerendered to `/graph.json`; consumed by the graph explorer island.
 */
export const prerender = true;

export const GET: APIRoute = async () => {
  const graph = await buildGraph();
  return new Response(JSON.stringify(graph), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
