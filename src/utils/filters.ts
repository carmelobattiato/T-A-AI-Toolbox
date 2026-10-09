import { Item } from '../types/index.ts';
import { parseList } from './lists.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

export function matchesAge(item: Item, maxAgeDays: number | null): boolean {
  if (maxAgeDays === null) return true;
  const created = Date.parse(item.createdAt);
  if (Number.isNaN(created)) return false;
  return Date.now() - created <= maxAgeDays * DAY_MS;
}

export function matchesTagQuery(item: Item, query: string): boolean {
  const wanted = parseList(query).map(t => t.toLowerCase());
  if (wanted.length === 0) return true;
  const own = [...(item.tags ?? []), ...(item.customers ?? [])].map(v => v.toLowerCase());
  return wanted.some(term => own.some(value => value.startsWith(term)));
}
