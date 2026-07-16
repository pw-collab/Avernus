# Contribution CMS — stub (Phase 3)

This directory is a **placeholder** for the browser-based contribution CMS
described in `PRD.md` §7.4 and §11 (Phase 3). It is intentionally empty in the
current build.

The plan is to wire up **Decap CMS** or **Keystatic** here with a git-based
"editorial workflow" (a pull request per edit) and "open authoring" so
non-technical contributors can add or correct entries without using git
directly. The CMS will read and write the same Markdown/MDX files under
`src/content/`, validated by the same Zod schemas — it is an editing surface over
the existing content model, not a new data store.

Until it exists, contribute by editing Markdown and opening a pull request. See
`CONTRIBUTING.md`.
