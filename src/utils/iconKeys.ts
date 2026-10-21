// Icon keys chosen in the forms and stored on items and phases. Shared with the server,
// which accepts only these values (anything else is dropped). Keep in sync with ICON_OPTIONS in icons.tsx.
export const ICON_KEYS = [
  'document', 'search', 'chart', 'database', 'cog', 'check', 'transfer', 'users',
  'compass', 'layers', 'lightbulb', 'sparkles', 'cpu', 'wrench', 'boxes', 'filecode',
  'share', 'list', 'checkcircle', 'message', 'foldergit', 'shield', 'repeat',
] as const;

export type IconKey = (typeof ICON_KEYS)[number];

export function isIconKey(value: unknown): value is IconKey {
  return typeof value === 'string' && (ICON_KEYS as readonly string[]).includes(value);
}
