import { getCollection } from 'astro:content';
import { resolveRef, resolveRefs } from './refs';
import {
  entityName,
  entityUrl,
  ENTITY_COLLECTIONS,
  type EntityCollectionKey,
} from './entities';

/**
 * Lightweight, serializable records for the client-side faceted browse lists.
 * Generated at build time and embedded in each landing page as JSON — this is
 * the "small JSON index" the filter island reads. It intentionally carries only
 * what the list UI needs (no body text; that is Pagefind's job).
 */
export interface BrowseItem {
  name: string;
  url: string;
  entityType: string;
  /** Sub-type within the collection, e.g. domain "cluster" or location "castle". */
  subtype?: string;
  domain?: string;
  editions: string[];
  sources: string[];
  summary?: string;
}

export async function getBrowseItems(
  collection: EntityCollectionKey,
): Promise<BrowseItem[]> {
  const entries = await getCollection(collection);
  const meta = ENTITY_COLLECTIONS[collection];

  const items = await Promise.all(
    entries.map(async (entry) => {
      const d = entry.data as Record<string, any>;
      const slug = String(entry.id);
      const domainRef = d.domain ? await resolveRef(d.domain) : null;
      const sourceRefs =
        collection === 'sources' ? [] : await resolveRefs(d.sources ?? []);

      let subtype: string | undefined;
      if (collection === 'domains' || collection === 'locations') subtype = d.type;
      if (collection === 'sources') subtype = d.sourceType;

      const item: BrowseItem = {
        name: entityName({ collection, data: d, id: slug } as any),
        url: entityUrl(collection, slug),
        entityType: meta.singular,
        subtype,
        domain: domainRef?.name,
        editions: (d.editions ?? []) as string[],
        sources: sourceRefs.map((s) => s.name),
        summary: typeof d.summary === 'string' ? d.summary : undefined,
      };
      return item;
    }),
  );

  return items.sort((a, b) => a.name.localeCompare(b.name));
}
