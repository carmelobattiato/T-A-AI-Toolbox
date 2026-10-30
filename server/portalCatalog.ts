import crypto from 'crypto';
import { Express, Request, Response } from 'express';
import { CatalogCard, CatalogDraft, DEFAULT_PRACTICE_ID, ItemType } from '../src/types/index.ts';
import { toSafeHref } from '../src/utils/url.ts';
import { db, type PortalFields } from './store.ts';
import { DEFAULT_PORTAL_URL, settingsStore } from './settingsStore.ts';
import { portalCookieValue } from './portalAuth.ts';
import { authorizeEdit, requireAdmin } from './auth.ts';
import { displayNameFromUsername } from './userStore.ts';
import { getUser, internalError } from './http.ts';

// Catalog of the portal (its "The Catalog" page): the editors of a practice can start a new Tool or WiP
// from one of the approved solutions. The import is a copy: later changes on the portal do not follow.

const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024; // the full list is about 2 MB, most of it cover images we never forward
const CARDS_TTL_MS = 60_000;
const LOOKUPS_TTL_MS = 10 * 60_000;
const MAX_CACHE_ENTRIES = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Name the portal's own API reads the session under
const PORTAL_SESSION_COOKIE = 'portal_session';

// Fields the portal sends for a solution (only the ones used here; screenshots, documents and pending changes are never read)
interface PortalProject {
  id: string;
  name?: string | null;
  status?: string | null;
  short_description?: string | null;
  long_description?: string | null;
  owner_email?: string | null;
  github_url?: string | null;
  gitlab_url?: string | null;
  demo_url?: string | null;
  category?: string | null;
  lifecycle_status?: string | null;
  asset_type?: string | null;
  clusters?: { id: number; name: string }[] | null;
  enabler_genai?: string[] | null;
  use_case_ids?: string[] | null;
  version?: string | null;
  team?: string | null;
  efficiency_time_before?: number | null;
  efficiency_time_after?: number | null;
  efficiency_time_unit?: string | null;
  efficiency_percentage?: number | null;
  view_count?: number | null;
}

interface Lookups {
  pillars: Map<string, string>;
  assetTypes: Map<string, string>;
  useCases: Map<string, string>;
}

export class PortalError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const cache = new Map<string, { at: number; value: unknown }>();

async function cached<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.value as T;
  const value = await load();
  if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value as string);
  cache.set(key, { at: Date.now(), value });
  return value;
}

// Reads the response with a size cap, so a large or endless body cannot exhaust memory
async function readLimited(upstream: globalThis.Response): Promise<string> {
  const reader = upstream.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error('Portal response too large');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

// GET on the portal API with the user's own session. Redirects are refused, so the cookie never goes elsewhere.
async function portalGet<T>(baseUrl: string, path: string, token: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const upstream = await fetch(`${baseUrl}/api/projects${path}`, {
      headers: { Cookie: `${PORTAL_SESSION_COOKIE}=${encodeURIComponent(token)}`, Accept: 'application/json' },
      redirect: 'error',
      signal: controller.signal,
    });
    if (upstream.status === 401 || upstream.status === 403) {
      throw new PortalError(401, 'portal_session_expired', 'The portal session is no longer valid');
    }
    if (upstream.status === 404) throw new PortalError(404, 'not_found', 'Not found on the portal');
    if (!upstream.ok) throw new PortalError(502, 'portal_error', `The portal answered HTTP ${upstream.status}`);
    return JSON.parse(await readLimited(upstream)) as T;
  } catch (err) {
    if (err instanceof PortalError) throw err;
    console.error('[portal catalog] request failed:', err);
    throw new PortalError(502, 'portal_unreachable', 'The portal is not reachable');
  } finally {
    clearTimeout(timer);
  }
}

// Sessions to try, in order: the portal cookie the browser sent, then (local development only) PORTAL_API_TOKEN.
// The portal cookie of the user normally lives on the portal's domain, so on localhost the development token
// is what answers; a stale test cookie left on localhost is refused by the portal and skipped the same way.
function portalTokens(req: Request): string[] {
  const devToken = process.env.NODE_ENV !== 'production' ? process.env.PORTAL_API_TOKEN : undefined;
  return [...new Set([portalCookieValue(req), devToken].filter((t): t is string => Boolean(t)))];
}

// Runs the request with each session in turn; moves on only when the portal rejects the session
async function withPortalSession<T>(req: Request, run: (token: string) => Promise<T>): Promise<T> {
  const tokens = portalTokens(req);
  if (tokens.length === 0) {
    throw new PortalError(401, 'portal_session_missing', 'Sign in to the portal, then reload this page');
  }
  let rejected: PortalError | undefined;
  for (const token of tokens) {
    try {
      return await run(token);
    } catch (err) {
      if (!(err instanceof PortalError) || err.code !== 'portal_session_expired') throw err;
      rejected = err;
    }
  }
  throw rejected ?? new PortalError(401, 'portal_session_missing', 'Sign in to the portal, then reload this page');
}

function cacheKey(baseUrl: string, token: string): string {
  return `${baseUrl}|${crypto.createHash('sha256').update(token).digest('hex').slice(0, 16)}`;
}

function lookupsFor(baseUrl: string, token: string): Promise<Lookups> {
  return cached(`lookups|${cacheKey(baseUrl, token)}`, LOOKUPS_TTL_MS, () => loadLookups(baseUrl, token));
}

// Catalog cards for one portal session, cached briefly
function cardsFor(baseUrl: string, token: string): Promise<CatalogCard[]> {
  return cached(`cards|${cacheKey(baseUrl, token)}`, CARDS_TTL_MS, async () => {
    const [projects, lookups] = await Promise.all([
      portalGet<PortalProject[]>(baseUrl, '', token),
      lookupsFor(baseUrl, token),
    ]);
    return projects.filter(p => p.status === 'approved').map(p => projectToCard(p, lookups));
  });
}

async function loadLookups(baseUrl: string, token: string): Promise<Lookups> {
  const [pillars, assetTypes, useCases] = await Promise.all([
    portalGet<{ code: string; name: string }[]>(baseUrl, '/pillars', token),
    portalGet<{ id: string; name: string }[]>(baseUrl, '/asset-types', token),
    portalGet<{ id: string; label: string }[]>(baseUrl, '/use-cases', token),
  ]);
  return {
    pillars: new Map(pillars.map(p => [p.code, p.name])),
    assetTypes: new Map(assetTypes.map(a => [a.id, a.name])),
    useCases: new Map(useCases.map(u => [u.id, u.label])),
  };
}

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function names(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map(v => (typeof v === 'string' ? v : v && typeof v === 'object' && 'name' in v ? String((v as { name: unknown }).name) : ''))
    .map(v => clip(v, 120))
    .filter(Boolean)
    .slice(0, 30);
}

function pillarOf(project: PortalProject, lookups: Lookups): { code: string; name: string } | null {
  if (!project.category) return null;
  return { code: project.category, name: lookups.pillars.get(project.category) ?? project.category };
}

// Card for the catalog grid: only what the filters and the tile need
export function projectToCard(project: PortalProject, lookups: Lookups): CatalogCard {
  return {
    id: project.id,
    name: clip(project.name, 200),
    shortDescription: clip(project.short_description, 300),
    pillar: pillarOf(project, lookups),
    lifecycle: project.lifecycle_status ?? null,
    assetType: project.asset_type ? lookups.assetTypes.get(project.asset_type) ?? project.asset_type : null,
    clusters: names(project.clusters),
    enablers: names(project.enabler_genai),
    efficiencyPercentage: typeof project.efficiency_percentage === 'number' ? project.efficiency_percentage : null,
    viewCount: typeof project.view_count === 'number' ? project.view_count : 0,
  };
}

// Values of a Tool or WiP taken from a portal solution (new one, or the sync of a linked one). The details go to
// portalInfo, not to the notes, so a sync never overwrites the notes the user wrote. Links are there too:
// the WiP form has no link fields.
export function projectToItemDraft(
  project: PortalProject,
  lookups: Lookups,
  baseUrl: string,
  type: ItemType,
): CatalogDraft {
  const pillar = pillarOf(project, lookups);
  const githubUrl = toSafeHref(project.github_url) ?? toSafeHref(project.gitlab_url);
  const demoUrl = toSafeHref(project.demo_url || undefined);
  // Page of the solution on the portal, e.g. <portal>/#/service/<id>
  const catalogUrl = toSafeHref(`${baseUrl}/#/service/${encodeURIComponent(project.id)}`);
  const shortText = clip(project.short_description, 500);
  const longText = clip(project.long_description, 5000);
  const useCases = (project.use_case_ids ?? [])
    .map(id => lookups.useCases.get(id) ?? id)
    .join(', ');
  const before = project.efficiency_time_before;
  const after = project.efficiency_time_after;
  const unit = project.efficiency_time_unit ?? '';
  const times = before != null && after != null ? `${before} ${unit} → ${after} ${unit}`.trim() : '';
  const percentage = project.efficiency_percentage != null ? `${project.efficiency_percentage}%` : '';
  const efficiency = [times, percentage].filter(Boolean).join(' ');
  const portalInfo = [
    pillar && `Pillar: ${pillar.code} ${pillar.name}`,
    project.lifecycle_status && `Lifecycle: ${project.lifecycle_status}`,
    project.asset_type && `Asset type: ${lookups.assetTypes.get(project.asset_type) ?? project.asset_type}`,
    project.version && `Version: ${project.version}`,
    project.team && `Team: ${clip(project.team, 200)}`,
    useCases && `Use cases: ${useCases}`,
    efficiency && `Efficiency: ${efficiency}`,
    githubUrl && `GitHub: ${githubUrl}`,
    demoUrl && `Demo: ${demoUrl}`,
    catalogUrl && `Portal: ${catalogUrl}`,
  ].filter(Boolean).join('\n');

  const owner = project.owner_email
    ? displayNameFromUsername(project.owner_email.split('@')[0].toLowerCase())
    : undefined;
  const common: CatalogDraft = {
    type,
    portalProjectId: project.id,
    title: clip(project.name, 200),
    owner,
    tags: names(project.enabler_genai),
    customers: names(project.clusters),
    portalInfo,
  };
  if (type === 'IDEA') {
    return { ...common, description: [shortText, longText].filter(Boolean).join('\n\n') };
  }
  return {
    ...common,
    summary: shortText,
    description: longText,
    githubUrl,
    demoUrl,
    catalogUrl,
  };
}

function practiceFromQuery(req: Request): string | null {
  const raw = req.query.practice;
  const practiceId = typeof raw === 'string' && raw ? raw : DEFAULT_PRACTICE_ID;
  return db.getPractice(practiceId) ? practiceId : null;
}

// One solution as the values of a Tool or WiP (the caller has chosen the portal session)
async function loadDraft(baseUrl: string, token: string, id: string, type: ItemType): Promise<CatalogDraft> {
  const [project, lookups] = await Promise.all([
    portalGet<PortalProject>(baseUrl, `/${id}`, token),
    lookupsFor(baseUrl, token),
  ]);
  if (project.status !== 'approved') throw new PortalError(404, 'not_found', 'Solution not found');
  return projectToItemDraft(project, lookups, baseUrl, type);
}

// Only the fields the portal owns are taken from a draft (never phases, icon, priority, notes...)
const PORTAL_OWNED_FIELDS = [
  'title', 'summary', 'description', 'owner', 'tags', 'customers', 'githubUrl', 'demoUrl', 'catalogUrl', 'portalInfo',
] as const;

function portalFieldsOf(draft: CatalogDraft): PortalFields {
  const fields: Record<string, unknown> = { portalProjectId: draft.portalProjectId, portalSyncedAt: new Date().toISOString() };
  for (const key of PORTAL_OWNED_FIELDS) {
    if (key in draft) fields[key] = draft[key];
  }
  return fields as PortalFields;
}

function sendPortalError(res: Response, err: unknown) {
  if (err instanceof PortalError) {
    res.status(err.status).json({ code: err.code, error: err.message });
    return;
  }
  internalError(res, err, 'Portal catalog error');
}

// Portal routes: the catalog (editors of the practice only), the portal address (read by all, changed by admins)
export function registerPortalRoutes(app: Express) {
  app.get('/api/portal/config', (_req: Request, res: Response) => {
    res.json({ url: settingsStore.getPortalUrl(), defaultUrl: DEFAULT_PORTAL_URL });
  });

  app.post('/api/portal/config', requireAdmin, (req: Request, res: Response) => {
    try {
      res.json({ url: settingsStore.setPortalUrl(req.body?.url), defaultUrl: DEFAULT_PORTAL_URL });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/portal/catalog', async (req: Request, res: Response) => {
    const practiceId = practiceFromQuery(req);
    if (!practiceId) return void res.status(404).json({ error: 'Practice not found' });
    if (!authorizeEdit(req, res, practiceId)) return;
    try {
      const baseUrl = settingsStore.getPortalUrl();
      const cards = await withPortalSession(req, token => cardsFor(baseUrl, token));
      res.set('Cache-Control', 'no-store').json(cards);
    } catch (err) {
      sendPortalError(res, err);
    }
  });

  app.get('/api/portal/catalog/:id', async (req: Request, res: Response) => {
    const practiceId = practiceFromQuery(req);
    if (!practiceId) return void res.status(404).json({ error: 'Practice not found' });
    if (!authorizeEdit(req, res, practiceId)) return;
    if (!UUID.test(req.params.id)) return void res.status(400).json({ error: 'Invalid portal solution id' });
    const type: ItemType = req.query.type === 'IDEA' ? 'IDEA' : 'TOOL';
    try {
      const baseUrl = settingsStore.getPortalUrl();
      const draft = await withPortalSession(req, token => loadDraft(baseUrl, token, req.params.id, type));
      res.set('Cache-Control', 'no-store').json(draft);
    } catch (err) {
      sendPortalError(res, err);
    }
  });

  // --- Tools and WiPs linked to a portal solution ---

  // Links a Tool or WiP to a solution (or changes it) and copies the solution's data into the card
  app.post('/api/items/:id/portal-link', async (req: Request, res: Response) => {
    const item = db.getItem(req.params.id);
    if (!item) return void res.status(404).json({ error: 'Item not found' });
    if (!authorizeEdit(req, res, item.practiceId)) return;
    if (item.type === 'NEED') return void res.status(400).json({ error: 'Only Tools and WiPs can be linked to the portal' });
    const portalProjectId = req.body?.portalProjectId;
    if (typeof portalProjectId !== 'string' || !UUID.test(portalProjectId)) {
      return void res.status(400).json({ error: 'Invalid portal solution id' });
    }
    try {
      const baseUrl = settingsStore.getPortalUrl();
      const draft = await withPortalSession(req, token => loadDraft(baseUrl, token, portalProjectId, item.type));
      res.json(db.applyPortalSync(item.id, portalFieldsOf(draft), 'link', getUser(req)));
    } catch (err) {
      sendPortalError(res, err);
    }
  });

  // Updates a linked card from its solution; the solution id is the one the card already has
  app.post('/api/items/:id/portal-sync', async (req: Request, res: Response) => {
    const item = db.getItem(req.params.id);
    if (!item) return void res.status(404).json({ error: 'Item not found' });
    if (!authorizeEdit(req, res, item.practiceId)) return;
    if (!item.portalProjectId) return void res.status(400).json({ error: 'This item is not linked to a portal solution' });
    const portalProjectId = item.portalProjectId;
    try {
      const baseUrl = settingsStore.getPortalUrl();
      const draft = await withPortalSession(req, token => loadDraft(baseUrl, token, portalProjectId, item.type));
      res.json(db.applyPortalSync(item.id, portalFieldsOf(draft), 'sync', getUser(req)));
    } catch (err) {
      if (err instanceof PortalError && err.code === 'not_found') {
        return void res.status(404).json({ code: 'not_found', error: 'This solution is no longer on the portal: the card keeps its current data' });
      }
      sendPortalError(res, err);
    }
  });

  // Stops following the portal: the card keeps the data it has
  app.delete('/api/items/:id/portal-link', (req: Request, res: Response) => {
    const item = db.getItem(req.params.id);
    if (!item) return void res.status(404).json({ error: 'Item not found' });
    if (!authorizeEdit(req, res, item.practiceId)) return;
    res.json(db.applyPortalSync(item.id, { portalProjectId: null, portalInfo: null, portalSyncedAt: null }, 'unlink', getUser(req)));
  });
}
