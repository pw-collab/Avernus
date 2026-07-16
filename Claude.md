# Build Prompt for Claude Code

## Context to load first

1. Read `README.md` and `PRD.md` in this repo. They define the product, data model, and legal constraints. Treat `PRD.md` §6 (data model) and §10 (legal) as hard requirements, not suggestions.
2. Read `Building a Better Ravenloft Archive.md` for the full reasoning behind the stack choice if anything below is ambiguous.

## Objective

Scaffold a static, git-backed, structured-content wiki for the Ravenloft D&D campaign setting, covering **Phase 1 (Skeleton & schema)** and **Phase 2 (Search & navigation)** from `PRD.md` §11. Do not attempt Phase 3 (CMS) or Phase 5 (graph/timeline) yet — stub clear extension points for them instead.

## Hard constraints (do not deviate without asking)

- **Framework:** Astro v6+ with content collections and Zod schemas. MDX enabled for entity bodies. Static output (`output: 'static'`); islands (React or Svelte — pick one and be consistent) only for search, filters, and future graph/timeline widgets.
- **Content lives in Markdown/MDX + YAML frontmatter** under `src/content/`, never in a database.
- **No verbatim WotC text anywhere**, including in placeholder/seed content. Every seed article must be original summary prose, and every seed entity must cite at least one `sources` entry.
- **Every page** must render the Fan Content Policy disclaimer in the footer:
  > "This site is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC."
- **Hosting target:** Cloudflare Pages. Use the Cloudflare adapter and confirm the build output is compatible (`@astrojs/cloudflare` if SSR-adjacent features are needed; otherwise pure static is fine and preferred).
- **Search:** implement against **Pagefind** first (zero-server, works entirely from the static build) so the MVP has zero infrastructure to run. Structure the search integration behind a small abstraction so it can be swapped for Meilisearch/Typesense later without touching entity page code — see `PRD.md` Open Question on search infra.

## Step 1 — Project scaffold

- Initialize an Astro project (TypeScript strict mode).
- Set up `src/content.config.ts` defining collections for at minimum: `domains`, `darklords`, `npcs`, `locations`, `sources`. (Add `artifacts`, `timeline`, `mechanics` as empty/stub collections with schemas defined but no seed content yet — full population is Phase 4.)
- Every collection schema must include the cross-cutting fields:
  ```ts
  editions: z.array(z.enum(["I6", "2e", "3e", "4e", "5e", "2024"])),
  spoilerLevel: z.enum(["none", "player-safe", "dm-only"]).default("none"),
  sources: z.array(reference("sources")).min(1),
  ```
- Example schema shape for `domains` (mirror this pattern for the other collections using the fields listed in `PRD.md` §6):
  ```ts
  const domains = defineCollection({
    type: "content",
    schema: ({ image, reference }) => z.object({
      name: z.string(),
      type: z.enum(["cluster", "island", "core", "pocket domain"]),
      darklord: reference("darklords").optional(),
      genreTrope: z.string(),
      culturalLevel: z.string().optional(),
      mistBorderDescription: z.string().optional(),
      adjacentDomains: z.array(reference("domains")).default([]),
      sources: z.array(reference("sources")).min(1),
      editions: z.array(z.enum(["I6", "2e", "3e", "4e", "5e", "2024"])),
      spoilerLevel: z.enum(["none", "player-safe", "dm-only"]).default("none"),
      heroImage: image().optional(),
    }),
  });
  ```
- Build `sources` first since almost every other collection references it. Seed at minimum: the *Ravenloft* boxed set / I6 module, *Curse of Strahd* (5e), and *Ravenloft: The Horrors Within* (2026) as source entries.

## Step 2 — Entity page templates

- One dynamic route per collection (e.g. `src/pages/domains/[slug].astro`) rendering:
  - An **infobox** component (shared, parameterized by entity type) showing key typed fields at a glance.
  - Rendered MDX body.
  - An auto-generated **"Related entities" / "Appears in"** panel: resolve every reference field pointing at or from this entity and list them grouped by relationship type. Build this as a reusable function (e.g. `getRelatedEntities(collection, slug)`) since it will later feed the Phase 5 graph view — write it now so that work is just a rendering change, not a data change.
  - **Breadcrumbs** reflecting domain/cluster hierarchy (Cluster → Domain → Location, etc.).
  - **Edition badges** rendered per entity, and inline per-fact edition tags where the frontmatter indicates conflicting canon across editions.
  - A collapsed-by-default **spoiler wrapper** component around any content where `spoilerLevel !== "none"`.
- Add an `entityType` discriminator so the infobox component can adapt its field layout per collection without per-page duplication.

## Step 3 — Navigation & browse

- Global nav: entity-type landing pages (`/domains`, `/darklords`, `/npcs`, `/locations`, `/sources`) each with a filterable/faceted list (facets: edition, domain, entity type where applicable — implement client-side filtering over a small JSON index generated at build time; this does not require the search engine).
- Breadcrumb component reused from Step 2.

## Step 4 — Search

- Generate a search index JSON at build time from all collection frontmatter + body text (title, entity type, domain, editions, excerpt, url).
- Wire up Pagefind against the built site for full-text + typo-tolerant search.
- Build a faceted search UI (facets: entity type, domain, edition, source) as an island component. Keep the query/render logic isolated in one module so swapping the backend to Meilisearch/Typesense later touches only that module.

## Step 5 — SEO & structured data

- `sitemap.xml` via `@astrojs/sitemap`.
- Per-entity JSON-LD (schema.org `Article` or a close fit) injected in `<head>`.
- Clean, stable slugs: `/domains/barovia`, `/darklords/strahd-von-zarovich`, etc. — slugify from the `name` field, and make slug collisions a build-time error, not a silent overwrite.

## Step 6 — Vertical slice seed content

Populate real, complete (non-stub) entries for:
- **Domain:** Barovia
- **Darklord:** Strahd von Zarovich
- **Location:** Castle Ravenloft, Village of Barovia
- **NPCs:** at minimum Ireena Kolyana, Madam Eva, Rudolph van Richten (or equivalents you judge most central — use your judgment, but every one must cross-reference Barovia/Strahd)
- **Sources:** the I6 module, *Curse of Strahd*, *Ravenloft: The Horrors Within*

All content here is **original description written for this project** — summarize concepts and relationships in your own words; do not paraphrase-copy any specific published text closely enough to constitute reproduction. When in doubt about a specific fact's phrasing, favor terser, more clearly original wording over close paraphrase.

## Step 7 — Design system

- Dark, gothic-horror aesthetic appropriate to Ravenloft (restrained, readable — this is a reference site, not a horror-game UI; legibility and fast scanning beat atmosphere if they conflict).
- Respect accessibility: WCAG AA contrast minimum even within a dark theme, keyboard-navigable filters and search, semantic HTML for infoboxes (not div soup).
- Responsive from the start — many users will land on entity pages from mobile search results.

## Definition of done for this build pass

- `npm run build` succeeds with zero Zod schema violations.
- Every seeded entity has ≥1 `sources` reference; zero uncited entities.
- Lighthouse performance score ≥95 on at least one entity page and one listing page.
- Search returns correct, typo-tolerant results for at least "Strahd", "Barovia", and a deliberately misspelled query.
- Fan Content Policy disclaimer renders on every page (spot-check home, an entity page, and a listing page).
- No verbatim WotC text present anywhere in seed content (self-check by re-reading each seeded body against the constraint above).
- A short `CONTRIBUTING.md` stub exists noting that the full contribution pipeline (Decap/Keystatic + editorial workflow) is Phase 3 and not yet built.

## What to explicitly stub, not build, in this pass

- Decap CMS / Keystatic config (Phase 3).
- Relationship graph visualization and Timeline collection UI (Phase 5) — the underlying `getRelatedEntities` data function from Step 2 should make this additive later, not a rewrite.
- Meilisearch/Typesense integration (only build the abstraction layer described in Step 4).

## If anything is ambiguous

Ask rather than guess on: site name/domain (README/PRD use "The Ravenloft Archive" as a placeholder), exact color palette/typography for the gothic theme, and whether React or Svelte is preferred for islands. Everything else in this prompt is intended to be decidable from `PRD.md` directly.
