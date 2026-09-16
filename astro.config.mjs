import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import { rehypeProseImages } from './src/lib/rehype-prose-images';

export default defineConfig({
  site: 'https://benjaminschneider.ch',
  integrations: [mdx()],
  build: {
    format: 'file',
  },
  markdown: {
    processor: unified({ rehypePlugins: [rehypeProseImages] }),
  },
  redirects: {
    '/bookshelf': { status: 301, destination: '/library' },
    /* the tag vocabulary was renamed; these three shipped under the old names */
    '/writing/tag/engineering': { status: 301, destination: '/writing/tag/software' },
    '/writing/tag/teaching': { status: 301, destination: '/writing/tag/learning' },
    '/writing/tag/information-design': { status: 301, destination: '/writing/tag/design' },
    '/writing/tag/tools': { status: 301, destination: '/writing' },
  },
});
