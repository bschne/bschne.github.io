/** A library view: any combination of the three facets, each one optional. */
export interface LibraryFilter {
  type?: string;
  genre?: string;
  topic?: string;
  starred?: boolean;
}

/**
 * Single-facet filter routes — the entry points a link, a bookmark or a reader
 * without JS gets. Combinations of facets live in the query string instead;
 * see the script in `LibraryList.astro`.
 */
export const FILTER_ROUTES: Record<string, LibraryFilter> = {
  books: { type: 'book' },
  fiction: { type: 'book', genre: 'fiction' },
  'non-fiction': { type: 'book', genre: 'non-fiction' },
  textbooks: { type: 'book', genre: 'textbook' },
  papers: { type: 'paper' },
  essays: { type: 'essay' },
  podcasts: { type: 'podcast' },
  films: { type: 'film' },
  courses: { type: 'course' },
  starred: { starred: true },
};
