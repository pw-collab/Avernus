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
4. Write the body as original prose. Use `.mdx` if you want to hide spoilers
   inline:

   ```mdx
   import SpoilerWrapper from '../../components/SpoilerWrapper.astro';

   <SpoilerWrapper level="dm-only" summary="What the twist is">
     Original description of the spoiler…
   </SpoilerWrapper>
   ```
5. Cross-reference related entities using their slugs (e.g.
   `darklord: strahd-von-zarovich`). References render automatically in the
   infobox and the "Connections" panel.
6. Run `npm run build`. A green build means schemas, slugs, and citations all
   pass. Open a pull request.

## Not yet built (Phase 3)

The following are **deliberately stubbed** and will land in later phases:

- **Browser-based CMS** (Decap CMS or Keystatic) with an editorial workflow that
  opens a pull request per edit, so non-technical contributors never touch git
  directly. Config will live under `admin/`. Until then, contribute by editing
  Markdown and opening a PR.
- **Relationship graph and timeline views** (Phase 5). The data function that
  will feed the graph (`src/lib/related.ts` → `getRelatedEntities`) already
  exists, so that work is additive.
- **Meilisearch/Typesense search backend.** Search currently runs on Pagefind
  (zero-server). The engine sits behind `src/lib/search/` so it can be swapped
  without touching page or component code.

See `PRD.md` §11 for the full phased roadmap.
