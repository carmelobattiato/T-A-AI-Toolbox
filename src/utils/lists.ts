export function parseList(text: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of text.split(';')) {
    const value = part.trim();
    const key = value.toLowerCase();
    if (value && !seen.has(key)) {
      seen.add(key);
      result.push(value);
    }
  }
  return result;
}

export function formatList(list?: string[]): string {
  return (list ?? []).join('; ');
}
