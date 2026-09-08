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
  },
});
