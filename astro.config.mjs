import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://benjaminschneider.ch',
  integrations: [mdx()],
  build: {
    format: 'file',
  },
  redirects: {
    '/bookshelf': { status: 301, destination: '/library' },
  },
});
