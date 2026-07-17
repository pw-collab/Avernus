import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Content collections for The Avernus Archives.
 *
 * Every entity is a Markdown/MDX file with YAML frontmatter under
 * `src/content/<collection>/`. Schemas are the single source of truth for the
 * data model (PRD.md §6) and CI fails the build on any violation.
 *
 * Relationships are stored as explicit `reference()` slugs, never only as
 * inline prose links, so a build-time script can derive a nodes/edges graph and
 * per-entity "connections" panels without a graph database. See
 * `src/lib/related.ts` (`getRelatedEntities`) — the Phase 5 graph view is a
 * rendering change over that function, not a data change.
 */

// ---------------------------------------------------------------------------
// Cross-cutting field definitions (PRD.md §6). Every collection carries
// `editions` and `spoilerLevel`; every collection except `sources` also carries
// a required `sources` reference (no uncited facts).
// ---------------------------------------------------------------------------

export const EDITIONS = ['I6', '2e', '3e', '4e', '5e', '2024'] as const;
export type Edition = (typeof EDITIONS)[number];

export const SPOILER_LEVELS = ['none', 'player-safe', 'dm-only'] as const;
export type SpoilerLevel = (typeof SPOILER_LEVELS)[number];

const editions = z.array(z.enum(EDITIONS)).min(1);
const spoilerLevel = z.enum(SPOILER_LEVELS).default('none');
const sourcesRef = z.array(reference('sources')).min(1);

/**
 * Optional per-fact edition annotations. Where canon conflicts across editions,
 * frontmatter can note it here and the entity page renders inline edition tags
 * alongside the fact. Kept generic so any collection can use it.
 */
const editionNotes = z
  .array(
    z.object({
      field: z.string(),
      editions: z.array(z.enum(EDITIONS)).min(1),
      note: z.string(),
    }),
  )
  .default([]);

const md = (base: string) =>
  glob({ pattern: '**/*.{md,mdx}', base: `./src/content/${base}` });

// ---------------------------------------------------------------------------
// Sources / Products — built first because almost everything references it.
// ---------------------------------------------------------------------------

const sources = defineCollection({
  loader: md('sources'),
  schema: () =>
    z.object({
      title: z.string(),
      // Short citation label used in infoboxes and "Appears in" lists.
      abbreviation: z.string().optional(),
      publisher: z.enum(['TSR', 'WotC', 'Arthaus', 'Dark Horse', 'other']),
      year: z.number().int(),
      sourceType: z.enum([
        'boxed set',
        'sourcebook',
        'adventure',
        'novel',
        'netbook',
        'comic',
        'other',
      ]),
      isbn: z.string().optional(),
      summary: z.string().optional(),
      editions,
      spoilerLevel,
    }),
});

// ---------------------------------------------------------------------------
// Domains of Dread
// ---------------------------------------------------------------------------

const domains = defineCollection({
  loader: md('domains'),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      type: z.enum(['cluster', 'island', 'core', 'pocket domain']),
      // The cluster this domain belongs to, for breadcrumb hierarchy
      // (Cluster → Domain → Location). Free text because clusters are a loose
      // grouping, not their own collection in this phase.
      cluster: z.string().optional(),
      darklord: reference('darklords').nullish(),
      genreTrope: z.string(),
      culturalLevel: z.string().optional(),
      mistBorderDescription: z.string().optional(),
      adjacentDomains: z.array(reference('domains')).default([]),
      summary: z.string(),
      editionNotes,
      sources: sourcesRef,
      editions,
      spoilerLevel,
      heroImage: image().optional(),
    }),
});

// ---------------------------------------------------------------------------
// Darklords
// ---------------------------------------------------------------------------

const darklords = defineCollection({
  loader: md('darklords'),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      title: z.string().optional(),
      domain: reference('domains').nullish(),
      origin: z.string().optional(),
      darkGift: z.string().optional(),
      curse: z.string().optional(),
      relatedNpcs: z.array(reference('npcs')).default([]),
      firstAppearance: reference('sources').nullish(),
      summary: z.string(),
      editionNotes,
      sources: sourcesRef,
      editions,
      spoilerLevel,
      heroImage: image().optional(),
    }),
});

// ---------------------------------------------------------------------------
// NPCs / Characters
// ---------------------------------------------------------------------------

const npcs = defineCollection({
  loader: md('npcs'),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      title: z.string().optional(),
      role: z.string(),
      domain: reference('domains').nullish(),
      relatedDarklord: reference('darklords').nullish(),
      // Societies/factions are not their own collection yet (Phase 4); free
      // text keeps them searchable without a dangling reference.
      affiliations: z.array(z.string()).default([]),
      relatedNpcs: z.array(reference('npcs')).default([]),
      summary: z.string(),
      editionNotes,
      sources: sourcesRef,
      editions,
      spoilerLevel,
      heroImage: image().optional(),
    }),
});

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

const locations = defineCollection({
  loader: md('locations'),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      type: z.enum([
        'city',
        'town',
        'village',
        'castle',
        'landmark',
        'building',
        'region',
      ]),
      domain: reference('domains').nullish(),
      inhabitants: z.array(reference('npcs')).default([]),
      // "Sinkhole of Evil" rank — an in-setting measure of a place's malignity.
      sinkholeOfEvilRank: z.string().optional(),
      summary: z.string(),
      editionNotes,
      sources: sourcesRef,
      editions,
      spoilerLevel,
      heroImage: image().optional(),
    }),
});

// ---------------------------------------------------------------------------
// Stub collections — schemas defined now so entity pages, search, and the
// future graph are additive later. No seed content this phase (PRD Phase 4).
// ---------------------------------------------------------------------------

const artifacts = defineCollection({
  loader: md('artifacts'),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      powers: z.string().optional(),
      currentLocation: reference('locations').nullish(),
      ownerNpc: reference('npcs').nullish(),
      ownerDarklord: reference('darklords').nullish(),
      summary: z.string(),
      editionNotes,
      sources: sourcesRef,
      editions,
      spoilerLevel,
      heroImage: image().optional(),
    }),
});

const timeline = defineCollection({
  loader: md('timeline'),
  schema: () =>
    z.object({
      title: z.string(),
      // In-world date as written in the sources (calendars vary by domain).
      inWorldDate: z.string(),
      // Explicit sort key for the timeline (in-world dates are free text and not
      // reliably orderable). Lower sorts earlier.
      order: z.number().default(0),
      realWorldContext: z.string().optional(),
      relatedDomains: z.array(reference('domains')).default([]),
      relatedNpcs: z.array(reference('npcs')).default([]),
      relatedDarklords: z.array(reference('darklords')).default([]),
      summary: z.string(),
      sources: sourcesRef,
      editions,
      spoilerLevel,
    }),
});

const mechanics = defineCollection({
  loader: md('mechanics'),
  schema: () =>
    z.object({
      name: z.string(),
      category: z.enum([
        'fear-horror-madness',
        'powers-check',
        'dark-gift',
        'curse',
        'other',
      ]),
      // Critical legal flag (PRD.md §10): only SRD-safe mechanics may reproduce
      // rules text; WotC-proprietary entries must be described in original prose
      // only. The UI renders these distinctly.
      legalStatus: z.enum(['srd-safe', 'wotc-proprietary']),
      summary: z.string(),
      editionNotes,
      sources: sourcesRef,
      editions,
      spoilerLevel,
    }),
});

export const collections = {
  sources,
  domains,
  darklords,
  npcs,
  locations,
  artifacts,
  timeline,
  mechanics,
};
