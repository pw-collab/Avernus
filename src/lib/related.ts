import { getCollection, type CollectionEntry } from 'astro:content';
import {
  ENTITY_COLLECTIONS,
  entityName,
  entityUrl,
  type EntityCollectionKey,
} from './entities';

/**
 * Cross-reference resolution for the "Related entities" / "Appears in" panel.
 *
 * This is deliberately a pure data function that returns a normalized,
 * direction-aware list of relationships. The Phase 5 relationship-graph view is
 * a *rendering* change over this exact output (each RelatedEntity is an edge to
 * a node), not a new data pipeline — see PRD.md §7.5.
 *
 * Relationships are declared once in REFERENCE_FIELDS below. Adding a new
 * reference field to a schema means adding one line here; both the outgoing and
 * incoming panels then populate automatically.
 */

interface RefFieldSpec {
  /** Frontmatter field name holding the reference(s). */
  field: string;
  /** Collection the reference points at. */
  target: EntityCollectionKey;
  /** True if the field is an array of references. */
  many: boolean;
  /** Group heading when shown on the *source* entity (outgoing edge). */
  label: string;
  /** Group heading when shown on the *target* entity (incoming edge). */
  inverseLabel: string;
}

const SOURCES_FIELD: RefFieldSpec = {
  field: 'sources',
  target: 'sources',
  many: true,
  label: 'Appears in',
  inverseLabel: 'Cited by',
};

export const REFERENCE_FIELDS: Record<EntityCollectionKey, RefFieldSpec[]> = {
  domains: [
    { field: 'darklord', target: 'darklords', many: false, label: 'Darklord', inverseLabel: 'Rules' },
    { field: 'adjacentDomains', target: 'domains', many: true, label: 'Adjacent domains', inverseLabel: 'Adjacent domains' },
    SOURCES_FIELD,
  ],
  darklords: [
    { field: 'domain', target: 'domains', many: false, label: 'Domain', inverseLabel: 'Darklord' },
    { field: 'relatedNpcs', target: 'npcs', many: true, label: 'Connected characters', inverseLabel: 'Connected darklord' },
    { field: 'firstAppearance', target: 'sources', many: false, label: 'First appearance', inverseLabel: 'Introduces' },
    SOURCES_FIELD,
  ],
  npcs: [
    { field: 'domain', target: 'domains', many: false, label: 'Domain', inverseLabel: 'Characters' },
    { field: 'relatedDarklord', target: 'darklords', many: false, label: 'Darklord', inverseLabel: 'Connected characters' },
    { field: 'relatedNpcs', target: 'npcs', many: true, label: 'Connected characters', inverseLabel: 'Connected characters' },
    SOURCES_FIELD,
  ],
  locations: [
    { field: 'domain', target: 'domains', many: false, label: 'Domain', inverseLabel: 'Locations' },
    { field: 'inhabitants', target: 'npcs', many: true, label: 'Inhabitants', inverseLabel: 'Found at' },
    SOURCES_FIELD,
  ],
  sources: [],
  artifacts: [
    { field: 'currentLocation', target: 'locations', many: false, label: 'Current location', inverseLabel: 'Artifacts here' },
    { field: 'ownerNpc', target: 'npcs', many: false, label: 'Owner', inverseLabel: 'Carries' },
    { field: 'ownerDarklord', target: 'darklords', many: false, label: 'Owner', inverseLabel: 'Carries' },
    SOURCES_FIELD,
  ],
  timeline: [
    { field: 'relatedDomains', target: 'domains', many: true, label: 'Domains', inverseLabel: 'Timeline' },
    { field: 'relatedNpcs', target: 'npcs', many: true, label: 'Characters', inverseLabel: 'Timeline' },
    { field: 'relatedDarklords', target: 'darklords', many: true, label: 'Darklords', inverseLabel: 'Timeline' },
    SOURCES_FIELD,
  ],
  mechanics: [SOURCES_FIELD],
};

export interface RelatedEntity {
  collection: EntityCollectionKey;
  slug: string;
  name: string;
  url: string;
  /** The relationship as seen from the focus entity, e.g. "Darklord". */
  relationship: string;
  direction: 'outgoing' | 'incoming';
}

export interface RelatedGroup {
  label: string;
  items: RelatedEntity[];
}

/** A resolved reference value is `{ collection, id }` in the content layer. */
function refSlug(value: unknown): string | null {
  if (value && typeof value === 'object') {
    const v = value as { id?: unknown; slug?: unknown };
    if (typeof v.id === 'string') return v.id;
    if (typeof v.slug === 'string') return v.slug;
  }
  return null;
}

function refSlugs(value: unknown, many: boolean): string[] {
  if (many) {
    if (!Array.isArray(value)) return [];
    return value.map(refSlug).filter((s): s is string => s !== null);
  }
  const s = refSlug(value);
  return s ? [s] : [];
}

// Cache all collections once per build so repeated entity pages don't re-read.
type AllCollections = Record<EntityCollectionKey, CollectionEntry<EntityCollectionKey>[]>;
let _all: AllCollections | null = null;

async function loadAll(): Promise<AllCollections> {
  if (_all) return _all;
  const keys = Object.keys(ENTITY_COLLECTIONS) as EntityCollectionKey[];
  const loaded = await Promise.all(keys.map((k) => getCollection(k)));
  _all = Object.fromEntries(keys.map((k, i) => [k, loaded[i]])) as AllCollections;
  return _all;
}

function toRelated(
  entry: { collection: string; id: string; data: Record<string, unknown> },
  relationship: string,
  direction: 'outgoing' | 'incoming',
): RelatedEntity {
  const collection = entry.collection as EntityCollectionKey;
  const slug = String(entry.id);
  return {
    collection,
    slug,
    name: entityName(entry),
    url: entityUrl(collection, slug),
    relationship,
    direction,
  };
}

/**
 * Resolve every entity related to `(collection, slug)` — references it holds
 * (outgoing) and references pointing back at it (incoming) — grouped by
 * relationship label and de-duplicated.
 */
export async function getRelatedEntities(
  collection: EntityCollectionKey,
  slug: string,
): Promise<RelatedGroup[]> {
  const all = await loadAll();
  const focus = all[collection].find((e) => String(e.id) === slug);
  if (!focus) return [];

  const groups = new Map<string, RelatedEntity[]>();
  const seen = new Set<string>(); // `${groupLabel}:${collection}:${slug}`

  const add = (label: string, r: RelatedEntity) => {
    const key = `${label}:${r.collection}:${r.slug}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(r);
  };

  // Outgoing: fields on the focus entity that reference other entities.
  for (const spec of REFERENCE_FIELDS[collection]) {
    const slugs = refSlugs((focus.data as Record<string, unknown>)[spec.field], spec.many);
    for (const targetSlug of slugs) {
      const target = all[spec.target].find((e) => String(e.id) === targetSlug);
      if (target) add(spec.label, toRelated(target, spec.label, 'outgoing'));
    }
  }

  // Incoming: any entity whose reference fields point back at the focus entity.
  for (const otherKey of Object.keys(ENTITY_COLLECTIONS) as EntityCollectionKey[]) {
    for (const spec of REFERENCE_FIELDS[otherKey]) {
      if (spec.target !== collection) continue;
      for (const other of all[otherKey]) {
        if (otherKey === collection && String(other.id) === slug) continue; // no self-edges
        const slugs = refSlugs((other.data as Record<string, unknown>)[spec.field], spec.many);
        if (slugs.includes(slug)) {
          add(spec.inverseLabel, toRelated(other, spec.inverseLabel, 'incoming'));
        }
      }
    }
  }

  // Stable ordering: sources-related groups last, everything else alphabetical.
  return [...groups.entries()]
    .map(([label, items]) => ({
      label,
      items: items.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => {
      const rank = (l: string) => (l === 'Appears in' ? 2 : l === 'Cited by' ? 3 : 1);
      const d = rank(a.label) - rank(b.label);
      return d !== 0 ? d : a.label.localeCompare(b.label);
    });
}
