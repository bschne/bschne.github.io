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
- `writing` — blog posts, `.md` or `.mdx`. Filenames: `YYYY-MM-DD-slug.md`. URL derivation in `src/lib/dates.ts#jekyllPath` uses the frontmatter `date` + filename slug (stripping the date prefix and the extension from the Astro 5 entry id, which includes it). A post is plain markdown unless it has to embed a component — the Jotunheimen post is `.mdx` because of its route map — and MDX inherits the markdown config, so figures, margin notes and image sizing come out byte-for-byte the same either way.
- `library` — books, papers, podcasts, films, courses. Not yet populated (Phase 2).
- `projects` — work/side projects.
- `photos` — photo metadata only, no body (Phase 3).

**Post URL routing** — `src/pages/[year]/[month]/[day]/[slug].astro`. `getStaticPaths` extracts year/month/day from `post.data.date` and the slug from `post.id` after stripping the date prefix and `.md`.

**Layouts**: `Base.astro` → html shell + fonts; `Editorial.astro` → two-column home layout (named slots: `header`, `main`, `rail`, `below`); `Prose.astro` → single-column reading layout (~680px).

**Design tokens** (`src/styles/tokens.css`): white `#ffffff` background (near-black `#101011` in dark), orange accent `rgb(255, 77, 6)`, Inter Variable only (via fontsource npm package, self-hosted). Both themes live in the token values themselves: every colour token is a `light-dark(light, dark)` pair, so a theme switch is a switch of `color-scheme` on `:root` and nothing else in the stylesheet knows about it. With no stored preference `:root { color-scheme: light dark }` leaves the system setting in charge; the nav's sun/moon button pins a choice by setting `data-theme="light"|"dark"` on the root and storing it under `localStorage.theme`, which an inline script in `Base.astro` re-applies before first paint so there is no flash. The button is `hidden` in the markup and unhidden by its own script, since without JS it could not switch anything. Which icon shows is the one part of the theme a colour token cannot carry, so it rides along as the `--icon-sun`/`--icon-moon` display pair set beside the `color-scheme` rules. The accent is the only colour that does not move between themes. Hierarchy is carried by weight (`--weight-normal/medium/semibold`) and a four-step grey ramp (`--color-text-primary/secondary/tertiary/quaternary`), not by mixing typefaces.

**Post images** live in `src/assets/posts/<post-slug>/` and are referenced from markdown with *relative* paths (`../../assets/posts/...`) so Astro's asset pipeline processes them. Anything left in `public/` is served verbatim and is *not* optimized.

**Figures and captions** — a paragraph holding nothing but image(s), optionally closed by an italic line, *is* a figure, and that is the whole authoring format:

```markdown
![](../../assets/posts/<slug>/photo.jpg)
*Caption, on the line right under the image*
```

Two images on consecutive lines make a two-up pair (no wrapper div); the caption, if any, spans both. `src/lib/rehype-prose-images.ts` runs before Astro's internal `rehypeImages` and rewrites that paragraph into `<figure>` + `<figcaption>` (`.figure-pair` for two), then stamps each `<img>` with the `width`/`widths`/`sizes` the prose layout implies — 816px+ for a lone bleeding image, 332px for a pair, 680px for anything left inline — so builds emit a webp srcset instead of multi-megabyte originals. A caption is sized against the body the way a library note is sized against its row title: one step down the scale (`--text-meta`, sans, which is the step below the `--text-body` the prose serif answers to) and one down the grey ramp (`--color-text-secondary`). It is held to `--prose-measure` and centred, so under a bleed image it still lines up with the body text.

**Margin notes** — `src/components/MarginNotes.astro` progressively enhances two things markdown already encodes: footnote markers (which point at an endnote list) and `<abbr title>` (whose expansion only a hover tooltip shows). Above 1140px each becomes a note in the right margin, aligned with its line; below that the marker becomes a disclosure that opens the note inline — a full-width float, so the line the marker sits on finishes as written and the note slots in underneath it rather than cutting the line in half. The endnote list is kept in the DOM as `.sr-only` for assistive tech and as the no-JS fallback, and an enhanced `<abbr>` trades `title` for `aria-label` so the native tooltip stops competing with the note. Only the first mention of a given abbreviation is glossed. Layout is a JS pass that stacks notes in document order and pushes any note clear of a full-bleed image reaching into the column, re-run on resize, font swap and image load.

**Marginal geometry** — the contents rail (left) and the margin notes (right) are positioned against `100vw`, which counts a scrollbar track the page cannot use, so `Base.astro` publishes the difference as `--scrollbar-w` and `html { scrollbar-gutter: stable }` keeps it constant. `--rail-width` sizes the ToC to stop clear of the widest bleed image; `--sidenote-width` hangs off `--prose-measure` instead, so a note reads as belonging to the line beside it.

**Route maps** — `src/components/RouteMap.astro` folds a GPX track into one line of prose, with the map itself behind a `<details>`. The line reads left to right as distance, ascent, descent — each in a fixed 4rem column, so the figures line up down a page of them and no digit can shift the line — then the name of the walk as a label on them, in the caption grey and the same weight as everything else on the line, then a Show map / Hide map cue at the far end. Both cue labels ship and CSS picks one off `[open]`, so the cue is right before any script runs; they sit stacked in a single grid cell and swap by `visibility`, which keeps the cue as wide as the longer of the two and stops the caret walking sideways as the fold opens. On a column too narrow for all three parts the numbers take the first row and the name drops under them with the cue at its end. The GPX lives in `src/data/routes/<id>.gpx` and is read at build time by `src/lib/gpx.ts`, so a post ships the three numbers and a few kilobytes of polyline rather than 60kB of XML — and no map library at all until a reader opens the fold, at which point Leaflet arrives as its own chunk. `gpx.ts` sums distance inside each `<trkseg>` (a gap in the track stays a gap in the drawn line), counts climb only once a run of points has moved past a 3m threshold so a flat kilometre doesn't accumulate ascent out of terrain-model noise, and thins the line with Ramer–Douglas–Peucker at 4m, which is under a pixel at the zoom a day's walk is looked at. Files in `src/data/routes/` are named for the direction they actually run, which is not always the direction their source titles claim — ut.no stores some route descriptions back to front — so check a track's first and last point against the huts before trusting its name. `reverse` walks it the other way, before the stats are computed, so ascent, descent and the start/finish dots all come out of one pass and agree; a reversed route wants an explicit `label`, since the GPX's own name will be stating the wrong direction.

The basemap is a name from `src/lib/basemaps.ts` and the component knows nothing else about it, so moving a route onto another service is adding an entry there and passing `basemap=`. Default is Kartverket's `topograatone` WMTS cache — the norgeskart greytone, free under CC BY, no key, tiles to z18. A basemap also says whether a dark page may invert it (`dark`): a greyscale line map inverts into a credible night version of itself, one with colour in it does not, and that filter is applied to Leaflet's tile pane alone so the route on top keeps the accent. Inverting alone gives a glare — print contrast is drawn for white paper, so it comes back as near-white lines on near-black ground, and `brightness()` cannot fix that because it multiplies and so only deepens the ground. `contrast()` below 1 is what lifts the ground and dims the lines together; the note in `basemaps.ts` gives the two endpoints in closed form, and the current numbers solve for linework on `--color-text-secondary` over a ground a shade above `--color-bg`, so the map is lit like body text on the same page. The route is drawn twice, a casing in `--color-bg` under the accent line, and both take their colour from the stylesheet rather than from a Leaflet option so they follow a theme switch.

It renders as a `<figure>`, but is named in the `:not()` on the bleed rule in `prose.css` and stays at `--prose-measure`: a photograph is looked at and earns the extra width, a route map is read, like the paragraph it interrupts, and the summary line reads as a rule across the column rather than across the page. The track's credit sits under the map *inside* the fold — a `<p>`, since a `<figcaption>` may only be the figure's own child — alongside Leaflet's basemap attribution in the corner of the map; both are claims about what is on screen, so neither is made while the fold is shut. `source` is just the URL: the link names itself by host and carries the `↗` and `target=_blank` that `LibraryRow.astro` gives an off-site link, so there is one convention for leaving the site, and the arrow does the work the underline otherwise would. The map opens at roughly the aspect ratio of the route's own bounding box (clamped to 1.2–2.2) rather than at a fixed letterbox. Scroll-wheel zoom is off so a map mid-essay can't eat the page's scroll.

**Social cards** — `src/lib/og-image.ts` picks a post's sharing image: the frontmatter `image:` (a bare filename inside that post's asset dir) if set, otherwise the first image in the post body, so posts normally need no frontmatter for it. It's cropped to 1200×630 jpeg via `getImage`, capped at the original's size so the declared `og:image:width/height` never overstate it. `Base.astro` takes `image` + `type` props and emits `og:image`/`twitter:image` plus `twitter:card=summary_large_image`; posts with no image fall back to a `summary` card. `og:title`/`og:description` come from the post's `title` and `description`.

## Phase status

- **Phase 1** (current): Foundation + content migration — ✅ complete
- **Phase 2**: Library (books, papers, podcasts, films, courses with cover images)
- **Phase 3**: Photos (masonry grid, lightbox)
- **Phase 4**: Polish (CLI scripts, RSS, OG images)
