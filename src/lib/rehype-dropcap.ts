import type { Element, ElementContent, Root } from 'hast';
import { dropcap } from './dropcaps';

/**
 * A drop cap on the letter a post opens with.
 *
 * Which letter that is, is the whole question, and it is the same question
 * rehype-prose-images.ts answers about figures: what does the markdown
 * already say. The opening of a post is the first paragraph that is prose —
 * not a figure (by the time this runs, rehype-prose-images.ts has made those
 * into `<figure>`), not a heading, and not the bold standfirst line that
 * some posts carry under the title, which is a summary of the post rather
 * than its first sentence and would put the cap on a line of its own.
 *
 * The letter is then handed to the drawing, and stays in the text as an
 * `.sr-only` span: a reader hears "Antarctica", not "ntarctica", and a
 * reader with no CSS sees the letter twice rather than not at all.
 *
 * Only the writing collection. `/about` and `/now` share the prose layout
 * but are .astro pages, and a library entry's blurb is markdown too — a
 * drawn capital in either would be a cap on something that is not an essay.
 */

const WRITING = /[\\/]src[\\/]content[\\/]writing[\\/]/;

const isBlank = (node: ElementContent) => node.type === 'text' && node.value.trim() === '';

/** a paragraph holding nothing but one bold run: the standfirst under a title */
function isStandfirst(paragraph: Element) {
  const children = paragraph.children.filter(child => !isBlank(child));
  return (
    children.length === 1 &&
    children[0].type === 'element' &&
    children[0].tagName === 'strong'
  );
}

function openingParagraph(tree: Root): Element | null {
  for (const child of tree.children) {
    if (child.type !== 'element' || child.tagName !== 'p') continue;
    if (isStandfirst(child)) continue;
    return child;
  }
  return null;
}

export function rehypeDropcap() {
  /* the second argument is unified's VFile; all this needs of it is which
     file the tree came out of */
  return function (tree: Root, file: { path?: string }) {
    if (!file.path || !WRITING.test(file.path)) return;

    const paragraph = openingParagraph(tree);
    if (!paragraph) return;

    /* the first character has to be sitting in the paragraph's own text for
       the cap to replace it. A paragraph that opens inside a link or an
       italic run keeps its letter and goes without */
    const first = paragraph.children[0];
    if (first?.type !== 'text') return;

    const letter = first.value.slice(0, 1);
    const cap = dropcap(letter.toUpperCase());
    if (!cap) return;

    paragraph.children.splice(
      0,
      1,
      cap,
      {
        type: 'element',
        tagName: 'span',
        properties: { className: ['sr-only'] },
        children: [{ type: 'text', value: letter }],
      },
      { type: 'text', value: first.value.slice(1) }
    );

    const className = paragraph.properties.className;
    paragraph.properties.className = Array.isArray(className)
      ? [...className, 'has-dropcap']
      : ['has-dropcap'];
  };
}
