import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import { rehypeProseImages } from './src/lib/rehype-prose-images';
import { rehypeDropcap } from './src/lib/rehype-dropcap';

export default defineConfig({
  site: 'https://benjaminschneider.ch',
  integrations: [mdx()],
  build: {
    format: 'file',
  },
  markdown: {
    /* rehypeDropcap runs second: the opening paragraph it looks for is the
       first one rehypeProseImages has not already turned into a figure */
    processor: unified({ rehypePlugins: [rehypeProseImages, rehypeDropcap] }),
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
