import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { jekyllPath } from '../lib/dates';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getCollection('writing', ({ data }) => !data.draft);
  posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  return rss({
    title: 'Benjamin Schneider',
    description: 'Writing by Benjamin Schneider.',
    site: context.site!,
    items: posts.map(post => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.description,
      link: jekyllPath(post.data.date, post.id),
    })),
  });
}
