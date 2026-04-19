/**
 * Fetches cover images for library items and writes them to public/covers/.
 * Updates the `image` frontmatter field in each .md file.
 *
 * Sources:
 *   books    → Open Library search (title + author)
 *   podcasts → iTunes Search API
 *   films    → TMDB (requires TMDB_API_KEY in .env — skipped if absent)
 *   papers   → skipped (text tiles are intentional)
 *   courses  → skipped
 *
 * Idempotent: items with `image:` already set are skipped.
 * Run: pnpm fetch-covers
 */

import fs from 'node:fs/promises';
import path from 'node:path';

// Load .env if present (graceful — no error if file doesn't exist)
try { process.loadEnvFile(); } catch {}

const LIBRARY_DIR = 'src/content/library';
const COVERS_DIR = 'public/covers';

// ── frontmatter helpers ───────────────────────────────────────────────────────

function getFrontmatterField(content: string, key: string): string | undefined {
  const match = content.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return match?.[1]?.trim().replace(/^["']|["']$/g, '');
}

function hasFrontmatterField(content: string, key: string): boolean {
  return new RegExp(`^${key}:`, 'm').test(content);
}

/** Insert a field just before the closing --- of the frontmatter block. */
function addFrontmatterField(content: string, key: string, value: string): string {
  const first = content.indexOf('---');
  const second = content.indexOf('\n---', first + 3);
  if (second === -1) return content;
  return content.slice(0, second + 1) + `${key}: ${value}\n` + content.slice(second + 1);
}

// ── image download ────────────────────────────────────────────────────────────

async function downloadImage(url: string, slug: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') ?? '';
    const ext = contentType.includes('png') ? '.png' : '.jpg';
    const dest = path.join(COVERS_DIR, `${slug}${ext}`);
    await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
    return `/covers/${slug}${ext}`;
  } catch {
    return null;
  }
}

// ── per-type fetchers ─────────────────────────────────────────────────────────

async function fetchBookCoverUrl(title: string, creator: string): Promise<string | null> {
  const author = creator.split(';')[0].split(',')[0].trim();
  const q = encodeURIComponent(`${title} ${author}`);
  const res = await fetch(
    `https://openlibrary.org/search.json?q=${q}&limit=3&fields=cover_i,title`,
    { signal: AbortSignal.timeout(10_000) },
  );
  if (!res.ok) return null;
  const data = await res.json() as { docs: Array<{ cover_i?: number }> };
  const coverId = data.docs.find(d => d.cover_i)?.cover_i;
  if (!coverId) return null;
  return `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
}

async function fetchPodcastCoverUrl(title: string): Promise<string | null> {
  const term = encodeURIComponent(title);
  const res = await fetch(
    `https://itunes.apple.com/search?term=${term}&media=podcast&limit=3`,
    { signal: AbortSignal.timeout(10_000) },
  );
  if (!res.ok) return null;
  const data = await res.json() as { results: Array<{ artworkUrl600?: string; collectionName?: string }> };
  return data.results[0]?.artworkUrl600 ?? null;
}

async function fetchFilmCoverUrl(title: string, year: string | undefined): Promise<string | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return null;
  const q = encodeURIComponent(title);
  const yearParam = year ? `&year=${year}` : '';
  const res = await fetch(
    `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${q}${yearParam}&limit=1`,
    { signal: AbortSignal.timeout(10_000) },
  );
  if (!res.ok) return null;
  const data = await res.json() as { results: Array<{ poster_path?: string }> };
  const poster = data.results[0]?.poster_path;
  if (!poster) return null;
  return `https://image.tmdb.org/t/p/w500${poster}`;
}

// ── main ──────────────────────────────────────────────────────────────────────

await fs.mkdir(COVERS_DIR, { recursive: true });

const files = (await fs.readdir(LIBRARY_DIR)).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

let fetched = 0;
let skipped = 0;
let failed = 0;

for (const file of files) {
  const slug = file.replace(/\.mdx?$/, '');
  const filepath = path.join(LIBRARY_DIR, file);
  const content = await fs.readFile(filepath, 'utf-8');

  if (hasFrontmatterField(content, 'image')) {
    skipped++;
    continue;
  }

  const type = getFrontmatterField(content, 'type');
  const title = getFrontmatterField(content, 'title') ?? slug;
  const creator = getFrontmatterField(content, 'creator') ?? '';
  const year = getFrontmatterField(content, 'year');

  let remoteUrl: string | null = null;

  if (type === 'book') {
    remoteUrl = await fetchBookCoverUrl(title, creator);
  } else if (type === 'podcast') {
    remoteUrl = await fetchPodcastCoverUrl(title);
  } else if (type === 'film') {
    if (!process.env.TMDB_API_KEY) {
      console.log(`  film  ${slug} — skipped (set TMDB_API_KEY in .env to fetch film covers)`);
      skipped++;
      continue;
    }
    remoteUrl = await fetchFilmCoverUrl(title, year);
  } else {
    skipped++;
    continue;
  }

  if (!remoteUrl) {
    console.warn(`  ✗     ${slug} — no cover found`);
    failed++;
    continue;
  }

  const localPath = await downloadImage(remoteUrl, slug);
  if (!localPath) {
    console.warn(`  ✗     ${slug} — download failed`);
    failed++;
    continue;
  }

  const updated = addFrontmatterField(content, 'image', localPath);
  await fs.writeFile(filepath, updated);
  console.log(`  ✓     ${slug}`);
  fetched++;
}

console.log(`\nDone: ${fetched} fetched, ${skipped} skipped, ${failed} failed`);
