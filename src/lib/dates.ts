// en-GB abbreviates September as "Sept" and every other month with three
// letters, so the list is spelled out here rather than left to the runtime.
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function formatDate(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDateShort(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function jekyllPath(date: Date, id: string): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const slug = id.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.mdx?$/, '');
  return `/${y}/${m}/${d}/${slug}.html`;
}
