# benjaminschneider.ch — rebuild brief

A design and implementation brief for rebuilding the personal site at [benjaminschneider.ch](https://benjaminschneider.ch). Drop this into a Claude Code session as context; work through the phases at the end in order.

---

## 1. Goals & principles

**Primary job of the site.** Find people I like and let them find me. Build something over time. Blog more, write more about what I read.

**Audience.** In priority order: (1) peers who share intellectual interests and might become friends or collaborators, (2) people who follow the writing, (3) potential collaborators on projects. Recruiters and casual visitors are not the primary audience — they're accommodated, not optimized for.

**Principles that shaped the design.**

- *Writing and reading are the main artifacts.* Employment history is demoted to a linked page. Projects are a first-class section, distinct from employment.
- *Equal citizens in the library.* Books, papers, podcasts, films, and courses live in one collection with the same metadata shape and the same visual weight. A page-one render handles the "no cover" problem for papers.
- *Density without clutter.* Two-column editorial layout for index pages (wider main column in serif, narrower rail in sans); single-column for essays (~620px measure). Topics as a tag list in the rail carry signal about identity in five seconds of scanning.
- *Low activation energy for updates.* CLI scripts for adding posts and library items. Build-time image fetching so new items don't require manual asset wrangling.
- *The Now page absorbs maintenance pressure.* The home-page bio stays evergreen; short-term status lives in `/now` and the home rail.

**Aesthetic anchors.** Precision engineering with warmth — think Nomos, Rotring, USM Haller. Flat, minimal chrome, generous whitespace, no decorative gradients or shadows. Serif for prose, sans for metadata. Tufte-adjacent but not imitation Tufte.

---

## 2. Tech stack

- **Framework: Astro + MDX.** Content collections with Zod schemas give build-time validation (Jekyll's silent frontmatter tolerance has bitten me). MDX lets me drop components into prose posts when needed (embedded maps, small charts) without leaving markdown.
- **Styling: plain CSS with custom properties.** No Tailwind, no CSS-in-JS. The design is 80% typography and spacing; a framework would add the least value there. Dark mode via `prefers-color-scheme` and CSS variables.
- **Images: Astro's `<Image>` component** for WebP conversion, responsive sizes, lazy loading.
- **Hosting: Cloudflare Pages.** Free tier, unlimited bandwidth, proper global CDN, fast builds. Better than GitHub Pages on every axis that matters.
- **Package manager: pnpm.**
- **Node version: LTS** (pin with `.nvmrc`).
- **Analytics (optional, later): Cloudflare Web Analytics** — no cookies, no banner needed, free.

---

## 3. Information architecture

### Site map

```
/                       home — two-column editorial, photos strip, footer
/writing/               archive, tag-filtered
/writing/[slug]/        individual post
/writing/tag/[tag]/     tag page (e.g. /writing/tag/information-design/)
/library/               all items, default grid view
/library/list/          list view
/library/[type]/        filtered by type (books, papers, podcasts, films, courses)
/library/[slug]/        individual note page
/projects/              all projects
/projects/[slug]/       individual project page
/photos/                masonry grid, newest first
/now/                   short, frequently updated status page
/about/                 longer bio, full CV, employment history
/rss.xml                feed for writing
/library.xml            feed for library additions (optional)
```

### URL preservation from Jekyll

Existing post URLs are `/YYYY/MM/DD/slug.html`. Preserve them exactly to avoid breaking inbound links. In Astro this is a `getStaticPaths` decision in `src/pages/[...slug].astro` or similar. The `.html` suffix is ugly but non-negotiable for preservation; redirect `/YYYY/MM/DD/slug` (no extension) to the `.html` version if desired.

Redirect `/bookshelf/` → `/library/` (301).

### Topics (tags)

Start with: `information-design`, `engineering`, `teaching`, `tools`, `reading`, `civic-infrastructure`, `biology`. Resist adding more until a post demands one. Tags are shared across writing and library so a tag page like `/writing/tag/biology/` can optionally include related library items.

---

## 4. Directory structure

```
src/
  content/
    config.ts              # Zod schemas for all collections
    writing/               # .md / .mdx files
    library/               # one .md per item
    projects/              # one .md per project
    photos/                # one .md per photo (metadata only)
  layouts/
    Base.astro             # <html>, <head>, global styles
    Prose.astro            # single-column reading layout (~620px)
    Editorial.astro        # two-column layout for index pages
  components/
    Nav.astro
    Footer.astro
    LibraryTile.astro      # grid tile (3:4, type-aware rendering)
    LibraryRow.astro       # list row
    PaperTile.astro        # specialized first-page render
    PhotoGrid.astro        # masonry
    TopicList.astro        # the rail tag list
    NowBlock.astro         # rail now/reading block
    Register.astro         # typography helper (serif vs sans)
  pages/
    index.astro
    writing/
    library/
    projects/
    photos/
    now.astro
    about.astro
  styles/
    tokens.css             # CSS custom properties (spacing, color, type)
    base.css               # resets, body defaults
    prose.css              # article styles
  lib/
    images.ts              # image fetching helpers
    dates.ts
public/
  library/                 # cached fetched images, committed
  photos/                  # committed photos
  fonts/                   # self-hosted fonts
scripts/
  add-post.ts              # pnpm new:post
  add-library.ts           # pnpm add:library
  fetch-images.ts          # batch-refresh library images
astro.config.mjs
package.json
```

---

## 5. Content collections

Define in `src/content/config.ts` using Astro's `defineCollection` + Zod.

### writing

```ts
const writing = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    description: z.string().optional(),      // used in selected-writing list
    topics: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});
```

### library

One collection for all five types, discriminated by `type` field. Alternative (five collections) is more work and buys little.

```ts
const library = defineCollection({
  type: 'content',
  schema: z.object({
    type: z.enum(['book', 'paper', 'podcast', 'film', 'course']),
    title: z.string(),
    creator: z.string(),                     // author/director/host/instructor
    date: z.date(),                          // consumed/finished date
    status: z.enum(['now', 'ongoing', 'done']).default('done'),
    topics: z.array(z.string()).default([]),

    // Type-specific identifiers for image fetching
    isbn: z.string().optional(),             // book
    arxiv: z.string().optional(),            // paper (e.g. "2401.12345")
    doi: z.string().optional(),              // paper fallback
    tmdb: z.string().optional(),             // film
    imdb: z.string().optional(),             // film fallback
    itunesId: z.string().optional(),         // podcast
    url: z.string().url().optional(),        // canonical link

    image: z.string().optional(),            // path under /public/library/
    imageColor: z.string().optional(),       // dominant color for empty-state tile

    // Free-text extras
    edition: z.string().optional(),          // book
    year: z.number().optional(),             // film
    episode: z.string().optional(),          // podcast
  }),
});
```

A library item's body (markdown below frontmatter) is the optional note. Empty body = catalogued only. On the index, linked titles indicate a note exists.

### projects

```ts
const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    summary: z.string(),                     // one-line for index
    date: z.date(),                          // start date
    status: z.enum(['active', 'shipped', 'archived']).default('shipped'),
    url: z.string().url().optional(),        // live link
    repo: z.string().url().optional(),
    topics: z.array(z.string()).default([]),
    image: z.string().optional(),
  }),
});
```

### photos

```ts
const photos = defineCollection({
  type: 'data',                              // no body, pure metadata
  schema: z.object({
    file: z.string(),                        // path under /public/photos/
    date: z.date(),
    caption: z.string().optional(),          // optional, shown in lightbox
    location: z.string().optional(),
    width: z.number(),
    height: z.number(),
  }),
});
```

---

## 6. Page specifications

### Home (`/`)

Two-column editorial layout. Top section is full-width (name, bio, contact links). Below, a `1.7fr / 1fr` grid:

**Main column (serif):**
- *Selected writing* — four curated posts, not the last four chronologically. Each is `title — one-line description`. Link to `/writing/` labelled "all writing, by topic →".
- *Projects* — three most important. Link to `/projects/`.

**Rail (sans):**
- *Now* — 1–2 sentences from `/now.md` (could be frontmatter field on the now page). Serves as teaser + link.
- *Reading* — 2–3 items with `status: 'now'` from the library, any type. Label "Reading" even if it includes a podcast or film; read it as "currently consuming" — close enough.
- *Topics* — inline list of tag links.

Below the grid, full-width:
- *Recent photos* — 8 thumbnails in a row (`repeat(8, 1fr)`, 4px gap). Link to `/photos/`.

Footer: `now · about · work history · rss`.

The bio needs rewriting (currently says "looking for my next thing" — no longer true). Suggested draft:

> Solution architect at Vivenu in Zurich. I contribute to OpenStreetMap, lead command support for a civil protection unit in the Pfannenstiel region, and read too much about hemoglobin, information design, and Central European history.

Adjust to taste; keep it 1–3 sentences with 3–5 concrete hooks.

### Library (`/library/`)

Default view: **grid**. Toggle to list at the top right.

**Grid view.** 4 columns (`repeat(4, 1fr)`, 16px gap), uniform 3:4 aspect ratio tiles, metadata below each tile (title, `type · date` or `type · status`).

Per-type tile rendering:
- **Book** — cover image from Open Library, or styled text tile (dominant color from `imageColor` or a neutral fallback) if no cover available.
- **Paper** — generated page-one layout: title, authors, an "abstract" label, and ruled lines (like the mockup). If an actual PDF page-one render is available (fetched at build from arXiv), prefer that.
- **Podcast** — episode/show artwork from iTunes.
- **Film** — poster from TMDB.
- **Course** — typically a styled text tile (institution + course number + title); most courses lack clean artwork.

"Now" / "ongoing" items: subtle visual promotion (either pin to top-left or add a thin accent border). Don't add chrome.

**List view.** Three columns: `type-label | title (linked if notes) · creator | date/status`. Useful for ctrl-F and scanning.

**Filter nav.** `all · books · papers · podcasts · films · courses`. Filters by route (`/library/books/` etc.), not client-side — keeps things simple and bookmarkable.

**No ratings.** Explicit decision. Ratings flatten; notes convey what's worth knowing.

### Writing archive (`/writing/`)

Not purely chronological. Group by topic with a small nav at top, then list within each topic in reverse-chronological order. Alternative: one flat reverse-chron list with topic pills next to each item. Implement the flat version first; refactor to grouped if the count gets large.

Individual post pages use the Prose layout (~620px measure, serif body, normal newspaper-style measure). At the bottom: topic links and "next / previous in [topic]" navigation.

### Projects (`/projects/`)

List with one paragraph per project. Each links to `/projects/[slug]/` for the long version. Projects are not just employment — include `deeplog`, Pfannenstiel Lagekarte, OSM contributions, etc.

### Photos (`/photos/`)

Masonry layout, newest first, unsorted otherwise. 4–8px gutter, small enough to feel like a single visual field. No albums. Click opens a lightbox showing the full image; if a `caption` exists, show it; otherwise image only.

Implementation: a small masonry CSS approach (CSS columns) works and needs no JS. A flex/grid masonry is fiddly in pure CSS; CSS columns handles it with two lines and no layout thrash.

### Now (`/now/`)

Short page. Current focus in 3–5 bullets or a short paragraph. Updated whenever. Stamp with last-updated date in frontmatter. The home rail pulls from here (either via a frontmatter `summary` field or by rendering the first N characters).

### About (`/about/`)

Longer bio, full employment history (TICKETINO, HackZurich, Digital Festival, Remote Student Exchange, Vivenu), education (UZH BSc Informatics), Zivilschutz role. Contact details. Absorbs everything removed from the home page.

---

## 7. Design system

### Typography

Two registers, not two moods:
- **Serif** (`--font-serif`) for prose, post bodies, library titles, selected-writing titles. Pick a solid editorial serif — candidates: Source Serif, Charter, EB Garamond, Literata. Self-host.
- **Sans** (`--font-sans`) for metadata, navigation, labels, rail content, UI. Candidates: Inter, IBM Plex Sans, Söhne (if licensed). Self-host.

**Scale.** 
- h1 22px / 500
- h2 18px / 500
- h3 16px / 500
- Body 15–16px / 400 / line-height 1.6–1.7
- Meta / rail 13px
- Small caps labels 11–12px, letter-spacing 0.04–0.08em, color `--color-text-secondary`

Two weights only: 400 regular, 500 medium. No 600/700.

**Sentence case everywhere.** Never Title Case, never ALL CAPS (small caps via CSS is fine for labels).

### Line length

- Prose: 60–75 characters (≈620–680px at 16px serif). Enforce via `max-width` on `<article>`.
- Rail: narrower is fine since it's scannable metadata, not reading text.

### Spacing

Vertical rhythm in rem (1, 1.5, 2, 2.5, 3). Component-internal gaps in px (4, 8, 12, 16). Generous whitespace between sections; tight within.

### Color

Define tokens in `styles/tokens.css`:

```css
:root {
  --color-bg: #fdfcf9;                    /* warm off-white */
  --color-bg-secondary: #f5f2ea;          /* subtle surface */
  --color-text-primary: #1a1817;
  --color-text-secondary: #5a564e;
  --color-text-tertiary: #8a867c;
  --color-border: rgba(0,0,0,0.08);
  --color-accent: #7a2a22;                /* RAL 2005 orange-ish, sparingly */
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #17161a;
    --color-bg-secondary: #1f1e22;
    --color-text-primary: #ebe8e0;
    --color-text-secondary: #a5a096;
    --color-text-tertiary: #6e6a60;
    --color-border: rgba(255,255,255,0.10);
    --color-accent: #e8a58c;
  }
}
```

Both modes must be designed for. Test with DevTools emulation.

### Layout patterns

- **Editorial (index pages):** 2-column grid, wider main in serif, narrower rail in sans. Collapses to single column below ~720px viewport.
- **Prose (post pages):** single column, centered, ~620px measure.
- **Full-width strips:** for photos, occasionally project hero images. Edge-to-edge within the content container.

No cards with borders-and-shadows. Use whitespace and type hierarchy. The only line-based dividers are hairlines (`0.5px solid var(--color-border)`) — use sparingly, e.g. between library rows in list view.

---

## 8. Image acquisition & CLI tooling

### Build-time image fetching

A `scripts/fetch-images.ts` script, idempotent, runs before build. Iterates every library item; if the image file isn't already cached under `/public/library/[slug].{webp,jpg}`, fetches it.

- **Books (ISBN → cover):** Open Library covers API (`https://covers.openlibrary.org/b/isbn/[isbn]-L.jpg`). No auth. Fall back to nothing (styled text tile renders).
- **Papers (arXiv ID → page 1):** fetch the PDF from `https://arxiv.org/pdf/[id]`, render page 1 to PNG via `pdf-poppler` or `pdfjs-dist`. Cache aggressively; papers don't change.
- **Films (TMDB ID → poster):** TMDB API (free, requires API key in env). `https://api.themoviedb.org/3/movie/[id]`, use `poster_path`.
- **Podcasts (iTunes ID → artwork):** iTunes Lookup API (`https://itunes.apple.com/lookup?id=[id]`). No auth.
- **Courses:** manual upload to `/public/library/[slug].jpg`, or rendered text tile.

Commit the `/public/library/` directory so builds don't refetch on every deploy. The script only fetches new items.

### CLI: `pnpm new:post`

Prompt: title, topics (comma-separated), description (for home page list).
Writes: `src/content/writing/YYYY-MM-DD-slug.md` with frontmatter filled in, empty body, opens in `$EDITOR`.

### CLI: `pnpm add:library`

Prompt: type, title, creator, date, status.
Then type-specific prompt: ISBN / arXiv ID / TMDB ID / iTunes ID / URL.
Fetches the image inline.
Writes the markdown file.
Opens in editor to optionally write a note.

Both scripts are ~100 lines of TypeScript each. Worth building early — they're what make the habit stick.

### CLI: `pnpm new:photo`

Drop a file into `/public/photos/`, script reads EXIF for date, runs through `sharp` for dimensions and WebP conversion, writes a `src/content/photos/[slug].json` metadata file.

---

## 9. Migration from Jekyll

**Posts.** Move `.md` files from Jekyll's `_posts/` to `src/content/writing/`. Frontmatter is nearly compatible; rename `layout` (drop it) and add `topics` array. Ensure permalinks resolve at `/YYYY/MM/DD/slug.html`.

**Existing posts.** Currently 5, judging from the home page. Add topics retroactively:
- "How To Teach Programming Badly" → `[teaching, engineering]`
- "Error Page Redirects Should Not Lose Information" → `[engineering, tools]`
- "Playing With The Basics" → `[learning, teaching]`
- "Digital Nicotine Patches" → `[tools, reading]` (or a new `habits` topic)
- "Paper: Algorithmic Nuggets in Content Delivery" → `[engineering, reading]`

**Bookshelf.** Migrate whatever's currently at `/bookshelf/` into library entries with `type: 'book'`. Add a 301 redirect from `/bookshelf/` to `/library/`.

**RSS.** Preserve the feed URL if one exists. Astro has an `@astrojs/rss` integration.

---

## 10. Deployment (Cloudflare Pages)

1. Create Cloudflare account, add `benjaminschneider.ch` domain (transfer DNS or use Cloudflare as nameserver).
2. Connect GitHub repo to Cloudflare Pages.
3. Build command: `pnpm build`. Build output directory: `dist`.
4. Environment variables: `TMDB_API_KEY` if using TMDB.
5. Custom domain: `benjaminschneider.ch` with automatic HTTPS.
6. Enable Cloudflare Web Analytics (optional, free, no cookie banner required).

Builds are triggered by push to `main`. PR previews happen automatically.

---

## 11. Implementation phases

Do these in order. Don't skip ahead; each phase is shippable.

### Phase 1 — Foundation + content migration (ship first)
1. Initialize Astro project, set up collections, layouts, tokens.
2. Migrate the 5 existing posts with preserved URLs.
3. Build home page with updated bio (no library yet — replace rail with a placeholder).
4. Build `/writing/` archive, `/writing/[slug]/`, `/writing/tag/[tag]/`.
5. Build `/about/` with full employment history.
6. Build `/now/`.
7. Deploy to Cloudflare Pages.

At this point the site is live, better than the current one, and unblocks writing.

### Phase 2 — Library
1. Add library collection and schema.
2. Build list view (`/library/list/` — easier to implement first).
3. Build grid view with per-type tiles.
4. Build `/library/[type]/` filtered routes.
5. Build `/library/[slug]/` note pages.
6. Add image-fetching script. Start with books (Open Library) — highest volume, cleanest API.
7. Add paper page-one rendering.
8. Add films (TMDB), podcasts (iTunes).
9. Wire up the home-page "Reading" rail to pull `status: 'now'` items.
10. Build `pnpm add:library` CLI.
11. Migrate bookshelf content, add 301.

### Phase 3 — Photos
1. Add photos collection, metadata-only entries.
2. Build `/photos/` masonry page.
3. Build lightbox (can be pure CSS `:target` trick or a tiny JS module).
4. Add `pnpm new:photo` CLI.
5. Wire up home-page photo strip.

### Phase 4 — Polish
1. `pnpm new:post` CLI.
2. RSS feed.
3. Topic pages that show writing + library items on the same tag.
4. Dark mode review.
5. Cloudflare Web Analytics.
6. Open Graph images (auto-generated per post from title).

---

## 12. What to tell Claude Code at kickoff

> I want to rebuild my personal website following the attached brief. Start with Phase 1. Before writing code, read the whole brief, then confirm your understanding of the goals, the tech stack choices, and the file structure. Flag anything underspecified or any decision you'd push back on. Then scaffold the Astro project, set up the content collections in `src/content/config.ts`, and ask me for the five existing post URLs so you can migrate them with preserved paths.

Keep the brief in the repo as `docs/BRIEF.md`. Future Claude Code sessions reference it.
