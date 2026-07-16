# Product Requirements Document: The Ravenloft Archive

**Status:** Draft v1.0
**Date:** 2026-07-16
**Owner:** Pedro (solo founder/developer)
**Source material:** [`Building a Better Ravenloft Archive.md`](./Building%20a%20Better%20Ravenloft%20Archive.md) — treat that document as the research appendix behind every decision below.

---

## 1. Problem Statement

Ravenloft is one of D&D's most beloved settings, but its best-known fan archive, **Mistipedia**, under-delivers:

- Seeded years ago from placeholder "WIKISEED" stubs that were never finished — incompleteness is baked into its history, not incidental.
- Default MediaWiki 1.43 search: prefix-matching only, no typo tolerance, no facets.
- Category-paginated navigation with no relationship graph or visual browsing.
- Visible data-hygiene issues (near-duplicate entries like "Doppelganger Golem" / "Doppleganger Golem, The").
- A dark MonoBook skin its own admin has called dated.
- Server-rendered PHP on shared hosting, prone to rate-limiting under load.

No existing Ravenloft resource (Mistipedia, the Ravenloft Fandom wiki, the Fraternity of Shadows main site) combines **completeness + modern search + polished design + structured, cross-referenced data**. That combination is the opportunity.

**Timing:** 2026 is a high-attention year for Ravenloft — *Ravenloft: The Horrors Within* (wide release June 16, 2026) and the Dark Horse *Dungeons & Dragons: Ravenloft* comic (issue #1, August 19, 2026) mean renewed search traffic and a growing corpus that currently has nowhere good to live.

## 2. Goals

1. Ship an archive that is measurably faster, better organized, and better searchable than Mistipedia.
2. Model Ravenloft as **structured, typed, interlinked entities**, not flat wiki prose — this is the core differentiator.
3. Make contribution easy enough for non-technical fans while keeping quality gates (PR review) that plain wikis lack.
4. Operate at near-zero hosting cost, sustainable by a solo maintainer.
5. Stay legally compliant with WotC's Fan Content Policy from day one.

### Non-goals (v1)

- Real-time multi-editor collaborative editing (would require a Payload/database backend — out of scope unless usage patterns force a pivot; see §12).
- Hosting or redistributing verbatim WotC rules text, stat blocks, or scanned book content.
- Paywalled or ad-gated access to any lore content (permitted only under a free model per the Fan Content Policy).
- Full graph-database infrastructure (Neo4j) — a derived, build-time graph view is sufficient for v1.
- Mobile native apps.

## 3. Target Users

| Persona | Need | Primary surface |
|---|---|---|
| **Casual reader** | Look up a Darklord, domain, or NPC quickly, get an accurate, well-organized answer | Entity pages, search |
| **DM prepping a session** | Find everything connected to a domain/NPC across editions, with spoilers controllable | Relationship panels, spoiler toggles, edition facet |
| **Lore completionist** | Browse deeply, follow the web of connections, explore the timeline | Relationship graph, timeline view, faceted browse |
| **Contributor/editor** | Add or correct an entry without learning git internals, get feedback via review | CMS (Decap/Keystatic), PR workflow |
| **Power contributor** | Batch-edit Markdown directly, manage schemas | Direct repo access |

## 4. Success Metrics

- **Speed:** Lighthouse performance score ≥ 95 on entity pages (Astro's static output should make this close to automatic).
- **Search:** Faceted, typo-tolerant search returning results in <100ms server-side.
- **Completeness (vertical slice):** 100% of core Barovia-cluster entities (Strahd, Castle Ravenloft, Village of Barovia, core NPCs, core sources) fully populated — not stubs — before wider backfill begins.
- **Data quality:** Zero schema-validation failures in CI; zero known duplicate entities in the launched slice.
- **Contribution health:** Time from PR submission to merge/feedback under 1 week during active phases.
- **Adoption:** Organic search impressions and community referrals (Reddit r/ravenloft, r/CurseofStrahd, FoS forums) trending up quarter over quarter post-launch.

## 5. Scope

### MVP (Phases 0–2, see §11)
- Astro site with typed content collections for Domains, Darklords, NPCs, Locations, Sources (minimum viable entity set).
- Entity page templates with infoboxes and cross-reference rendering.
- Complete Barovia + Strahd + Castle Ravenloft vertical slice.
- Faceted, instant search (Meilisearch/Typesense, or Pagefind if traffic is low — see Open Questions).
- Cloudflare Pages deployment.

### v1.1+ (Phases 3–6)
- Decap/Keystatic contribution pipeline with editorial-workflow PRs.
- Full entity set: Artifacts, Timeline, Mechanics, expanded Sources.
- Relationship graph view and timeline view.
- JSON-LD structured data, sitemap, gothic-horror visual theming.
- Community recruitment and possible Fraternity of Shadows collaboration.

## 6. Information Architecture & Data Model

Each entity type below is a first-class Astro content collection with a Zod-validated frontmatter schema. All entities carry two cross-cutting fields: **`editions`** (I6, AD&D 2e, 3e d20, 4e, 5e, 2024 — multi-select, since canon shifts by edition) and **`spoilerLevel`** (per-section spoiler toggles, matching Mistipedia's existing DM-spoiler convention).

| Collection | Key fields |
|---|---|
| **Domains of Dread** | name, type (cluster / island / core / pocket domain), darklord (ref), genre/gothic trope, cultural level, mist border description, adjacent domains (refs), sources (refs), editions |
| **Darklords** | name, domain (ref), origin, dark gift, curse/torment, related NPCs (refs), first appearance (source ref), editions |
| **NPCs / Characters** | name, domain (ref), affiliations/societies (refs), role, editions, sources (refs) |
| **Locations** | type (city / castle / landmark), domain (ref), inhabitants (refs), "Sinkhole of Evil" rank, sources (refs) |
| **Artifacts / Items** | name, powers, current location/owner (refs), sources (refs) |
| **Timeline / History** | in-world date, real-world edition context, related domains/NPCs (refs) — rendered as a filterable timeline |
| **Mechanics / Rules** | edition, category (fear/horror/madness, powers checks, dark gifts), source, **OGL/SRD-safe vs. WotC-proprietary flag** (critical for legal compliance) |
| **Sources / Products** | title, publisher (TSR/WotC/Arthaus), edition, year, type (sourcebook/novel/adventure/netbook), ISBN — every fact in the archive must cite one |

**Design principle:** relationships are stored as explicit frontmatter references (slugs), not just inline Markdown links, so a build-time script can derive a nodes/edges graph and per-entity "connections" panels without a graph database.

## 7. Functional Requirements

### 7.1 Content collections & schema validation
- Zod schema per collection; CI build fails on schema violations.
- Every entity requires at least one `sources` reference (no uncited facts).

### 7.2 Entity pages
- Consistent infobox component per entity type (name/type at top, key fields, thumbnail if available).
- Automatic "related entities" / "what links here" panel derived from cross-references.
- Breadcrumb navigation reflecting domain/cluster hierarchy.
- Per-section spoiler toggle (collapsed by default for DM-facing spoiler content).
- Edition badge(s) shown per entity and per conflicting fact where canon differs across editions.

### 7.3 Search & navigation
- Instant, typo-tolerant, faceted search (facets: entity type, domain, edition, source).
- Index rebuilt from frontmatter at deploy time.
- Category/hierarchical browse as a fallback to search.

### 7.4 Contribution pipeline
- Browser-based CMS (Decap or Keystatic) writing to Markdown/MDX, opening a PR per edit ("editorial workflow").
- "Open authoring" support so non-collaborators can submit via fork+PR without a repo invite.
- Branch protection: nothing publishes without at least one review.
- Contributor-facing style guide and entity templates (Phase 3 deliverable).

### 7.5 Relationship graph
- Build-time script parses frontmatter refs into nodes/edges JSON.
- Interactive force-directed graph view; also power the "connections" panel on entity pages.

### 7.6 Timeline
- Filterable by domain, edition, and NPC/entity involvement.

### 7.7 SEO & structured data
- Static HTML output, sitemap.xml, per-entity JSON-LD (schema.org).
- Clean, stable URLs per entity (`/domains/barovia`, `/darklords/strahd-von-zarovich`).

### 7.8 Legal/compliance features (functional, not just policy)
- Site-wide footer/disclaimer component rendering the Fan Content Policy notice on every page.
- Mechanics collection must flag OGL/SRD-safe content vs. WotC-proprietary content distinctly in the UI.
- No feature may gate lore content behind payment (ads/donations are fine).

## 8. Technical Architecture

| Layer | Choice | Rationale (see research doc for full comparison) |
|---|---|---|
| Framework | Astro v6+, content collections, MDX, islands for interactive bits (search, graph, filters) | Zero-JS-by-default static output; type-safe frontmatter via Zod; leads meta-framework satisfaction surveys |
| Content store | Markdown/MDX + YAML frontmatter, git-versioned | Free history/diffs/branch review, no DB to operate |
| CMS | Decap CMS or Keystatic | Git-based editorial workflow + open authoring |
| Search | Meilisearch or Typesense (self-hosted); Pagefind as a no-server fallback if traffic stays low | Sub-50ms, typo-tolerant, free, self-hostable |
| Hosting | Cloudflare Pages | Unlimited bandwidth on free tier; Pro tier $5/mo if more builds are needed |
| Graph | Build-time nodes/edges JSON from frontmatter, not a live graph DB | Graph UX without operating Neo4j |

**Explicitly rejected for the core:** self-hosted MediaWiki (inherits Mistipedia's exact problems), a full headless-CMS+database stack (Payload/Directus/Sanity — overkill unless real-time collaboration becomes a requirement), purpose-built wiki engines (BookStack/Wiki.js/Obsidian Publish — rigid hierarchy or not built for public contribution at scale), and Neo4j as the primary store (operationally heavy for a solo dev).

## 9. Content Strategy

Ship a **complete vertical slice before breadth**: Barovia, Strahd von Zarovich, Castle Ravenloft, and directly related NPCs/sources, fully populated to the target quality bar, before backfilling other domains. This is both the QA benchmark for every later entity and the flagship page most likely to draw first traffic and comparisons against Mistipedia.

All content must be **original summary/description** written for this project — never verbatim copies of WotC text, scans, or book excerpts. Stat blocks/mechanics may only reproduce content to the extent it's covered by the OGL/CC SRD.

## 10. Legal & IP Requirements

*(Not legal advice — flagged for professional review before public launch, per the source research.)*

- Ravenloft setting-specific IP (Strahd, Barovia, Vistani, Darklords, domain names) is WotC copyright/trademark, usable only under WotC's **Fan Content Policy** — not the OGL, not the CC-BY 4.0 SRD (SRD covers only generic mechanics).
- **Must be free.** Ads and donations are allowed; paywalling access to content is not.
- **Required disclaimer** on every page:
  > *"[Site] is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC."*
- **No verbatim reproduction** of WotC book text — original description only.
- Game mechanics/stat blocks reproducible only to the extent covered by the OGL/CC SRD; the Mechanics collection schema must track this per-entry.
- The ORC License (Paizo) does not apply here.
- Decide contributor licensing (suggested: CC-BY-SA for original contributor writing, keeping the archive open) before opening contributions.
- **Action item before any public launch:** engage a lawyer to review the Fan Content Policy approach, given that it is a revocable permission (not a license) and its interplay with the CC SRD is contested among fans.

## 11. Phased Roadmap

| Phase | Focus | Key deliverables |
|---|---|---|
| **0 — Legal & scope** | Before any code | Fan Content disclaimer drafted; free/non-commercial model decided; lawyer review scheduled; contributor license decided |
| **1 — Skeleton & schema** | Foundation | Astro project scaffolded; Zod schemas for Domains/Darklords/NPCs/Locations/Sources; entity templates + infoboxes; deployed to Cloudflare Pages; Barovia/Strahd/Castle Ravenloft vertical slice complete |
| **2 — Search & navigation** | Findability | Meilisearch/Typesense stood up; index built from frontmatter; faceted search UI; breadcrumbs; related-entity/"appears in" panels |
| **3 — Contribution pipeline** | Scale content creation | Decap/Keystatic wired up with editorial-workflow PRs + open authoring; contributor guidelines, entity templates, style guide; branch protection enforced |
| **4 — Migrate & backfill** | Breadth | Domain-by-domain original content, de-duplicated as it's written; prioritize core domains and most-searched Darklords |
| **5 — Graph & polish** | Differentiation | Relationship graph view; timeline view; JSON-LD; sitemap; gothic-horror design system; analytics + Search Console |
| **6 — Community growth** | Sustainability | Recruit contributors from r/ravenloft and FoS forums; explore collaboration with the Fraternity of Shadows |

## 12. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| **Legal exposure** — Fan Content Policy is a revocable permission, not a license; interplay with CC SRD is contested | Phase 0 lawyer review before public launch; strict original-writing rule; visible disclaimer; free-only model |
| **Solo maintenance / stalled completeness** (Mistipedia's actual root cause was too few editors, not bad software) | Prioritize the contribution pipeline (Phase 3) and community-building (Phase 6) as seriously as the tech; consider FoS collaboration to avoid splitting a small community |
| **Framework churn** (Astro moving fast; Cloudflare acquired the Astro company Jan 2026) | Pin versions; budget maintenance time; monitor Astro's live-collections work for future migration |
| **Search infrastructure cost/ops burden** if traffic is low | Threshold: if traffic stays small, drop the VPS and use Pagefind (client-side, fully static, no server) |
| **Contributors reject git/PR workflows** | Threshold: if this happens broadly, reconsider Semantic MediaWiki or Wiki.js, accepting UX tradeoffs |
| **Real-time collaboration demand emerges** | Threshold: if needed, switch core to Payload (self-hosted, database-backed) instead of static Markdown |
| **Scale of Mistipedia's existing corpus is unconfirmed** (rate-limited before stats could be read; category counts suggest thousands of pages) | Treat backfill estimates as rough; re-scope Phase 4 once real content volume is assessed |

## 13. Open Questions / Decisions Needed

- **Site name and domain.** This PRD uses "The Ravenloft Archive" as a placeholder — needs a real name/domain, ideally checked against trademark concerns before public launch.
- **Search infra decision point:** commit to Meilisearch/Typesense + VPS now, or launch MVP with Pagefind and upgrade if traffic warrants it?
- **Contributor content license:** confirm CC-BY-SA vs. an alternative.
- **Fraternity of Shadows outreach:** collaborate, stay independent, or revisit after MVP traction?
- **Hosting budget:** confirm whether the $5/mo Cloudflare Pages Pro tier is acceptable if free-tier build limits are hit.
- **Analytics approach:** confirm a privacy-respecting analytics tool (not specified in source research).

## Appendix: Competitive Landscape (summary)

| Resource | Verdict |
|---|---|
| Mistipedia (FoS) | Largest Ravenloft corpus; stale MediaWiki, weak search/nav, data-hygiene issues |
| Ravenloft Fandom wiki | Ad-heavy, generic Fandom UX, less complete on deep lore |
| Fraternity of Shadows main site | Netbooks/reviews/forum, static HTML, not a structured DB |
| Secrets of the Kargatane | Historically important, now defunct |
| Archives of Nethys (Pathfinder) | Gold-standard model to emulate: Elasticsearch-backed instant search, faceted filtering, hover-cards, multiple themes |

Full detail behind every row above is in `Building a Better Ravenloft Archive.md`.
