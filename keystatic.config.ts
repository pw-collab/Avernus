import { config, collection, fields } from '@keystatic/core';
import { wrapper } from '@keystatic/core/content-components';

/**
 * Keystatic CMS configuration (Phase 3).
 *
 * A browser-based editing layer over the SAME Markdown/MDX files under
 * `src/content/`, mirroring the Zod schemas in `src/content.config.ts`. Keystatic
 * never introduces a database — it reads and writes the git-tracked content, so
 * the Zod schemas remain the source of truth and validate every edit at build
 * time.
 *
 * Storage is `local`: the admin UI runs during `astro dev` (see the dev-gated
 * `keystatic()` integration in `astro.config.mjs`) and edits the working tree.
 * Contributors then commit and open a pull request. Switching to hosted,
 * GitHub-backed "open authoring" (PR-per-edit for non-technical contributors) is
 * a change to `storage` here plus adding the Cloudflare adapter — see
 * `admin/README.md`. No entity-page or component code depends on this file.
 *
 * Notes on field mapping:
 *  - `fields.slug` derives the filename from the `name`/`title` field, matching
 *    the build-time slug guard (slug is derived from the name).
 *  - Image fields are intentionally omitted for now; without co-located assets
 *    Keystatic stores flat `{slug}.mdx` files, matching the existing layout.
 *    `heroImage` stays code-authored until image handling is wired up.
 */

const EDITION_OPTIONS = [
  { label: 'I6 (1983 module)', value: 'I6' },
  { label: 'AD&D 2e', value: '2e' },
  { label: '3e / d20', value: '3e' },
  { label: '4e', value: '4e' },
  { label: '5e', value: '5e' },
  { label: '2024', value: '2024' },
];

const editionsField = fields.multiselect({
  label: 'Editions',
  description: 'Which editions this entry is canon in (at least one).',
  options: EDITION_OPTIONS,
});

const spoilerField = fields.select({
  label: 'Spoiler level',
  options: [
    { label: 'None', value: 'none' },
    { label: 'Player-safe', value: 'player-safe' },
    { label: 'DM-only', value: 'dm-only' },
  ],
  defaultValue: 'none',
});

const sourcesField = fields.array(
  fields.relationship({ label: 'Source', collection: 'sources' }),
  {
    label: 'Sources',
    description: 'Every entry must cite at least one source.',
    itemLabel: (props) => props.value ?? 'Source',
  },
);

const editionNotesField = fields.array(
  fields.object({
    field: fields.text({ label: 'Field', validation: { length: { min: 1 } } }),
    editions: fields.multiselect({ label: 'Editions', options: EDITION_OPTIONS }),
    note: fields.text({ label: 'Note', multiline: true }),
  }),
  {
    label: 'Edition notes',
    description: 'Per-fact notes where canon differs across editions.',
    itemLabel: (props) => props.fields.field.value || 'Edition note',
  },
);

const bodyField = fields.mdx({
  label: 'Body',
  description: 'The article. Use the Spoiler block to hide DM-facing content.',
  components: {
    SpoilerWrapper: wrapper({
      label: 'Spoiler',
      description: 'Collapsed-by-default spoiler region.',
      schema: {
        level: fields.select({
          label: 'Level',
          options: [
            { label: 'Player-safe', value: 'player-safe' },
            { label: 'DM-only', value: 'dm-only' },
          ],
          defaultValue: 'dm-only',
        }),
        summary: fields.text({ label: 'Summary (what is hidden)' }),
      },
    }),
  },
});

const requiredText = (label: string, multiline = false) =>
  fields.text({ label, multiline, validation: { length: { min: 1 } } });

export default config({
  storage: { kind: 'local' },
  ui: {
    brand: { name: 'The Avernus Archives' },
  },
  collections: {
    sources: collection({
      label: 'Sources',
      slugField: 'title',
      path: 'src/content/sources/*',
      format: { contentField: 'body' },
      entryLayout: 'content',
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        abbreviation: fields.text({ label: 'Abbreviation' }),
        publisher: fields.select({
          label: 'Publisher',
          options: [
            { label: 'TSR', value: 'TSR' },
            { label: 'Wizards of the Coast', value: 'WotC' },
            { label: 'Arthaus', value: 'Arthaus' },
            { label: 'Dark Horse', value: 'Dark Horse' },
            { label: 'Other', value: 'other' },
          ],
          defaultValue: 'WotC',
        }),
        year: fields.integer({ label: 'Year' }),
        sourceType: fields.select({
          label: 'Type',
          options: [
            { label: 'Boxed set', value: 'boxed set' },
            { label: 'Sourcebook', value: 'sourcebook' },
            { label: 'Adventure', value: 'adventure' },
            { label: 'Novel', value: 'novel' },
            { label: 'Netbook', value: 'netbook' },
            { label: 'Comic', value: 'comic' },
            { label: 'Other', value: 'other' },
          ],
          defaultValue: 'sourcebook',
        }),
        isbn: fields.text({ label: 'ISBN' }),
        summary: fields.text({ label: 'Summary', multiline: true }),
        editions: editionsField,
        spoilerLevel: spoilerField,
        body: bodyField,
      },
    }),

    domains: collection({
      label: 'Domains',
      slugField: 'name',
      path: 'src/content/domains/*',
      format: { contentField: 'body' },
      entryLayout: 'content',
      schema: {
        name: fields.slug({ name: { label: 'Name' } }),
        type: fields.select({
          label: 'Type',
          options: [
            { label: 'Cluster', value: 'cluster' },
            { label: 'Island', value: 'island' },
            { label: 'Core', value: 'core' },
            { label: 'Pocket domain', value: 'pocket domain' },
          ],
          defaultValue: 'core',
        }),
        cluster: fields.text({ label: 'Cluster' }),
        darklord: fields.relationship({ label: 'Darklord', collection: 'darklords' }),
        genreTrope: requiredText('Genre / trope'),
        culturalLevel: fields.text({ label: 'Cultural level' }),
        mistBorderDescription: fields.text({ label: 'Mist border description', multiline: true }),
        adjacentDomains: fields.array(
          fields.relationship({ label: 'Adjacent domain', collection: 'domains' }),
          { label: 'Adjacent domains', itemLabel: (props) => props.value ?? 'Domain' },
        ),
        summary: requiredText('Summary', true),
        editionNotes: editionNotesField,
        sources: sourcesField,
        editions: editionsField,
        spoilerLevel: spoilerField,
        body: bodyField,
      },
    }),

    darklords: collection({
      label: 'Darklords',
      slugField: 'name',
      path: 'src/content/darklords/*',
      format: { contentField: 'body' },
      entryLayout: 'content',
      schema: {
        name: fields.slug({ name: { label: 'Name' } }),
        title: fields.text({ label: 'Title / epithet' }),
        domain: fields.relationship({ label: 'Domain', collection: 'domains' }),
        origin: fields.text({ label: 'Origin', multiline: true }),
        darkGift: fields.text({ label: 'Dark gift', multiline: true }),
        curse: fields.text({ label: 'Curse / torment', multiline: true }),
        relatedNpcs: fields.array(
          fields.relationship({ label: 'Character', collection: 'npcs' }),
          { label: 'Connected characters', itemLabel: (props) => props.value ?? 'Character' },
        ),
        firstAppearance: fields.relationship({ label: 'First appearance', collection: 'sources' }),
        summary: requiredText('Summary', true),
        editionNotes: editionNotesField,
        sources: sourcesField,
        editions: editionsField,
        spoilerLevel: spoilerField,
        body: bodyField,
      },
    }),

    npcs: collection({
      label: 'Characters',
      slugField: 'name',
      path: 'src/content/npcs/*',
      format: { contentField: 'body' },
      entryLayout: 'content',
      schema: {
        name: fields.slug({ name: { label: 'Name' } }),
        title: fields.text({ label: 'Title / epithet' }),
        role: requiredText('Role'),
        domain: fields.relationship({ label: 'Domain', collection: 'domains' }),
        relatedDarklord: fields.relationship({ label: 'Darklord', collection: 'darklords' }),
        affiliations: fields.array(fields.text({ label: 'Affiliation' }), {
          label: 'Affiliations',
          itemLabel: (props) => props.value || 'Affiliation',
        }),
        relatedNpcs: fields.array(
          fields.relationship({ label: 'Character', collection: 'npcs' }),
          { label: 'Connected characters', itemLabel: (props) => props.value ?? 'Character' },
        ),
        summary: requiredText('Summary', true),
        editionNotes: editionNotesField,
        sources: sourcesField,
        editions: editionsField,
        spoilerLevel: spoilerField,
        body: bodyField,
      },
    }),

    locations: collection({
      label: 'Locations',
      slugField: 'name',
      path: 'src/content/locations/*',
      format: { contentField: 'body' },
      entryLayout: 'content',
      schema: {
        name: fields.slug({ name: { label: 'Name' } }),
        type: fields.select({
          label: 'Type',
          options: [
            { label: 'City', value: 'city' },
            { label: 'Town', value: 'town' },
            { label: 'Village', value: 'village' },
            { label: 'Castle', value: 'castle' },
            { label: 'Landmark', value: 'landmark' },
            { label: 'Building', value: 'building' },
            { label: 'Region', value: 'region' },
          ],
          defaultValue: 'landmark',
        }),
        domain: fields.relationship({ label: 'Domain', collection: 'domains' }),
        inhabitants: fields.array(
          fields.relationship({ label: 'Inhabitant', collection: 'npcs' }),
          { label: 'Notable inhabitants', itemLabel: (props) => props.value ?? 'Character' },
        ),
        sinkholeOfEvilRank: fields.text({ label: 'Sinkhole of Evil rank', multiline: true }),
        summary: requiredText('Summary', true),
        editionNotes: editionNotesField,
        sources: sourcesField,
        editions: editionsField,
        spoilerLevel: spoilerField,
        body: bodyField,
      },
    }),

    // --- Stub collections (Phase 4). Schemas mirror src/content.config.ts so
    // they are editable in the CMS the moment content is added. ---

    artifacts: collection({
      label: 'Artifacts',
      slugField: 'name',
      path: 'src/content/artifacts/*',
      format: { contentField: 'body' },
      entryLayout: 'content',
      schema: {
        name: fields.slug({ name: { label: 'Name' } }),
        powers: fields.text({ label: 'Powers', multiline: true }),
        currentLocation: fields.relationship({ label: 'Current location', collection: 'locations' }),
        ownerNpc: fields.relationship({ label: 'Owner (character)', collection: 'npcs' }),
        ownerDarklord: fields.relationship({ label: 'Owner (darklord)', collection: 'darklords' }),
        summary: requiredText('Summary', true),
        editionNotes: editionNotesField,
        sources: sourcesField,
        editions: editionsField,
        spoilerLevel: spoilerField,
        body: bodyField,
      },
    }),

    timeline: collection({
      label: 'Timeline',
      slugField: 'title',
      path: 'src/content/timeline/*',
      format: { contentField: 'body' },
      entryLayout: 'content',
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        inWorldDate: requiredText('In-world date'),
        realWorldContext: fields.text({ label: 'Real-world context' }),
        relatedDomains: fields.array(
          fields.relationship({ label: 'Domain', collection: 'domains' }),
          { label: 'Related domains', itemLabel: (props) => props.value ?? 'Domain' },
        ),
        relatedNpcs: fields.array(
          fields.relationship({ label: 'Character', collection: 'npcs' }),
          { label: 'Related characters', itemLabel: (props) => props.value ?? 'Character' },
        ),
        relatedDarklords: fields.array(
          fields.relationship({ label: 'Darklord', collection: 'darklords' }),
          { label: 'Related darklords', itemLabel: (props) => props.value ?? 'Darklord' },
        ),
        summary: requiredText('Summary', true),
        sources: sourcesField,
        editions: editionsField,
        spoilerLevel: spoilerField,
        body: bodyField,
      },
    }),

    mechanics: collection({
      label: 'Mechanics',
      slugField: 'name',
      path: 'src/content/mechanics/*',
      format: { contentField: 'body' },
      entryLayout: 'content',
      schema: {
        name: fields.slug({ name: { label: 'Name' } }),
        category: fields.select({
          label: 'Category',
          options: [
            { label: 'Fear / horror / madness', value: 'fear-horror-madness' },
            { label: 'Powers check', value: 'powers-check' },
            { label: 'Dark gift', value: 'dark-gift' },
            { label: 'Curse', value: 'curse' },
            { label: 'Other', value: 'other' },
          ],
          defaultValue: 'other',
        }),
        legalStatus: fields.select({
          label: 'Legal status',
          description: 'SRD-safe content may reproduce rules text; WotC-proprietary must be original prose only.',
          options: [
            { label: 'SRD-safe', value: 'srd-safe' },
            { label: 'WotC-proprietary', value: 'wotc-proprietary' },
          ],
          defaultValue: 'wotc-proprietary',
        }),
        summary: requiredText('Summary', true),
        editionNotes: editionNotesField,
        sources: sourcesField,
        editions: editionsField,
        spoilerLevel: spoilerField,
        body: bodyField,
      },
    }),
  },
});
