import { getCollection } from 'astro:content';
import {
  ENTITY_COLLECTIONS,
  entityName,
  entityUrl,
  type EntityCollectionKey,
} from './entities';
import { REFERENCE_FIELDS } from './related';

/**
 * Build-time relationship graph (PRD.md §7.5, Phase 5).
 *
 * Derives a nodes/edges graph from the same frontmatter references that power
 * `getRelatedEntities` — this is the "rendering change, not a data change" the
 * scaffold was built for. Emitted as `/graph.json` and consumed by the graph
 * island. Nothing here is Pagefind/CMS-specific; it reads only the content
 * collections.
 */

export interface GraphNode {
  /** Stable id: `${collection}:${slug}`. */
  id: string;
  collection: EntityCollectionKey;
  slug: string;
  name: string;
  url: string;
  editions: string[];
  spoiler: boolean;
  /** Number of edges touching this node (for sizing). */
  degree: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  /** Human label for the relationship, from the source's perspective. */
  label: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

function nodeId(collection: string, slug: string): string {
  return `${collection}:${slug}`;
}

function refSlugs(value: unknown, many: boolean): string[] {
  const one = (v: unknown): string | null => {
    if (v && typeof v === 'object') {
      const o = v as { id?: unknown; slug?: unknown };
      if (typeof o.id === 'string') return o.id;
      if (typeof o.slug === 'string') return o.slug;
    }
    return null;
  };
  if (many) {
    if (!Array.isArray(value)) return [];
    return value.map(one).filter((s): s is string => s !== null);
  }
  const s = one(value);
  return s ? [s] : [];
}

export async function buildGraph(): Promise<GraphData> {
  const keys = Object.keys(ENTITY_COLLECTIONS) as EntityCollectionKey[];
  const loaded = await Promise.all(keys.map((k) => getCollection(k)));
  const byKey = new Map<EntityCollectionKey, (typeof loaded)[number]>();
  keys.forEach((k, i) => byKey.set(k, loaded[i]));

  const nodes = new Map<string, GraphNode>();
  for (const key of keys) {
    for (const entry of byKey.get(key)!) {
      const slug = String(entry.id);
      const id = nodeId(key, slug);
      const data = entry.data as Record<string, unknown>;
      nodes.set(id, {
        id,
        collection: key,
        slug,
        name: entityName({ collection: key, data, id: slug } as any),
        url: entityUrl(key, slug),
        editions: (data.editions as string[]) ?? [],
        spoiler: (data.spoilerLevel ?? 'none') !== 'none',
        degree: 0,
      });
    }
  }

  // One undirected edge per reference; de-duplicate mirrored relationships
  // (e.g. adjacentDomains declared on both ends) by unordered node-pair + label.
  const edges = new Map<string, GraphEdge>();
  for (const key of keys) {
    for (const entry of byKey.get(key)!) {
      const from = nodeId(key, String(entry.id));
      const data = entry.data as Record<string, unknown>;
      for (const spec of REFERENCE_FIELDS[key]) {
        for (const targetSlug of refSlugs(data[spec.field], spec.many)) {
          const to = nodeId(spec.target, targetSlug);
          if (!nodes.has(to) || to === from) continue;
          const pair = [from, to].sort().join('|');
          const dedupeKey = `${pair}|${spec.label}`;
          if (edges.has(dedupeKey)) continue;
          edges.set(dedupeKey, { source: from, target: to, label: spec.label });
          nodes.get(from)!.degree += 1;
          nodes.get(to)!.degree += 1;
        }
      }
    }
  }

  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}
