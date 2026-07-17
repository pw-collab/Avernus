# The Avernus Archives

A fast, structured, community-editable knowledge base for the **Ravenloft** Dungeons & Dragons campaign setting — built to surpass Mistipedia on speed, search, design, and data quality.

> **Unofficial Fan Content** permitted under Wizards of the Coast's Fan Content Policy. Not approved or endorsed by Wizards of the Coast. Portions of the materials used are property of Wizards of the Coast LLC. © Wizards of the Coast LLC.

This repository is based on the findings in [`Building a Better Ravenloft Archive.md`](./Building%20a%20Better%20Ravenloft%20Archive.md), a technical research report comparing Mistipedia (the incumbent Fraternity of Shadows wiki) against modern static-site, headless-CMS, and graph-database approaches.

---

## Why this exists

Mistipedia — the largest existing Ravenloft fan wiki — runs on a default-skin MediaWiki 1.43 install seeded years ago with placeholder "WIKISEED" stubs that never got finished. It has no faceted search, no relationship graph, no typed data, and visible duplicate/stub content. Meanwhile, 2026 is a renewed high-attention year for Ravenloft (*Ravenloft: The Horrors Within* sourcebook, Dark Horse comic series), which means growing search demand and a growing corpus with nowhere good to live.

There is no existing Ravenloft resource that combines completeness, modern search, polished design, and structured, cross-referenced data. This project fills that gap.

## What this is

- A **static-first, git-backed wiki**, not a database-backed CMS or traditional MediaWiki.
- Content lives as **Markdown/MDX + YAML frontmatter**, validated by **Zod schemas**, in this git repo.
- Every entity (Darklord, Domain, NPC, Location, Artifact, etc.) is **typed and cross-referenced**, so relationships (Darklord → Domain → Cluster → NPC → Artifact) are structured data, not just prose links.
- Contribution happens through **pull requests** (via a git-based CMS with an editorial workflow), giving moderation and version history for free.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Site framework | [Astro](https://astro.build) (v6+), content collections, MDX | Zero-JS-by-default, schema-validated frontmatter, best-in-class meta-framework satisfaction |
| Content store | Markdown/MDX + YAML frontmatter in this git repo | Free version history, diffs, branch-based review, no DB to run |
| Contribution CMS | [Decap CMS](https://decapcms.org) or [Keystatic](https://keystatic.com) | Browser-based editing, PR-per-edit ("editorial workflow"), open authoring for non-collaborators |
| Search | [Meilisearch](https://www.meilisearch.com) or [Typesense](https://typesense.org) (fallback: [Pagefind](https://pagefind.app) if traffic is small) | Sub-50ms, typo-tolerant, faceted, self-hostable and free |
| Hosting | [Cloudflare Pages](https://pages.cloudflare.com) | Unlimited bandwidth on the free tier, 330+ edge locations |
| Relationship graph | Build-time nodes/edges JSON derived from frontmatter cross-references | Graph UX without operating a graph database |

## Repo structure (planned)

```
/
├── src/
│   ├── content/              # Markdown/MDX entity data, one collection per entity type
│   │   ├── domains/
│   │   ├── darklords/
│   │   ├── npcs/
│   │   ├── locations/
│   │   ├── artifacts/
│   │   ├── timeline/
│   │   ├── mechanics/
│   │   └── sources/
│   ├── content.config.ts     # Zod schemas for every collection
│   ├── layouts/               # Entity page templates + infobox components
│   ├── components/            # Search box, relationship graph, filters (islands)
│   └── pages/
├── public/
├── admin/                     # Decap/Keystatic config
├── PRD.md
├── CLAUDE_CODE_BUILD_PROMPT.md
├── Building a Better Ravenloft Archive.md   # original research
└── README.md
```

## Documents in this repo

- **[`Building a Better Ravenloft Archive.md`](./Building%20a%20Better%20Ravenloft%20Archive.md)** — the original research report. Read this first for the full reasoning behind every decision below.
- **[`PRD.md`](./PRD.md)** — product requirements: goals, users, data model, phased roadmap, legal constraints, success metrics.
- **[`CLAUDE_CODE_BUILD_PROMPT.md`](./CLAUDE_CODE_BUILD_PROMPT.md)** — a ready-to-paste prompt for Claude Code to scaffold the project end to end.

## Getting started

Implemented so far: the skeleton, schema, entity templates, faceted navigation,
and search (Phases 1–2); a local Keystatic CMS (Phase 3); and the interactive
relationship graph (Phase 5). The site is a static Astro build with client-side
Pagefind search — no server or database to run.

```bash
npm install
npm run dev        # local dev server at http://localhost:4321
                   #   → browse /, edit content at /keystatic, explore /graph
npm run build      # static build + Pagefind search index into dist/
npm run preview    # serve the built site (search only works against the build)
```

Deployment target is Cloudflare Pages (build command `npm run build`, output
`dist`). See [`docs/hosting.md`](./docs/hosting.md). Highlights:

- **Search** runs on Pagefind, behind a small abstraction (`src/lib/search/`) so
  it can be swapped for Meilisearch/Typesense later without touching page code.
- **Editing** uses [Keystatic](https://keystatic.com) in local mode (dev only);
  the production build stays pure static. See [`admin/README.md`](./admin/README.md).
- **The relationship graph** at `/graph` is derived at build time from the same
  frontmatter references that power each entity's "Connections" panel; entity
  pages themselves ship zero JavaScript.

To contribute content, see [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Content model at a glance

Domains of Dread, Darklords, NPCs/Characters, Locations, Artifacts/Items, Timeline/History, Mechanics/Rules, and Sources/Products are each a first-class, typed collection with an infobox and explicit cross-references. **Edition** (I6 / AD&D 2e / 3e d20 / 4e / 5e / 2024) is a facet on everything, and **spoiler flags** are baked into the schema per section. Full field-level schemas are in `PRD.md`.

## Build order

1. **Phase 0 — Legal & scope.** Disclaimer, non-commercial model, lawyer review, contributor licensing.
2. **Phase 1 — Skeleton & schema.** Astro project, collection schemas, entity templates. Seed with a complete Barovia + Strahd vertical slice as the quality bar.
3. **Phase 2 — Search & navigation.** Meilisearch/Typesense, faceted filters, breadcrumbs, related-entity panels.
4. **Phase 3 — Contribution pipeline.** Decap/Keystatic, editorial-workflow PRs, contributor guidelines, branch protection.
5. **Phase 4 — Migrate & backfill.** Domain-by-domain content, original writing only, de-duplicated.
6. **Phase 5 — Graph & polish.** Relationship graph, timeline view, JSON-LD, gothic-horror theming.
7. **Phase 6 — Community growth.** Recruit contributors; consider collaborating with the Fraternity of Shadows rather than competing.

Full detail on each phase is in `PRD.md` §11.

## Legal notice

Ravenloft-specific lore (Strahd, Barovia, the Vistani, Darklords, domain names, etc.) is Wizards of the Coast IP, usable here only under WotC's **Fan Content Policy** — not the OGL or the Creative Commons SRD. That means: **free and non-paywalled, always**; **no verbatim reproduction** of WotC text (this archive contains original summaries/descriptions, never scans or copy-paste); and the disclaimer above must appear on every page. See `PRD.md` §10 for the full legal requirements checklist. **This is not legal advice — get a lawyer's review before public launch.**

## License

- **Code**: to be decided (suggest MIT).
- **Original contributor writing**: to be decided (suggest CC-BY-SA to keep the archive open, matching the norm for fan wikis).
- **Ravenloft IP**: remains © Wizards of the Coast LLC, used under the Fan Content Policy.
