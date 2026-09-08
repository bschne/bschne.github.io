import { visit } from 'unist-util-visit';
import type { Root, Element } from 'hast';

/**
 * Markdown images render at known sizes in the prose layout (see prose.css):
 *
 *   - a single image in its own paragraph bleeds past the 680px column: 816px
 *     at the narrow end, widening with the viewport to --prose-bleed-max (952px)
 *   - two images in one paragraph (the .img-pair wrapper) sit at 50% each → 332px
 *
 * Astro can't know that, so without help it hands `getImage` the original
 * dimensions and ships multi-megabyte photos. Run before Astro's internal
 * rehypeImages, which passes these properties straight through to `getImage`.
 */

const SINGLE = {
  width: 1904,
  widths: [400, 640, 816, 952, 1428, 1904],
  sizes:
    '(min-width: 1336px) 952px, (min-width: 1200px) calc(100vw - 384px), (min-width: 680px) 816px, 100vw',
};

const PAIR = {
  width: 1080,
  widths: [332, 480, 664, 828, 1080],
  sizes: '(min-width: 680px) 332px, (min-width: 640px) 50vw, 100vw',
};

export function rehypeProseImages() {
  return function (tree: Root) {
    visit(tree, 'element', (node: Element) => {
      const images = node.children.filter(
        (child): child is Element => child.type === 'element' && child.tagName === 'img'
      );
      if (images.length === 0) return;

      const preset = images.length > 1 ? PAIR : SINGLE;
      for (const img of images) {
        if ('width' in img.properties || 'sizes' in img.properties) continue;
        img.properties.width = preset.width;
        img.properties.widths = preset.widths;
        img.properties.sizes = preset.sizes;
      }
    });
  };
}
