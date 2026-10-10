export function normalizeBaseUrl(raw: string | undefined): string {
  const trimmed = (raw ?? '').trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withScheme.toLowerCase();
}

// Returns an http(s) URL that is safe to use in an <a href>, or undefined (other schemes are dropped)
export function toSafeHref(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const isHttp = /^https?:\/\//i.test(trimmed);
  if (!isHttp && /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return undefined;
  const candidate = isHttp ? trimmed : `https://${trimmed}`;
  try {
    new URL(candidate);
  } catch {
    return undefined;
  }
  return candidate;
}
