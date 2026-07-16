import type { AnyEntry } from './entities';
import { entityName } from './entities';

/**
 * Deterministic, stable slug derived from an entity's display name.
 *
 * Slugs are the public URL identity of an entity (`/domains/barovia`), so they
 * must be stable and collision-free. We keep the on-disk filename as the
 * canonical id (guaranteed unique per collection by the filesystem) and use
 * this function to (a) generate the expected slug from the `name` field and
 * (b) assert that the filename matches it, turning any drift or duplicate into
 * a build-time error rather than a silent overwrite.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    // Strip combining diacritical marks (von Zarovich → von Zarovich, é → e).
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Validate a collection's entries and return them keyed by slug.
 *
 * Throws a descriptive build-time error if:
 *  - two entries resolve to the same slug (collision), or
 *  - an entry's filename id does not match `slugify(name)` (drift).
 *
 * Call this from each collection's `getStaticPaths` so bad data fails the
 * build instead of producing a wrong or overwritten URL.
 */
export function assertUniqueSlugs<T extends AnyEntry>(
  collection: string,
  entries: T[],
): Map<string, T> {
  const bySlug = new Map<string, T>();
  for (const entry of entries) {
    const expected = slugify(entityName(entry));
    const id = String(entry.id);

    if (id !== expected) {
      throw new Error(
        `[slug] In collection "${collection}", file id "${id}" does not match ` +
          `the slug derived from its name ("${entityName(entry)}" → "${expected}"). ` +
          `Rename the file to "${expected}.md"/".mdx" (or fix the name field) so ` +
          `URLs stay stable and derived from the name.`,
      );
    }

    const existing = bySlug.get(expected);
    if (existing) {
      throw new Error(
        `[slug] Slug collision in collection "${collection}": "${expected}" is ` +
          `produced by both "${existing.id}" and "${entry.id}". Slugs must be ` +
          `unique — rename one entity.`,
      );
    }
    bySlug.set(expected, entry);
  }
  return bySlug;
}
