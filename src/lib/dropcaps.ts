import { readFileSync } from 'node:fs';
import { fromHtml } from 'hast-util-from-html';
import type { Element, ElementContent } from 'hast';

/**
 * The drop caps in `src/data/dropcaps/`, ready to drop into a document.
 *
 * Each file is one of a 26-letter set exported by the generator whose
 * settings are kept beside them in `generator.json` — a Playfair Display
 * capital with a surveyor's apparatus drawn over it in the accent, and on
 * most letters a contour hatch knocked out of the stem by a luminance mask.
 * They are read verbatim, which is what makes a regenerated export a drop-in
 * replacement: everything the page needs from them — the two colours and the
 * geometry — is worked out here and in prose.css rather than edited in.
 *
 * Both colours the export hard-codes are colours this site already has a
 * token for, so they are swapped for the tokens: the ink follows the body
 * text, which is what carries a cap through a theme switch, and the
 * apparatus follows the accent. The exception is anything inside a <mask>,
 * where black and white are not colours but how much of the letter shows
 * through — recolouring those would erase the hatch.
 */

/** the generator's `ink` and `accent` settings */
const INK = '#000000';
const ACCENT = '#ff4d06';

/**
 * The generator's `overshoot`: the frame clears the glyph by this many units
 * either side. So the glyph's own right edge is the viewBox's right edge less
 * 18, with no need to measure the letter — and the apparatus is free to reach
 * into that margin, which is the measurement that matters (see hangRight).
 */
const FRAME = 18;

const TAU = Math.PI * 2;
const turn = (angle: number) => ((angle % TAU) + TAU) % TAU;

/**
 * The rightmost point of a circular arc: its two endpoints, and — if the arc
 * sweeps through the three o'clock position — the circle's own right edge.
 * Which of the two circles through the endpoints the arc is drawn on is
 * settled by trying both and keeping the one whose swept angle agrees with
 * the large-arc flag. In SVG's y-down space the angle grows the way the
 * sweep flag calls positive, so both follow the same sign.
 */
function arcRight(
  x0: number, y0: number,
  x1: number, y1: number,
  r: number, large: boolean, sweep: boolean
): number {
  const ends = Math.max(x0, x1);
  const chord = Math.hypot(x1 - x0, y1 - y0);
  if (chord === 0) return ends;

  const radius = Math.max(r, chord / 2);
  const rise = Math.sqrt(Math.max(0, radius ** 2 - (chord / 2) ** 2));
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const ux = -(y1 - y0) / chord;
  const uy = (x1 - x0) / chord;

  for (const side of [1, -1]) {
    const cx = mx + side * rise * ux;
    const cy = my + side * rise * uy;
    const a0 = Math.atan2(y0 - cy, x0 - cx);
    const a1 = Math.atan2(y1 - cy, x1 - cx);
    const swept = sweep ? turn(a1 - a0) : turn(a0 - a1);
    if (swept > Math.PI !== large) continue;
    const toRight = sweep ? turn(-a0) : turn(a0);
    return toRight <= swept ? Math.max(ends, cx + radius) : ends;
  }

  return NaN;
}

/**
 * The rightmost point a path reaches. A cubic is bounded by its control hull
 * rather than solved, which can only ever be generous, and a gutter is not
 * the place to be exact to a tenth of a unit. Anything this was not written
 * for comes back NaN, and the caller falls back to the full frame.
 */
function pathRight(d: string): number {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  let right = -Infinity;
  let command = '';
  let x = 0;
  let y = 0;
  let i = 0;

  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) {
      command = tokens[i++];
      if (command === 'Z' || command === 'z') continue;
    }
    const n = (at: number) => Number(tokens[i + at]);

    switch (command) {
      /* an implicit repeat after M is an L, which for an extent is the same */
      case 'M':
      case 'L':
        right = Math.max(right, n(0));
        [x, y] = [n(0), n(1)];
        i += 2;
        break;
      case 'C':
        right = Math.max(right, n(0), n(2), n(4));
        [x, y] = [n(4), n(5)];
        i += 6;
        break;
      case 'A':
        right = Math.max(right, arcRight(x, y, n(5), n(6), n(0), n(3) === 1, n(4) === 1));
        [x, y] = [n(5), n(6)];
        i += 7;
        break;
      default:
        return NaN;
    }
  }

  return right;
}

/** the rightmost ink in a subtree, stroke included */
function inkRight(node: Element, strokeWidth: number, stroked: boolean): number {
  let right = -Infinity;

  for (const child of node.children) {
    if (child.type !== 'element') continue;
    const { d, cx, r, stroke, strokeWidth: width } = child.properties;

    const nextWidth = width === undefined ? strokeWidth : Number(width);
    const nextStroked = stroke === undefined ? stroked : stroke !== 'none';
    const pad = nextStroked ? nextWidth / 2 : 0;

    if (child.tagName === 'path' && typeof d === 'string') {
      right = Math.max(right, pathRight(d) + pad);
    } else if (child.tagName === 'circle') {
      right = Math.max(right, Number(cx) + Number(r) + pad);
    }

    right = Math.max(right, inkRight(child, nextWidth, nextStroked));
  }

  return right;
}

/**
 * How far the apparatus reaches past the glyph's right edge, in viewBox
 * units, which prose.css needs to know to set the gutter: the frame is a
 * fixed 18 units wide on every letter, but what is drawn in it is not. A W
 * has nothing there and wants the text close; the arc beside an I fills all
 * but 5 units of it, and text set to the glyph would run into the arc.
 *
 * Anything unmeasurable falls back to the full frame, which is the loose,
 * safe answer — a wider gutter rather than an overlap.
 */
function hangRight(svg: Element, viewBox: number[]): number {
  const glyphRight = viewBox[0] + viewBox[2] - FRAME;
  const accent = svg.children.find(
    (child): child is Element =>
      child.type === 'element' &&
      Array.isArray(child.properties.className) &&
      child.properties.className.includes('dc-accent')
  );
  if (!accent) return 0;

  const hang = inkRight(accent, 1, true) - glyphRight;
  if (!Number.isFinite(hang)) return FRAME;
  return Math.min(Math.max(hang, 0), FRAME);
}

function retheme(node: Element, inMask: boolean) {
  for (const child of node.children) {
    if (child.type !== 'element') continue;
    const masked = inMask || child.tagName === 'mask';
    if (!masked) {
      for (const prop of ['fill', 'stroke'] as const) {
        if (child.properties[prop] === INK) child.properties[prop] = 'currentColor';
        else if (child.properties[prop] === ACCENT) {
          child.properties[prop] = 'var(--color-accent)';
        }
      }
    }
    retheme(child, masked);
  }
}

const cache = new Map<string, Element | null>();

function load(letter: string): Element | null {
  const url = new URL(`../data/dropcaps/dropcap-${letter}.svg`, import.meta.url);

  let source: string;
  try {
    source = readFileSync(url, 'utf8');
  } catch {
    return null;
  }

  const root = fromHtml(source, { fragment: true, space: 'svg' });
  const svg = root.children.find(
    (child): child is Element => child.type === 'element' && child.tagName === 'svg'
  );
  if (typeof svg?.properties.viewBox !== 'string') return null;

  const viewBox = svg.properties.viewBox.split(/[\s,]+/).map(Number);
  retheme(svg, false);

  /* the width and height attributes stay: they are the intrinsic size the
     `width: auto` in prose.css takes the cap's aspect ratio from. The letter
     itself is announced by the .sr-only span rehype-dropcap.ts leaves in the
     text, so the drawing is furniture as far as assistive tech is concerned */
  svg.properties.className = ['dropcap'];
  svg.properties['aria-hidden'] = 'true';
  svg.properties.focusable = 'false';
  svg.properties.style = `--dropcap-hang: ${hangRight(svg, viewBox).toFixed(2)}`;

  return svg;
}

/**
 * The cap for a letter, or null if the set has no such file. A fresh copy
 * each time, so a letter opening two posts is not the same node twice.
 */
export function dropcap(letter: string): ElementContent | null {
  if (!/^[A-Z]$/.test(letter)) return null;

  if (!cache.has(letter)) cache.set(letter, load(letter));
  const svg = cache.get(letter);

  return svg ? (structuredClone(svg) as Element) : null;
}
