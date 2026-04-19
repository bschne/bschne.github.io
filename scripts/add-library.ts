/**
 * Add a new library item (book, paper, podcast, film, course).
 * Fetches cover automatically where possible.
 * Run: pnpm add:library
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as p from '@clack/prompts';

try { process.loadEnvFile(); } catch {}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}

async function fetchBookCoverUrl(title: string, creator: string): Promise<string | null> {
  const author = creator.split(';')[0].split(',')[0].trim();
  const q = encodeURIComponent(`${title} ${author}`);
  const res = await fetch(`https://openlibrary.org/search.json?q=${q}&limit=3&fields=cover_i`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) return null;
  const data = await res.json() as { docs: Array<{ cover_i?: number }> };
  const coverId = data.docs.find(d => d.cover_i)?.cover_i;
  return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null;
}

async function fetchPodcastCoverUrl(title: string): Promise<string | null> {
  const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(title)}&media=podcast&limit=3`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) return null;
  const data = await res.json() as { results: Array<{ artworkUrl600?: string }> };
  return data.results[0]?.artworkUrl600 ?? null;
}

async function downloadImage(url: string, slug: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const ext = (res.headers.get('content-type') ?? '').includes('png') ? '.png' : '.jpg';
    const dest = path.join('public/covers', `${slug}${ext}`);
    await fs.mkdir('public/covers', { recursive: true });
    await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
    return `/covers/${slug}${ext}`;
  } catch { return null; }
}

p.intro('add library item');

const type = await p.select({
  message: 'Type',
  options: [
    { value: 'book', label: 'book' },
    { value: 'paper', label: 'paper' },
    { value: 'podcast', label: 'podcast' },
    { value: 'film', label: 'film' },
    { value: 'course', label: 'course' },
  ],
}) as string;
if (p.isCancel(type)) { p.cancel('Cancelled.'); process.exit(0); }

const answers = await p.group({
  title: () => p.text({ message: 'Title', validate: v => v.trim() ? undefined : 'Required' }),
  creator: () => p.text({ message: type === 'film' ? 'Director' : type === 'podcast' ? 'Host(s)' : 'Author(s)', validate: v => v.trim() ? undefined : 'Required' }),
  status: () => p.select({
    message: 'Status',
    options: [
      { value: 'done', label: 'done' },
      { value: 'now', label: 'now — currently reading/watching' },
      { value: 'ongoing', label: 'ongoing' },
    ],
  }),
  ...(type === 'book' ? {
    genre: () => p.select({
      message: 'Genre',
      options: [
        { value: 'non-fiction', label: 'non-fiction' },
        { value: 'fiction', label: 'fiction' },
        { value: 'textbook', label: 'textbook' },
      ],
    }),
  } : {}),
  url: () => p.text({ message: 'URL (optional)' }),
  topics: () => p.text({ message: 'Topics (comma-separated, optional)' }),
}, {
  onCancel: () => { p.cancel('Cancelled.'); process.exit(0); },
});

const slug = slugify(answers.title);
const filepath = path.join('src/content/library', `${slug}.md`);

// Check for collision
try {
  await fs.access(filepath);
  p.cancel(`File already exists: ${filepath}`);
  process.exit(1);
} catch {}

// Fetch cover
let imagePath: string | null = null;
const fetchSpinner = p.spinner();
fetchSpinner.start('Fetching cover');

let remoteUrl: string | null = null;
if (type === 'book') remoteUrl = await fetchBookCoverUrl(answers.title, answers.creator);
else if (type === 'podcast') remoteUrl = await fetchPodcastCoverUrl(answers.title);

if (remoteUrl) {
  imagePath = await downloadImage(remoteUrl, slug);
}

if (imagePath) fetchSpinner.stop(`Cover saved to ${imagePath}`);
else fetchSpinner.stop('No cover found — you can add one manually');

// Build frontmatter
const topics = answers.topics
  ? answers.topics.split(',').map((t: string) => t.trim()).filter(Boolean)
  : [];

const lines = [
  '---',
  `type: ${type}`,
  ...(type === 'book' ? [`genre: ${answers.genre}`] : []),
  `title: "${answers.title.replace(/"/g, '\\"')}"`,
  `creator: "${answers.creator.replace(/"/g, '\\"')}"`,
  `status: ${answers.status}`,
  `topics: [${topics.join(', ')}]`,
  ...(imagePath ? [`image: ${imagePath}`] : []),
  ...(answers.url ? [`url: "${answers.url}"`] : []),
  '---',
  '',
  '',
];

await fs.writeFile(filepath, lines.join('\n'));
p.note(filepath, 'created');

const editor = process.env.EDITOR || process.env.VISUAL || 'nano';
spawnSync(editor, [filepath], { stdio: 'inherit' });

p.outro('Done.');
