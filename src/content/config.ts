import { defineCollection, z } from 'astro:content';

const writing = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    topics: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    selected: z.boolean().default(false),
  }),
});

const library = defineCollection({
  type: 'content',
  schema: z.object({
    type: z.enum(['book', 'paper', 'podcast', 'film', 'course']),
    title: z.string(),
    creator: z.string(),
    date: z.coerce.date().optional(),
    status: z.enum(['now', 'ongoing', 'done']).default('done'),
    starred: z.boolean().default(false),
    genre: z.enum(['fiction', 'non-fiction', 'textbook']).optional(),
    topics: z.array(z.string()).default([]),
    isbn: z.string().optional(),
    arxiv: z.string().optional(),
    doi: z.string().optional(),
    tmdb: z.string().optional(),
    imdb: z.string().optional(),
    itunesId: z.string().optional(),
    url: z.string().url().optional(),
    blurb: z.string().optional(),
    inline: z.boolean().default(false),
    image: z.string().optional(),
    imageColor: z.string().optional(),
    edition: z.string().optional(),
    year: z.number().optional(),
    episode: z.string().optional(),
  }),
});

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    date: z.coerce.date(),
    status: z.enum(['active', 'shipped', 'archived']).default('shipped'),
    url: z.string().url().optional(),
    repo: z.string().url().optional(),
    topics: z.array(z.string()).default([]),
    image: z.string().optional(),
  }),
});

const photos = defineCollection({
  type: 'data',
  schema: z.object({
    file: z.string(),
    date: z.coerce.date(),
    caption: z.string().optional(),
    location: z.string().optional(),
    width: z.number(),
    height: z.number(),
  }),
});

export const collections = { writing, library, projects, photos };
