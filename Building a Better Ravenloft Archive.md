# Building a Better Ravenloft Archive: A Technical Blueprint to Surpass Mistipedia

## TL;DR
- **Build a static-first, git-backed knowledge base** using **Astro** (with content collections + MDX) for the public site, **Decap CMS or Keystatic** for browser-based contribution with pull-request review, and **Meilisearch or Typesense** for instant faceted search — this stack will be dramatically faster, better-organized, and more polished than Mistipedia's aging MediaWiki 1.43 install, while costing near-zero to host on Cloudflare Pages.
- **Model Ravenloft as structured, interlinked entities** (Domains, Darklords, NPCs, Locations, Artifacts, Timeline events, Mechanics) with typed frontmatter and explicit relationships rather than flat wiki prose; this is the single biggest quality lever, because Ravenloft's appeal is its web of connections (Darklord → Domain → Cluster → NPC → Artifact).
- **The main constraint is legal, not technical:** Ravenloft-specific lore (Strahd, Barovia, Vistani, Darklords) is Wizards of the Coast copyright/trademark, permitted only under WotC's non-commercial Fan Content Policy — not the OGL or Creative Commons SRD. This needs a disclaimer, a free/non-paywalled model, and ideally a lawyer's review before launch.

## Key Findings

### Mistipedia is a stale, default-skin MediaWiki that under-delivers on modern UX
Mistipedia is a fan wiki run by the Fraternity of Shadows (FoS), the leading Ravenloft fan community since the early 2000s (successor to the 1990s Kargatane group). It runs **MediaWiki 1.43.0** — confirmed in the page HTML `meta-generator` tag — with the **MonoBook** default skin plus optional Timeless/Vector. Its main page was last edited **2 December 2020**, and while some pages are edited as recently as **6 December 2025**, editing is uneven and selective rather than systematic.

Documented/observed weaknesses:
- **Incompleteness by design.** Mistipedia was seeded from the "Ravenloft Catalogue" database using "WIKISEED" placeholder stubs — the wiki's own documentation says the intent was "someone will come along and edit [the] page into a coherent article at some point," with WIKISEEDs acting as "placeholders and a temporary source of info." Many entries never graduated from stub to article.
- **Navigation/IA.** Category-driven MediaWiki navigation (Category:Character, Category:Domain, etc.) with 200-item paginated category listings and no faceted filtering, no relationship graph, no visual browsing.
- **Search.** Default MediaWiki search — prefix-matching, no typo tolerance, no instant/as-you-type results, no faceting by edition/domain/type.
- **Design.** A customized dark MonoBook skin that the admin himself acknowledged (Talk:Main Page, 2021) was aging: the "thematic dark style choices i made for the default skin 10 years ago are starting to wear."
- **Duplication/data hygiene.** The article index shows massive near-duplicate entries (e.g., "Doppelganger Golem" / "Doppleganger Golem, The" / "Doppelganger golem"), a classic symptom of unmoderated wiki growth and auto-import.
- **Performance.** Server-rendered PHP MediaWiki on shared hosting, returning HTTP 429 rate-limit errors under light automated load.

### The Ravenloft fan-archive landscape is fragmented and mostly aging
- **Mistipedia (FoS)** — the largest dedicated Ravenloft wiki, but stale/incomplete as above.
- **Ravenloft Fandom wiki** (ravenloft.fandom.com) — ad-heavy, generic Fandom UX, CC-BY-SA, less complete than Mistipedia on deep lore.
- **Forgotten Realms Wiki / other Fandom wikis** — cover Ravenloft tangentially.
- **Fraternity of Shadows main site** — hosts netbooks ("Quoth the Raven," 30+ issues), reviews, and the "Café de Nuit" forum (active into 2026), but as static HTML pages, not a structured DB.
- **Secrets of the Kargatane** — historically important, now defunct.
- **Reddit r/ravenloft, r/CurseofStrahd** — active discussion, not archival.

The takeaway: there is a clear, unfilled niche for a **fast, complete, well-designed, structured** Ravenloft archive. No existing resource combines completeness, modern search, polished design, and structured data.

Timing is favorable: Wizards is actively reinvesting in Ravenloft. 2026 uses a "Seasons" model whose spring "Season of Horror" is anchored by the sourcebook **Ravenloft: The Horrors Within** (wide release June 16, 2026 at $59.99 MSRP physical / $39.99 on D&D Beyond, per Wizards of the Coast's WPN listing and EN World; an Ultimate Bundle bundling the book with the Tarokka Deck, DM Screen, and Map Pack runs $149.99), plus the standalone Tarokka Deck, DM Screen, and Map Pack, and the four-issue Dark Horse **"Dungeons & Dragons: Ravenloft"** comic written by Bram Stoker Award winner Amy Chu with art by Ariela Kristantina and colors by Arif Prianto — issue #1 (of 4) on August 19, 2026 at $4.99 (Dark Horse: "Ravenloft is falling apart, and nobody knows why. Fortunately, monster hunter Ez D'Avenir is on the case!"). Renewed official attention means renewed search traffic and a growing corpus to catalog.

### Platform options, compared for a solo capable developer in 2026

**1. Self-hosted MediaWiki (non-Fandom).**
- *Pros:* Familiar wiki syntax; battle-tested; huge extension ecosystem; wiki editors already know it; Cargo/Semantic MediaWiki can add structured data.
- *Cons:* This is what Mistipedia already is. Heavy PHP/MySQL stack, dated default UX, weak out-of-box search, and you inherit the exact IA/design problems you're trying to escape. Making it "significantly better" means fighting the platform. Not recommended as the core.

**2. Modern static-site-generator wiki (Astro / Next.js+MDX / Docusaurus / Eleventy) over Markdown in git. ← Recommended core.**
- *Pros:* Astro ships zero JS by default, produces Lighthouse-100 content sites, and its **content collections** give type-safe, schema-validated frontmatter (Zod schemas) — perfect for enforcing structured entity data. Markdown/MDX in a git repo means free version history, diffs, branch-based review, and no database to maintain. Astro ranked #1 in meta-framework Interest, Retention and Positivity in State of JavaScript 2024, and in State of JS 2025 leads meta-framework satisfaction over Next.js by a 39-percentage-point margin.
- *Cons:* Rebuild-on-change workflow (mitigated by fast incremental builds and Astro 6 live collections); you build the IA yourself; non-technical contributors need a CMS layer (below).

**3. Headless CMS + custom frontend (Sanity / Payload / Directus / Strapi).**
- *Pros:* Great structured-data modeling and editor UX. **Payload** (MIT, Next.js-native, schema-as-code, self-hostable, full data ownership) is the strongest fit if you want a real database and admin UI. **Directus** wraps a SQL DB and auto-generates REST/GraphQL — ideal if you want relational modeling. **Sanity** has the best editor experience but is cloud-hosted (less data ownership).
- *Cons:* More moving parts, a server/database to run and secure, and hosting cost. Overkill unless you need real-time collaborative editing or very complex relational queries.

**4. Purpose-built wiki engines (Wiki.js, BookStack, Outline, TiddlyWiki, Obsidian Publish).**
- **BookStack** (PHP/Laravel, MIT, ~18,800 GitHub stars) — clean books/chapters/pages hierarchy, WYSIWYG, easy hosting; but rigid hierarchy fits documentation better than a cross-referenced lore web.
- **Wiki.js** (Node) — modern UI, flexible, but development has notably stalled.
- **Obsidian + Obsidian Publish / Foam** — excellent for interlinked notes and graph view, but Publish is a paid add-on and not built for large public community contribution.
- *Verdict:* Good for internal notes; none is the ideal public, community-contributable, highly-designed archive.

**5. Graph / relational DB for interconnected lore (Neo4j, or a relational schema).**
- *Pros:* Ravenloft is genuinely a graph (Darklord–rules–Domain, Domain–belongs-to–Cluster, NPC–appears-in–Source, Artifact–located-in–Domain). A graph DB (Neo4j) makes "shortest path between two entities," "everything connected to Strahd within 2 hops," and relationship visualizations trivial.
- *Cons:* Running a graph DB as the primary store for a public site is operationally heavy for a solo dev. **Better approach:** keep Markdown+frontmatter as the source of truth, and *derive* a relationship graph at build time (frontmatter references → nodes/edges → an interactive graph view). You get graph UX without operating a graph database.

### What great RPG/game wikis do that Mistipedia doesn't
- **Archives of Nethys** (Pathfinder) — serves hover-cards and search via a public Elasticsearch instance at elasticsearch.aonprd.com (index "aon"), as documented by developer Luke Hagar on DEV Community ("it made a multiget post call to an elasticsearch instance for the site"), with faceted filtering by category, level, type, and source and multiple visual themes. This is the gold standard for a structured TTRPG database.
- **D&D Beyond, Fallout/Elder Scrolls wikis** — infoboxes with consistent typed fields, aggressive cross-linking, category + filter navigation, strong search.
- **Common patterns to adopt:** consistent infobox/entity templates; typed fields; faceted search/filter; "what links here" / related-entity panels; source citations on every fact (Mistipedia does cite sources well — keep that); breadcrumb + hierarchical navigation.
- **Contribution workflows:** git-based pull-request review (Decap CMS "editorial workflow" creates a PR per edit; "open authoring" lets non-collaborators submit via fork+PR) gives you moderation, version control, and quality gates that plain wikis lack.

### Practical build considerations
- **Hosting.** A static Astro site on **Cloudflare Pages** has unlimited bandwidth on the free tier (no surprise bills from a viral Reddit post), 330+ data centers, and 500 builds/month free, with unlimited bandwidth confirmed at every tier. The Pages Pro tier at $5/month adds 5,000 builds and 10 million Workers requests/month (DevToolReviews, 2026: "The Pro tier at $5/month is the best deal in hosting"). Netlify and Vercel have 100 GB/month free bandwidth caps and can bill overages. For a niche site that might spike, Cloudflare's unlimited bandwidth is the safest choice.
- **Search.** **Meilisearch** (Rust, MIT, sub-50ms, typo-tolerant, easiest setup) or **Typesense** (C++, fastest raw latency, GPL) — both self-hostable and free, both drop-in InstantSearch-compatible. **Algolia** is the polished SaaS but gets expensive. For a solo dev, Meilisearch on a small VPS (or Typesense Cloud) is the sweet spot; build the index from your Markdown at deploy time.
- **SEO/discoverability.** Static HTML + JSON-LD structured data (schema.org) helps both Google rich results and AI-search/LLM visibility. Niche sites often see outsized relative benefit from structured data on long-tail queries. Clean URLs, sitemaps, fast load, and per-entity metadata are the wins.
- **Legal/IP (flag for review, not legal advice).** Ravenloft's setting-specific IP (Strahd, Barovia, Darklords, Vistani, domain names) is WotC copyright/trademark. It is **not** in the OGL/SRD and **not** under the Creative Commons SRD 5.1 release (which covers only generic mechanics). It falls under WotC's **Fan Content Policy**, which permits use **only for free** (ads/donations OK, but no paywalling access) and requires the disclaimer: *"[Site] is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC."* Verbatim copying/reposting of WotC text ("freely distributing D&D rules content or books") is expressly not allowed — the archive must be original summary/description, not scans or copy-paste. Game mechanics (stat blocks) may only be reproduced under the OGL/CC SRD to the extent they appear there. The ORC License (Paizo) is irrelevant to Ravenloft-specific content. **This all needs a real lawyer's review before launch.**

## Details

### Recommended architecture (concrete)
- **Framework:** Astro (v6+), content collections with Zod schemas, MDX for rich entity pages. Islands architecture for the few interactive bits (search box, relationship graph, filters) with React/Svelte components, everything else static HTML.
- **Content store:** Markdown/MDX + YAML frontmatter in a GitHub repo. Each entity type is a collection with an enforced schema.
- **Editing/contribution:** **Decap CMS** (MIT, git-based, editorial-workflow PRs, open authoring) for browser editing with review; or **Keystatic** (better DX for Astro/Next, TypeScript-native schemas) if you prefer modern tooling. Power users edit Markdown directly and open PRs.
- **Search:** Meilisearch (or Typesense), index built from frontmatter at deploy; faceted by domain, edition, entity type, source.
- **Hosting:** Cloudflare Pages (site) + a small VPS or managed instance for the search engine.
- **Graph:** Build-time generation of a nodes/edges JSON from frontmatter cross-references; render an interactive force-directed graph and per-entity "connections" panels.

### Suggested information architecture for Ravenloft
Model these as first-class, typed collections, each with an infobox and cross-references:
- **Domains of Dread** — fields: name, cluster/island/core/pocket type, Darklord (ref), genre/gothic trope, cultural level, mists borders, adjacent domains (refs), sources (refs), edition(s).
- **Darklords** — fields: name, domain (ref), origin, dark gift, curse/torment, related NPCs (refs), first appearance (source ref).
- **NPCs / Characters** — fields: name, domain (ref), affiliations/societies (refs), role, edition, sources.
- **Locations** — fields: type (city/castle/landmark), domain (ref), inhabitants (refs), "Sinkhole of Evil" rank, sources.
- **Artifacts / Items** — fields: name, powers, current location/owner (refs), sources.
- **Timeline / History** — fields: in-world date, real-world edition context, related domains/NPCs (refs); rendered as a filterable timeline.
- **Mechanics / Rules** — fields: edition, category (fear/horror/madness, powers checks, dark gifts), source; flag which are OGL/SRD-safe vs. WotC-proprietary.
- **Sources / Products** — fields: title, publisher (TSR/WotC/Arthaus), edition, year, type (sourcebook/novel/adventure/netbook), ISBN; every fact cites one.

Cross-cutting: **editions** (I6/AD&D 2e/3e d20/4e/5e/2024) as a facet on everything, since canon shifts by edition and users care deeply about which version they're reading; **spoiler flags** (Mistipedia already warns about DM spoilers — bake this into the schema with per-section spoiler toggles).

### Phased build plan
- **Phase 0 — Legal & scope (before code).** Draft the Fan Content disclaimer; decide free/non-commercial model; get a lawyer to review the IP approach; define what is original description vs. off-limits verbatim text. Decide licensing for *your* contributors' original writing (e.g., CC-BY-SA to keep it open).
- **Phase 1 — Skeleton & schema.** Astro project, define collection schemas for Domains, Darklords, NPCs, Locations, Sources. Build entity page templates + infoboxes. Deploy to Cloudflare Pages. Seed with a vertical slice: fully complete Barovia + Strahd + Castle Ravenloft + related NPCs/sources as the quality bar.
- **Phase 2 — Search & navigation.** Stand up Meilisearch, build the index from frontmatter, add instant faceted search and filter UI. Add breadcrumbs, related-entity panels, "appears in" source lists.
- **Phase 3 — Contribution pipeline.** Wire up Decap/Keystatic with editorial-workflow PRs and open authoring; write contributor guidelines, entity templates, and a style guide; set branch protection so nothing publishes without review.
- **Phase 4 — Migrate & backfill.** Import/rewrite content domain-by-domain (respecting IP: original descriptions, not copied text), de-duplicating as you go. Prioritize the core domains and the most-searched Darklords.
- **Phase 5 — Graph & polish.** Build the relationship graph view, timeline view, JSON-LD structured data, sitemaps, and visual theming (gothic-horror design system). Add analytics and Search Console.
- **Phase 6 — Community growth.** Recruit contributors from r/ravenloft and the FoS forums; consider reaching out to the Fraternity of Shadows to collaborate rather than compete (they own the largest existing corpus and community goodwill).

## Recommendations
1. **Adopt the Astro + Markdown/git + Decap + Meilisearch + Cloudflare Pages stack.** It directly attacks every Mistipedia weakness: speed (static edge delivery), search (instant faceted), design (full control), completeness/quality (schema validation + PR review), and cost (near-zero).
2. **Treat structured data as the core product.** Enforce typed frontmatter with Zod schemas; make cross-references first-class. This is what makes a Ravenloft archive genuinely *better* rather than just prettier.
3. **Ship a complete vertical slice first (Barovia/Strahd)** as the quality benchmark before backfilling breadth. A small, gorgeous, complete section beats a large stub farm.
4. **Do the legal groundwork before launch:** disclaimer, non-commercial/free model, lawyer review, and a strict "original writing, no verbatim WotC text" content rule.
5. **Collaborate with the Fraternity of Shadows if possible.** They have the corpus and community; a modern front-end + their content could be a win-win, and it sidesteps splitting a small community.

**Thresholds that would change the recommendation:**
- If you want **real-time multi-editor collaboration** or heavy relational querying → switch the core to **Payload** (self-hosted, database-backed) instead of static Markdown.
- If contributors overwhelmingly **refuse git/PR workflows** and want instant wiki-style editing → reconsider a modern MediaWiki with Semantic MediaWiki, or Wiki.js, accepting the UX tradeoffs.
- If **traffic stays tiny**, skip the VPS and use a client-side search index (Pagefind/Fuse.js) to run fully static with no server at all.

## Caveats
- **Legal is the real risk.** Nothing here is legal advice; the Fan Content Policy is a permission (arguably revocable) rather than a license, and its interplay with the CC-BY 4.0 SRD is contested among fans. Get professional review.
- **Exact Mistipedia scale is unconfirmed.** The site returned rate-limit errors and its Special:Statistics page could not be directly read; total article/edit/image counts are unknown, though category counts (e.g., 323 2nd-edition character pages, 193 3rd-edition, 33 4th-edition) indicate thousands of pages.
- **Solo maintenance is the long-term failure mode.** Mistipedia's incompleteness stems from too few editors, not bad software. The contribution pipeline and community-building matter more than the framework choice for long-term completeness.
- **Some 2026 product details are near-term/forward-looking** and should be verified at publication (release dates and prices for The Horrors Within and the Dark Horse comic were drawn from announcements; reviews expressing quality opinions are not fact).
- **Framework churn.** Astro moves fast (v6 in early 2026, Cloudflare acquired the Astro company in Jan 2026); pin versions and expect maintenance.