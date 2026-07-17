import type { CollectionEntry } from 'astro:content';

/**
 * Central registry of entity collections and their presentation metadata.
 *
 * Everything that needs to know "what collections exist and how do we label /
 * link them" reads from here: global nav, infoboxes, the related-entities
 * panel, listing pages, search facets, and (later) the graph view. Add a
 * collection once, here, and it flows through the whole UI.
 */

export type EntityCollectionKey =
  | 'domains'
  | 'darklords'
  | 'npcs'
  | 'locations'
  | 'sources'
  | 'artifacts'
  | 'timeline'
  | 'mechanics';

export interface EntityCollectionMeta {
  key: EntityCollectionKey;
  /** Singular human label, e.g. "Darklord". */
  singular: string;
  /** Plural human label, e.g. "Darklords". */
  plural: string;
  /** URL base, e.g. "/darklords". Entity URLs are `${urlBase}/${slug}`. */
  urlBase: string;
  /** schema.org type used for JSON-LD on entity pages. */
  schemaType: string;
  /**
   * Whether this collection currently has seed content and a browsable landing
   * page. Stub collections (Phase 4) are defined in the schema but hidden from
   * nav until populated.
   */
  browsable: boolean;
  /** Short description shown on the collection landing page. */
  blurb: string;
}

export const ENTITY_COLLECTIONS: Record<EntityCollectionKey, EntityCollectionMeta> = {
  domains: {
    key: 'domains',
    singular: 'Domain',
    plural: 'Domains',
    urlBase: '/domains',
    schemaType: 'Place',
    browsable: true,
    blurb: 'The Domains of Dread — prison-realms bounded by the Mists, each shaped by the crime of its Darklord.',
  },
  darklords: {
    key: 'darklords',
    singular: 'Darklord',
    plural: 'Darklords',
    urlBase: '/darklords',
    schemaType: 'Person',
    browsable: true,
    blurb: 'The cursed rulers of the domains, trapped with the very desires they can never fulfil.',
  },
  npcs: {
    key: 'npcs',
    singular: 'Character',
    plural: 'Characters',
    urlBase: '/npcs',
    schemaType: 'Person',
    browsable: true,
    blurb: 'Notable inhabitants, allies, and antagonists who populate the domains.',
  },
  locations: {
    key: 'locations',
    singular: 'Location',
    plural: 'Locations',
    urlBase: '/locations',
    schemaType: 'Place',
    browsable: true,
    blurb: 'Castles, villages, landmarks, and other places of note within the domains.',
  },
  sources: {
    key: 'sources',
    singular: 'Source',
    plural: 'Sources',
    urlBase: '/sources',
    schemaType: 'Book',
    browsable: true,
    blurb: 'The published products every fact in this archive is cited against.',
  },
  artifacts: {
    key: 'artifacts',
    singular: 'Artifact',
    plural: 'Artifacts',
    urlBase: '/artifacts',
    schemaType: 'CreativeWork',
    browsable: true,
    blurb: 'Items of power scattered through the domains — relics, weapons, and cursed things.',
  },
  timeline: {
    key: 'timeline',
    singular: 'Event',
    plural: 'Timeline',
    urlBase: '/timeline',
    schemaType: 'Event',
    browsable: false,
    blurb: 'A filterable history of the Land of the Mists. (Coming in a later phase.)',
  },
  mechanics: {
    key: 'mechanics',
    singular: 'Mechanic',
    plural: 'Mechanics',
    urlBase: '/mechanics',
    schemaType: 'CreativeWork',
    browsable: true,
    blurb: 'Fear, horror, madness, powers checks, and dark gifts — each flagged SRD-safe or WotC-proprietary.',
  },
};

/** Collections that have seed content and appear in global navigation. */
export const BROWSABLE_COLLECTIONS = Object.values(ENTITY_COLLECTIONS).filter(
  (c) => c.browsable,
);

/** Human labels for the mechanics `category` enum (used in infobox + facets). */
export const MECHANIC_CATEGORY_LABELS: Record<string, string> = {
  'fear-horror-madness': 'Fear / Horror / Madness',
  'powers-check': 'Powers check',
  'dark-gift': 'Dark gift',
  curse: 'Curse',
  other: 'Other',
};

/**
 * Node colours for the relationship graph, one distinct hue per collection.
 * A muted ink-and-ember family chosen for legibility on the dark
 * "Candle & Bone" ground (all clear ≥3:1 as large graph marks) and to stay
 * visually distinct from one another.
 */
export const GRAPH_COLORS: Record<EntityCollectionKey, string> = {
  domains: '#b09ab5', // mist violet — the Mists that bound each domain
  darklords: '#e05252', // blood red (accent)
  npcs: '#8fbe9c', // grave green
  locations: '#c9a35c', // tarnished gold
  sources: '#c9bfa8', // parchment
  artifacts: '#d98a66', // ember
  timeline: '#87b3c9', // moonlight blue
  mechanics: '#98939c', // iron grey
};

/** The display name used for an entity across the UI. */
export function entityName(entry: {
  collection: string;
  id?: string;
  data: Record<string, unknown>;
}): string {
  const data = entry.data as { name?: string; title?: string };
  return data.name ?? data.title ?? String(entry.id ?? '');
}

/** Absolute (site-relative) URL for any entity entry. */
export function entityUrl(collection: EntityCollectionKey, slug: string): string {
  return `${ENTITY_COLLECTIONS[collection].urlBase}/${slug}`;
}

export type AnyEntry = CollectionEntry<
  | 'domains'
  | 'darklords'
  | 'npcs'
  | 'locations'
  | 'sources'
  | 'artifacts'
  | 'timeline'
  | 'mechanics'
>;
