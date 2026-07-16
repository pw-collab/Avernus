import { getCollection } from 'astro:content';
import { assertUniqueSlugs } from './slug';
import {
  ENTITY_COLLECTIONS,
  entityName,
  entityUrl,
  type EntityCollectionKey,
} from './entities';

/**
 * Shared `getStaticPaths` builder for entity routes. Loads the collection,
 * runs the build-time slug/collision guard, and emits one path per entry.
 */
export async function buildEntityPaths(collection: EntityCollectionKey) {
  const entries = await getCollection(collection);
  // Throws at build time on slug drift or collision.
  assertUniqueSlugs(collection, entries as any);
  return entries.map((entry) => ({
    params: { slug: String(entry.id) },
    props: { entry },
  }));
}

/** Per-entity schema.org JSON-LD object (injected into <head>). */
export function buildJsonLd(
  collection: EntityCollectionKey,
  entry: { id: string; data: Record<string, unknown> },
  site: URL | string | undefined,
): Record<string, unknown> {
  const meta = ENTITY_COLLECTIONS[collection];
  const name = entityName({ collection, data: entry.data, id: entry.id } as any);
  const path = entityUrl(collection, String(entry.id));
  const url = site ? new URL(path, site).href : path;
  const summary = (entry.data as { summary?: string }).summary;

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': meta.schemaType,
    name,
    url,
    isPartOf: {
      '@type': 'WebSite',
      name: 'The Avernus Archives',
    },
  };
  if (summary) schema.description = summary;
  if (collection === 'sources') {
    const d = entry.data as { year?: number; isbn?: string; publisher?: string };
    if (d.year) schema.datePublished = String(d.year);
    if (d.isbn) schema.isbn = d.isbn;
    if (d.publisher) schema.publisher = { '@type': 'Organization', name: d.publisher };
  }
  return schema;
}
