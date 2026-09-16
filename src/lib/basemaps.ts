/**
 * The tile services a route map may be drawn on.
 *
 * A basemap is only ever a URL template plus the things a viewer has to be
 * told about it, so swapping Kartverket for another service is adding an
 * entry here and naming it in the component's `basemap` prop — nothing in
 * RouteMap.astro knows which map it is drawing on.
 *
 * `dark` is the one field that is not simply administrative. A tile service
 * serves one set of tiles, drawn for a light page, and there is no dark
 * variant to switch to; a greyscale line map, though, survives being inverted
 * — white paper becomes dark ground, black contours become light strokes, and
 * the result reads as the same map at night. A map with colour in it does not
 * survive that (forest goes magenta), so each basemap declares for itself
 * whether the dark page may invert it.
 *
 * Inverting alone is not enough, and the trap is that the obvious corrections
 * make it worse. A printed map is drawn at full contrast because paper is
 * white; invert it and you get near-black ground under near-white linework,
 * which on a screen at night is a glare. Reaching for brightness() to calm it
 * only deepens the ground, because brightness multiplies and cannot lift a
 * black. contrast() below 1 is the lever that can: it pulls both ends towards
 * mid-grey, lifting the ground and dimming the lines at once, and brightness()
 * afterwards places the pair where you want them. The two endpoints land at
 *
 *     ground = b(0.5 + 0.5c)      lines = b(0.5 - 0.5c)
 *
 * so a chosen pair can be solved for exactly, which is how the numbers below
 * were picked rather than guessed. They put the linework on
 * --color-text-secondary and the ground a shade above --color-bg: the map is
 * lit like a paragraph of body text on this page, and its ground sits just
 * clear of the page's own so the panel reads as a panel.
 */
export interface Basemap {
  /** shown in the map's attribution line */
  name: string;
  /** XYZ template; {z}/{x}/{y} and {s} for a subdomain, as Leaflet reads it */
  url: string;
  /** HTML, credited in the corner of the map — a licence link belongs here */
  attribution: string;
  /** how far in the service will serve tiles */
  maxZoom: number;
  /** a CSS filter that turns the tiles into a dark-page version, if one does */
  dark?: string;
  subdomains?: string;
}

/**
 * Kartverket's WMTS cache, in the webmercator matrix set, which is XYZ under
 * another name. Free and open under CC BY 4.0, no key.
 * https://kartkatalog.geonorge.no/metadata/bakgrunnskart-uten-etiketter-wmts/
 */
const kartverket = (layer: string) =>
  `https://cache.kartverket.no/v1/wmts/1.0.0/${layer}/default/webmercator/{z}/{y}/{x}.png`;

const KARTVERKET_ATTRIBUTION =
  '&copy; <a href="https://www.kartverket.no/api-og-data/vilkar-for-bruk">Kartverket</a>';

export const basemaps = {
  /* the norgeskart greytone: contours, water and trails, no colour */
  'norgeskart-graatone': {
    name: 'Norgeskart gråtone',
    url: kartverket('topograatone'),
    attribution: KARTVERKET_ATTRIBUTION,
    maxZoom: 18,
    /* ground #171717, linework #a1a1a1 — see the note above */
    dark: 'invert(1) contrast(0.75) brightness(0.72)',
  },
  'norgeskart-topo': {
    name: 'Norgeskart topo',
    url: kartverket('topo'),
    attribution: KARTVERKET_ATTRIBUTION,
    maxZoom: 18,
  },
  osm: {
    name: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
} satisfies Record<string, Basemap>;

export type BasemapId = keyof typeof basemaps;

export const defaultBasemap: BasemapId = 'norgeskart-graatone';
