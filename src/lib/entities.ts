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
    browsable: false,
    blurb: 'Items of power scattered through the domains. (Coming in a later phase.)',
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
    browsable: false,
    blurb: 'Fear, horror, madness, powers checks, and dark gifts. (Coming in a later phase.)',
  },
};

/** Collections that have seed content and appear in global navigation. */
export const BROWSABLE_COLLECTIONS = Object.values(ENTITY_COLLECTIONS).filter(
  (c) => c.browsable,
);

/**
 * Node colours for the relationship graph, one distinct hue per collection.
 * Chosen for legibility on the dark "Mist & Slate" ground (all clear ≥3:1 as
 * large graph marks) and to stay visually distinct from one another.
 */
export const GRAPH_COLORS: Record<EntityCollectionKey, string> = {
  domains: '#bcace8', // lavender (accent)
  darklords: '#e59a9a', // crimson
  npcs: '#93c9a9', // green
  locations: '#e0c27a', // amber
  sources: '#8fb2d6', // slate blue
  artifacts: '#d9a3cf', // pink
  timeline: '#7fd4d0', // teal
  mechanics: '#b7b7c9', // grey
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
