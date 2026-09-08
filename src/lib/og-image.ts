import { getImage } from 'astro:assets';

/**
 * Social cards want a 1200×630 (1.91:1) image. Posts get one by cropping their
 * lead image: whatever `image:` names in frontmatter, or — the usual case, so
 * that posts need no frontmatter for this — the first image in the body.
 */

const OG_WIDTH = 1200;
const OG_ASPECT = 1200 / 630;

const postImages = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/posts/**/*.{jpg,jpeg,png,webp,avif}',
  { eager: true }
);

const FIRST_MARKDOWN_IMAGE = /!\[[^\]]*\]\(\s*([^)\s]+)/;

/**
 * Post images live in `src/assets/posts/<post-slug>/`. Markdown references them
 * by a relative path (`../../assets/posts/…`); frontmatter names one by its
 * bare filename. Resolve either against the glob's absolute keys.
 */
function lookup(postId: string, ref: string): ImageMetadata | undefined {
  const dir = postId.replace(/\.mdx?$/, '');
  const inAssets = ref.match(/assets\/posts\/(.+)$/);
  const rel = inAssets ? inAssets[1] : `${dir}/${ref.replace(/^\.?\//, '')}`;
  return postImages[`/src/assets/posts/${rel}`]?.default;
}

export interface OgImage {
  url: string;
  width: number;
  height: number;
}

export async function getPostOgImage(
  post: { id: string; body?: string; data: { image?: string } },
  site: URL
): Promise<OgImage | undefined> {
  const ref = post.data.image ?? post.body?.match(FIRST_MARKDOWN_IMAGE)?.[1];
  const source = ref ? lookup(post.id, ref) : undefined;
  if (!source) return undefined;

  // Sharp won't enlarge, so asking for more than the original can give would
  // make the declared width/height a lie. Cap at the widest 1.91:1 crop it has.
  const widestCrop = Math.min(source.width, source.height * OG_ASPECT);
  const width = Math.round(Math.min(OG_WIDTH, widestCrop));
  const height = Math.round(width / OG_ASPECT);

  const image = await getImage({
    src: source,
    width,
    height,
    fit: 'cover',
    format: 'jpeg',
    quality: 82,
  });

  return { url: new URL(image.src, site).href, width, height };
}
