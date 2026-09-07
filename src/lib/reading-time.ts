export function getWordCount(text: string): number {
  // Remove code blocks, HTML tags, and markdown links
  const cleaned = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[^\w\s'-]/g, ' ');

  const words = cleaned.trim().split(/\s+/).filter(word => word.length > 0);
  return words.length;
}

export function getReadingTime(wordCount: number): number {
  // Average reading speed: 200 words per minute
  const minutes = Math.ceil(wordCount / 200);
  return minutes;
}

export function formatReadingTime(minutes: number): string {
  if (minutes === 1) {
    return '1 min read';
  }
  return `${minutes} min read`;
}
