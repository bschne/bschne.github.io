export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
  });
}

export function jekyllPath(date: Date, id: string): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const slug = id.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.mdx?$/, '');
  return `/${y}/${m}/${d}/${slug}.html`;
}
