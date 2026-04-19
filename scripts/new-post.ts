/**
 * Scaffold a new writing post.
 * Run: pnpm new:post
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as p from '@clack/prompts';

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}

p.intro('new post');

const answers = await p.group({
  title: () => p.text({ message: 'Title', validate: v => v.trim() ? undefined : 'Required' }),
  description: () => p.text({ message: 'Description (optional)' }),
  topics: () => p.text({ message: 'Topics (comma-separated, optional)' }),
}, {
  onCancel: () => { p.cancel('Cancelled.'); process.exit(0); },
});

const today = new Date();
const y = today.getFullYear();
const m = String(today.getMonth() + 1).padStart(2, '0');
const d = String(today.getDate()).padStart(2, '0');
const slug = slugify(answers.title);
const filename = `${y}-${m}-${d}-${slug}.md`;
const filepath = path.join('src/content/writing', filename);

const topics = answers.topics
  ? answers.topics.split(',').map(t => t.trim()).filter(Boolean)
  : [];

const frontmatter = [
  '---',
  `title: "${answers.title.replace(/"/g, '\\"')}"`,
  `date: ${y}-${m}-${d}`,
  answers.description ? `description: "${answers.description.replace(/"/g, '\\"')}"` : null,
  `topics: [${topics.map(t => `${t}`).join(', ')}]`,
  '---',
  '',
  '',
].filter(l => l !== null).join('\n');

await fs.writeFile(filepath, frontmatter);
p.note(filepath, 'created');

const editor = process.env.EDITOR || process.env.VISUAL || 'nano';
spawnSync(editor, [filepath], { stdio: 'inherit' });

p.outro('Done.');
