# Contributing to The Avernus Archives

Thank you for your interest in improving the archive. This document is a **stub**
covering how to contribute *today*, during the early build phases. The full,
browser-based contribution pipeline is not built yet — see
[Not yet built](#not-yet-built-phase-3) below.

## What we are (and the two hard rules)

The Avernus Archives is a static, git-backed reference for the Ravenloft
campaign setting. Content lives as Markdown/MDX + YAML frontmatter under
`src/content/`, validated by Zod schemas in `src/content.config.ts`.

Two rules are non-negotiable and enforced by review (and, where possible, by the
build):

1. **Original writing only.** Never paste or closely paraphrase published
   Wizards of the Coast text, stat blocks, or scans. Summarize concepts and
   relationships in your own words. When in doubt, write it terser and more
   plainly rather than tracking the source's phrasing. (See `PRD.md` §10.)
2. **Cite your sources.** Every entity must reference at least one entry in the
   `sources` collection via its `sources:` frontmatter field. The build fails on
   uncited entities.

## Local setup

```bash
npm install
npm run dev        # local dev server at http://localhost:4321
npm run build      # static build + Pagefind search index into dist/
npm run preview    # serve the built site (search only works here, not in dev)
```

## Adding or editing an entity

1. Pick the right collection directory under `src/content/`
   (`domains`, `darklords`, `npcs`, `locations`, `sources`).
2. Create a file named for the entity's **slug** — the slug is derived from the
   `name` field, and the build **fails** if the filename doesn't match it (this
   keeps URLs stable and collision-free). For example, a domain named `Barovia`
   must live in `src/content/domains/barovia.mdx`.
3. Fill in the frontmatter. Every collection requires `editions`, at least one
   `sources` reference, and (except `sources`) carries an optional
   `spoilerLevel`. Copy an existing entry as a template.
4. Write the body as original prose in an `.mdx` file. To hide spoilers inline,
   use the `SpoilerWrapper` block — no import needed (it is provided to every
   entity body automatically):

   ```mdx
   <SpoilerWrapper level="dm-only" summary="What the twist is">
     Original description of the spoiler…
   </SpoilerWrapper>
   ```
5. Cross-reference related entities using their slugs (e.g.
   `darklord: strahd-von-zarovich`). References render automatically in the
   infobox and the "Connections" panel.
6. Run `npm run build`. A green build means schemas, slugs, and citations all
   pass. Open a pull request.

## Editing in the browser with Keystatic (Phase 3)

A Keystatic CMS is wired up for local editing. Run the dev server and open the
admin UI — no separate command or account needed:

```bash
npm run dev
# then open http://localhost:4321/keystatic
```

Keystatic edits the same Markdown/MDX files under `src/content/`, using forms
generated from the schema: typed fields, dropdowns for editions and spoiler
levels, relationship pickers for cross-references, and a rich-text body editor
with a Spoiler block. Your edits land in the working tree; commit and open a
pull request as usual. Running `npm run build` afterwards is still the
authoritative check (the Zod schemas validate every entry).

The admin UI runs only during `npm run dev` — the production build stays pure
static (no server), so nothing about the Cloudflare Pages deploy changes. See
`admin/README.md` for the config and the hosted, GitHub-backed "open authoring"
upgrade path (browser edits that open a PR per change for non-technical
contributors).

## Not yet built

The following are **deliberately stubbed** and will land in later phases:

- **Hosted, GitHub-backed authoring.** Keystatic currently runs in local mode
  (dev only). Deploying the admin so non-technical contributors can edit in the
  browser and open a PR per change requires the Cloudflare adapter and a GitHub
  App — see `admin/README.md`.
- **Relationship graph and timeline views** (Phase 5). The data function that
  will feed the graph (`src/lib/related.ts` → `getRelatedEntities`) already
  exists, so that work is additive.
- **Meilisearch/Typesense search backend.** Search currently runs on Pagefind
  (zero-server). The engine sits behind `src/lib/search/` so it can be swapped
  without touching page or component code.

See `PRD.md` §11 for the full phased roadmap.
