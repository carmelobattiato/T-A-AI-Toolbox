import {
  DashboardGroupBy,
  DashboardSortBy,
  DashboardTile,
  DashboardWhere,
  Item,
  ItemType,
  Phase,
} from '../types/index.ts';

export const DASHBOARD_COLUMNS = 4;
export const DASHBOARD_ROWS = 2;
export const DASHBOARD_SLOTS = DASHBOARD_COLUMNS * DASHBOARD_ROWS;
export const LIST_MAX_ROWS = 20;
export const LIST_DEFAULT_ROWS = 5;

export const ITEM_TYPES: ItemType[] = ['TOOL', 'IDEA', 'NEED'];
export const DASHBOARD_CHARTS: DashboardTile['chart'][] = ['bar', 'number', 'list'];
export const DASHBOARD_GROUP_BY: DashboardGroupBy[] = ['customer', 'tag', 'phase', 'type', 'owner', 'priority', 'month'];
export const DASHBOARD_SORT_BY: DashboardSortBy[] = ['priority', 'createdAt', 'updatedAt', 'title'];

export const TYPE_LABELS: Record<ItemType, string> = { TOOL: 'Tool', IDEA: 'WiP', NEED: 'Needs' };
export const TYPE_LABELS_SINGULAR: Record<ItemType, string> = { TOOL: 'Tool', IDEA: 'WiP', NEED: 'Need' };
export const GROUP_BY_LABELS: Record<DashboardGroupBy, string> = {
  customer: 'Customer',
  tag: 'Tag',
  phase: 'Phase',
  type: 'Type',
  owner: 'Owner',
  priority: 'Priority',
  month: 'Creation month',
};
export const SORT_BY_LABELS: Record<DashboardSortBy, string> = {
  priority: 'Priority',
  createdAt: 'Creation date',
  updatedAt: 'Last modified',
  title: 'Title',
};
export const CHART_LABELS: Record<DashboardTile['chart'], string> = {
  bar: 'Vertical bars',
  number: 'Number',
  list: 'List',
};

export const DEFAULT_TILE: DashboardTile = {
  slot: 1,
  title: 'Tools per customer',
  chart: 'bar',
  groupBy: 'customer',
  itemTypes: ['TOOL'],
};

const DAY_MS = 24 * 60 * 60 * 1000;

function cleanText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 80) : undefined;
}

function cleanPositiveInt(value: unknown, max: number): number | undefined {
  const n = Number(value);
  return value !== null && value !== '' && Number.isInteger(n) && n >= 1 ? Math.min(n, max) : undefined;
}

function cleanWhere(raw: any): DashboardWhere | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const where: DashboardWhere = {};
  const customer = cleanText(raw.customer);
  const tag = cleanText(raw.tag);
  const phase = cleanText(raw.phase);
  const owner = cleanText(raw.owner);
  const priorityMax = cleanPositiveInt(raw.priorityMax, 1000);
  const createdWithinDays = cleanPositiveInt(raw.createdWithinDays, 3650);
  if (customer) where.customer = customer;
  if (tag) where.tag = tag;
  if (phase) where.phase = phase;
  if (owner) where.owner = owner;
  if (priorityMax) where.priorityMax = priorityMax;
  if (createdWithinDays) where.createdWithinDays = createdWithinDays;
  if (typeof raw.generalizationRequired === 'boolean') where.generalizationRequired = raw.generalizationRequired;
  return Object.keys(where).length > 0 ? where : undefined;
}

export function validateTile(raw: any): { tile: DashboardTile } | { error: string } {
  const slot = Number(raw?.slot);
  if (!Number.isInteger(slot) || slot < 1 || slot > DASHBOARD_SLOTS) {
    return { error: `slot must be an integer from 1 to ${DASHBOARD_SLOTS}` };
  }
  const title = cleanText(raw?.title);
  if (!title) return { error: 'title is required' };
  if (!DASHBOARD_CHARTS.includes(raw.chart)) return { error: `allowed chart values: ${DASHBOARD_CHARTS.join(', ')}` };

  const rawTypes: unknown[] = Array.isArray(raw.itemTypes) && raw.itemTypes.length > 0 ? raw.itemTypes : ITEM_TYPES;
  const itemTypes = [...new Set(rawTypes.map(t => String(t).toUpperCase()))] as ItemType[];
  if (!itemTypes.every(t => ITEM_TYPES.includes(t))) {
    return { error: `allowed itemTypes values: ${ITEM_TYPES.join(', ')}` };
  }

  const tile: DashboardTile = { slot, title, chart: raw.chart, itemTypes };
  const where = cleanWhere(raw.where);
  if (where) tile.where = where;

  if (raw.chart === 'bar') {
    if (!DASHBOARD_GROUP_BY.includes(raw.groupBy)) return { error: `allowed groupBy values: ${DASHBOARD_GROUP_BY.join(', ')}` };
    tile.groupBy = raw.groupBy;
  }
  if (raw.chart === 'list') {
    const sortBy: DashboardSortBy = raw.sortBy ?? 'createdAt';
    if (!DASHBOARD_SORT_BY.includes(sortBy)) return { error: `allowed sortBy values: ${DASHBOARD_SORT_BY.join(', ')}` };
    if (raw.order !== undefined && raw.order !== 'asc' && raw.order !== 'desc') return { error: 'allowed order values: asc, desc' };
    tile.sortBy = sortBy;
    tile.order = raw.order ?? (sortBy === 'priority' || sortBy === 'title' ? 'asc' : 'desc');
    tile.limit = cleanPositiveInt(raw.limit, LIST_MAX_ROWS) ?? LIST_DEFAULT_ROWS;
  }
  return { tile };
}

export function describeWhere(where?: DashboardWhere): string {
  if (!where) return '';
  const parts: string[] = [];
  if (where.customer) parts.push(`customer "${where.customer}"`);
  if (where.tag) parts.push(`tag "${where.tag}"`);
  if (where.phase) parts.push(`phase "${where.phase}"`);
  if (where.owner) parts.push(`owner "${where.owner}"`);
  if (where.priorityMax) parts.push(`priority up to ${where.priorityMax}`);
  if (where.createdWithinDays) parts.push(`created in the last ${where.createdWithinDays} days`);
  if (where.generalizationRequired !== undefined) {
    parts.push(where.generalizationRequired ? 'to be generalized' : 'not to be generalized');
  }
  return parts.join(', ');
}

export function describeTile(tile: DashboardTile): string {
  const parts = [tile.itemTypes.map(t => TYPE_LABELS[t]).join(' + ')];
  const where = describeWhere(tile.where);
  if (where) parts.push(where);
  if (tile.chart === 'bar' && tile.groupBy) parts.push(`by ${GROUP_BY_LABELS[tile.groupBy]}`);
  if (tile.chart === 'list' && tile.sortBy) {
    const direction = tile.sortBy === 'priority'
      ? (tile.order === 'desc' ? 'lowest first' : 'highest first')
      : (tile.order === 'asc' ? 'ascending' : 'descending');
    parts.push(`sorted by ${SORT_BY_LABELS[tile.sortBy].toLowerCase()} (${direction})`, `top ${tile.limit}`);
  }
  return parts.join(' · ');
}

export interface Bucket {
  label: string;
  count: number;
}

const NOT_AVAILABLE = 'N/A';

function startsWithText(value: string | undefined, query: string): boolean {
  return (value ?? '').trim().toLowerCase().startsWith(query.toLowerCase());
}

function matchesWhere(item: Item, where: DashboardWhere | undefined, phaseTitles: Map<string, string>): boolean {
  if (!where) return true;
  if (where.customer && !(item.customers ?? []).some(c => startsWithText(c, where.customer!))) return false;
  if (where.tag && !(item.tags ?? []).some(t => startsWithText(t, where.tag!))) return false;
  if (where.phase && !item.phaseIds.some(id => id === where.phase || startsWithText(phaseTitles.get(id), where.phase!))) return false;
  if (where.owner && !startsWithText(item.owner, where.owner)) return false;
  if (where.priorityMax && !(item.priority != null && item.priority <= where.priorityMax)) return false;
  if (where.createdWithinDays) {
    const created = Date.parse(item.createdAt);
    if (Number.isNaN(created) || Date.now() - created > where.createdWithinDays * DAY_MS) return false;
  }
  if (where.generalizationRequired !== undefined && !!item.generalizationRequired !== where.generalizationRequired) return false;
  return true;
}

function keysOf(item: Item, groupBy: DashboardGroupBy, phaseTitles: Map<string, string>): string[] {
  switch (groupBy) {
    case 'customer':
      return item.customers ?? [];
    case 'tag':
      return item.tags ?? [];
    case 'phase':
      return item.phaseIds.map(id => phaseTitles.get(id) ?? id);
    case 'type':
      return [TYPE_LABELS[item.type]];
    case 'owner':
      return [item.owner?.trim() || NOT_AVAILABLE];
    case 'priority':
      return [item.priority != null ? `P${item.priority}` : NOT_AVAILABLE];
    case 'month':
      return [Number.isNaN(Date.parse(item.createdAt)) ? NOT_AVAILABLE : item.createdAt.slice(0, 7)];
  }
}

function sortRows(rows: Item[], sortBy: DashboardSortBy, order: 'asc' | 'desc'): Item[] {
  const direction = order === 'asc' ? 1 : -1;
  const candidates = sortBy === 'priority' ? rows.filter(i => i.priority != null) : [...rows];
  const dateOf = (item: Item) => {
    const t = Date.parse(sortBy === 'updatedAt' ? item.updatedAt : item.createdAt);
    return Number.isNaN(t) ? 0 : t;
  };
  return candidates.sort((a, b) => {
    let diff = 0;
    if (sortBy === 'priority') diff = (a.priority as number) - (b.priority as number);
    else if (sortBy === 'title') diff = a.title.localeCompare(b.title);
    else diff = dateOf(a) - dateOf(b);
    return diff * direction || a.title.localeCompare(b.title);
  });
}

export interface TileData {
  total: number;
  buckets: Bucket[];
  rows: Item[];
}

export function computeTile(tile: DashboardTile, items: Item[], phases: Phase[]): TileData {
  const phaseTitles = new Map(phases.map(p => [p.id, p.title]));
  const selected = items.filter(item => tile.itemTypes.includes(item.type) && matchesWhere(item, tile.where, phaseTitles));

  if (tile.chart === 'list') {
    const sorted = sortRows(selected, tile.sortBy ?? 'createdAt', tile.order ?? 'desc');
    return { total: sorted.length, buckets: [], rows: sorted.slice(0, tile.limit ?? LIST_DEFAULT_ROWS) };
  }
  if (tile.chart === 'number' || !tile.groupBy) return { total: selected.length, buckets: [], rows: [] };

  const counts = new Map<string, Bucket>();
  for (const item of selected) {
    const seenInItem = new Set<string>();
    for (const raw of keysOf(item, tile.groupBy, phaseTitles)) {
      const label = raw.trim();
      const key = label.toLowerCase();
      if (!key || seenInItem.has(key)) continue;
      seenInItem.add(key);
      const bucket = counts.get(key);
      if (bucket) bucket.count += 1;
      else counts.set(key, { label, count: 1 });
    }
  }

  const buckets = [...counts.values()];
  if (tile.groupBy === 'month' || tile.groupBy === 'priority') {
    const rank = (b: Bucket) => (b.label === NOT_AVAILABLE ? '￿' : b.label);
    buckets.sort((a, b) => rank(a).localeCompare(rank(b), undefined, { numeric: true }));
  } else {
    buckets.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }
  return { total: selected.length, buckets, rows: [] };
}
