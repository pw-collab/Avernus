import { getEntry } from 'astro:content';
import {
  entityName,
  entityUrl,
  type EntityCollectionKey,
} from './entities';

export interface ResolvedRef {
  name: string;
  url: string;
  collection: EntityCollectionKey;
  slug: string;
}

/** A reference value as stored in frontmatter: `{ collection, id }`. */
export type ReferenceValue = { collection: string; id: string } | undefined | null;

/** Resolve a single reference to display data, or null if unset/missing. */
export async function resolveRef(ref: ReferenceValue): Promise<ResolvedRef | null> {
  if (!ref || typeof ref !== 'object') return null;
  const entry = await getEntry(ref.collection as EntityCollectionKey, ref.id);
  if (!entry) return null;
  const collection = ref.collection as EntityCollectionKey;
  const slug = String(entry.id);
  return {
    name: entityName(entry),
    url: entityUrl(collection, slug),
    collection,
    slug,
  };
}

/** Resolve an array of references, dropping any that fail to resolve. */
export async function resolveRefs(refs: ReferenceValue[]): Promise<ResolvedRef[]> {
  const out = await Promise.all((refs ?? []).map(resolveRef));
  return out.filter((r): r is ResolvedRef => r !== null);
}
