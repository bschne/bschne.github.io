/**
 * A `creator` is a semicolon-separated list of names, each written surname
 * first ("Adams, Gabrielle S.; Converse, Benjamin A."), which is the order a
 * shelf is sorted in and the order the library list sorts on.
 *
 * A row has room for one name, so what it shows follows the citation
 * convention rather than silently keeping the first author and dropping the
 * rest: two authors are both named, three or more become the first and the
 * others as `et al.` — which at least says out loud that there are others.
 * The item's own page has the room to name everyone, so it does.
 */
export function creatorList(creator: string): string[] {
  return creator.split(';').map(name => name.trim()).filter(Boolean);
}

export function creatorShort(creator: string): string {
  const names = creatorList(creator);
  if (names.length <= 1) return creator.trim();
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names[0]} et al.`;
}
