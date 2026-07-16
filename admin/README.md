# Contribution CMS — Keystatic (Phase 3)

The browser-based CMS from `PRD.md` §7.4 is wired up with **Keystatic**, running
in **local mode**. It is an editing surface over the existing Markdown/MDX files
under `src/content/` — not a new data store. The Zod schemas in
`src/content.config.ts` remain the source of truth and validate every edit at
build time.

## Where the config lives

- **`keystatic.config.ts`** (repo root) — defines the CMS collections, mirroring
  the Zod schemas: typed fields, `select`/`multiselect` for enums (editions,
  spoiler level, domain/location/source types), `relationship` fields for
  cross-references, and an MDX body field with a registered `SpoilerWrapper`
  block for inline spoilers.
- **`astro.config.mjs`** — adds the `keystatic()` integration **only for the
  `dev` command**, so `astro build` stays a pure static build (no adapter, no
  server routes). This directory (`admin/`) holds only this documentation.

## Using it

```bash
npm run dev
# open http://localhost:4321/keystatic
```

Edits write to the working tree; commit and open a pull request. `npm run build`
is the authoritative validation.

## Design notes

- **Flat files.** Because no image/asset fields are configured yet, Keystatic
  stores each entry as a single `src/content/<collection>/<slug>.mdx` file,
  matching the existing layout. `heroImage` stays code-authored until image
  handling is wired up.
- **Slugs.** The `slug` field derives the filename from the entry's
  `name`/`title`, matching the build-time slug guard. Keep new entry names
  slugging cleanly so the guard and Keystatic agree.
- **Import-free bodies.** Entity MDX bodies contain no `import` statements;
  `SpoilerWrapper` is provided to the renderer by the entity routes and
  registered as a Keystatic content component, so bodies round-trip through the
  editor.

## Upgrade path: hosted, GitHub-backed open authoring

To let non-technical contributors edit in the browser and open a PR per change
(the full "editorial workflow" / "open authoring" from the PRD):

1. Change `storage` in `keystatic.config.ts` from `{ kind: 'local' }` to
   `{ kind: 'github', repo: 'pw-collab/Avernus' }` (or a `cloud` config).
2. Add the `@astrojs/cloudflare` adapter and stop gating `keystatic()` to dev, so
   the `/keystatic` admin and `/api/keystatic` routes are server-rendered in
   production (Astro `output: 'static'` with those two routes opting into SSR).
3. Create a **GitHub App** for the repo and set its client id/secret as
   environment variables in Cloudflare Pages (see the Keystatic GitHub-mode
   docs). Enable branch protection so nothing merges without review.

None of the public entity-page, search, or component code changes for this
upgrade — it is contained to the config, the adapter, and the GitHub App setup.
