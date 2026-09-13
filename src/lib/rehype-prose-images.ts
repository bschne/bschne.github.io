import { SKIP, visit } from 'unist-util-visit';
import type { Element, ElementContent, Root } from 'hast';

/**
 * Two jobs, both about what markdown alone can't say.
 *
 * First: a paragraph that holds nothing but image(s), optionally closed by an
 * italic line, is a figure — `<figure>` with the italic line as its
 * `<figcaption>`, and `.figure-pair` when there are two images. That keeps the
 * markdown an author writes down to the image and the caption under it, and
 * still hands prose.css real elements to style rather than an `img + em` that
 * has to guess at intent.
 *
 * Second: those figures render at known sizes in the prose layout (see
 * prose.css):
 *
 *   - a lone image bleeds past the 680px column: 816px at the narrow end,
 *     widening with the viewport to --prose-bleed-max (952px)
 *   - a pair sits at half the column each → 332px
 *   - anything else — an image inline in a sentence — stays at the column
 *
 * Astro can't know that, so without help it hands `getImage` the original
 * dimensions and ships multi-megabyte photos. Run before Astro's internal
 * rehypeImages, which passes these properties straight through to `getImage`.
 */

interface Preset {
  width: number;
  widths: number[];
  sizes: string;
}

const SINGLE: Preset = {
  width: 1904,
  widths: [400, 640, 816, 952, 1428, 1904],
  sizes:
    '(min-width: 1336px) 952px, (min-width: 1200px) calc(100vw - 384px), (min-width: 680px) 816px, 100vw',
};

const PAIR: Preset = {
  width: 1080,
  widths: [332, 480, 664, 828, 1080],
  sizes: '(min-width: 680px) 332px, (min-width: 640px) 50vw, 100vw',
};

const COLUMN: Preset = {
  width: 1360,
  widths: [400, 680, 1020, 1360],
  sizes: '(min-width: 680px) 680px, 100vw',
};

const isBlank = (node: ElementContent) => node.type === 'text' && node.value.trim() === '';

const isTag = (node: ElementContent, tagName: string): node is Element =>
  node.type === 'element' && node.tagName === tagName;

/**
 * The figure hiding in a paragraph: one or more images, and a trailing `<em>`
 * if the author wrote a caption under them. Anything else — a sentence with an
 * image in it, an image sharing the paragraph with a link — is not a figure.
 */
function figureParts(paragraph: Element) {
  const children = paragraph.children.filter(child => !isBlank(child));
  if (children.length === 0) return null;

  const last = children[children.length - 1];
  const caption = isTag(last, 'em') ? last : null;
  const images = caption ? children.slice(0, -1) : children;
  if (images.length === 0 || !images.every(child => isTag(child, 'img'))) return null;

  return { images: images as Element[], caption };
}

function size(images: Element[], preset: Preset) {
  for (const img of images) {
    if ('width' in img.properties || 'sizes' in img.properties) continue;
    img.properties.width = preset.width;
    img.properties.widths = preset.widths;
    img.properties.sizes = preset.sizes;
  }
}

export function rehypeProseImages() {
  return function (tree: Root) {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'p' || !parent || index === undefined) return;

      const parts = figureParts(node);
      if (!parts) return;

      const { images, caption } = parts;
      const pair = images.length > 1;
      size(images, pair ? PAIR : SINGLE);

      const figure: Element = {
        type: 'element',
        tagName: 'figure',
        properties: pair ? { className: ['figure-pair'] } : {},
        children: [...images],
      };

      if (caption) {
        figure.children.push({
          type: 'element',
          tagName: 'figcaption',
          properties: {},
          children: caption.children,
        });
      }

      (parent.children as ElementContent[])[index] = figure;
      return SKIP;
    });

    // whatever is left is an image in the run of a sentence, at the column width
    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'img') size([node], COLUMN);
    });
  };
}
