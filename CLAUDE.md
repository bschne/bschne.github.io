# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start local dev server (http://localhost:4321)
pnpm build            # Build static site to ./dist/
pnpm preview          # Preview the production build locally
```

## Architecture

Astro 5 static site (personal blog/portfolio at benjaminschneider.ch). See `docs/BRIEF.md` for the full design brief.

**`build.format: 'file'`** — generates `about.html` instead of `about/index.html`. Required so blog posts produce `/2024/08/03/slug.html` URLs that match existing Jekyll permalinks. All internal links therefore use no trailing slashes (e.g. `/writing`, `/about`, `/now`).

**Content collections** (`src/content/config.ts`):
- `writing` — blog posts. Filenames: `YYYY-MM-DD-slug.md`. URL derivation in `src/lib/dates.ts#jekyllPath` uses the frontmatter `date` + filename slug (stripping the date prefix and `.md` extension from the Astro 5 entry id, which includes the extension).
- `library` — books, papers, podcasts, films, courses. Not yet populated (Phase 2).
- `projects` — work/side projects.
- `photos` — photo metadata only, no body (Phase 3).

**Post URL routing** — `src/pages/[year]/[month]/[day]/[slug].astro`. `getStaticPaths` extracts year/month/day from `post.data.date` and the slug from `post.id` after stripping the date prefix and `.md`.

**Layouts**: `Base.astro` → html shell + fonts; `Editorial.astro` → two-column home layout (named slots: `header`, `main`, `rail`, `below`); `Prose.astro` → single-column reading layout (~680px).

**Design tokens** (`src/styles/tokens.css`): warm off-white `#fdfcf9`, dark mode via `prefers-color-scheme`, orange accent `rgb(255, 77, 6)` (slightly softened in dark mode), Source Serif 4 Variable + Inter Variable (both via fontsource npm packages, self-hosted).

**Image assets** from the old Jekyll site live in `public/assets/posts/` — referenced by migrated posts as `/assets/posts/...`.

## Phase status

- **Phase 1** (current): Foundation + content migration — ✅ complete
- **Phase 2**: Library (books, papers, podcasts, films, courses with cover images)
- **Phase 3**: Photos (masonry grid, lightbox)
- **Phase 4**: Polish (CLI scripts, RSS, OG images, dark mode review)
