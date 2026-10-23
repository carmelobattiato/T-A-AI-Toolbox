import fs from 'fs';
import path from 'path';
import { Phase, Item, Attachment, AuditLog, DashboardTile, Practice, DEFAULT_PRACTICE_ID } from '../src/types/index.ts';
import { DEFAULT_TILE } from '../src/utils/dashboard.ts';
import { toSafeHref } from '../src/utils/url.ts';
import { isIconKey } from '../src/utils/iconKeys.ts';

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');
const LOG_FILE = path.resolve(DATA_DIR, 'log.json');
const MAX_AUDIT_LOGS = 500;

interface DatabaseSchema {
  practices?: Practice[];
  phases: Phase[];
  items: Item[];
  attachments: Attachment[];
  // Legacy: audit logs now live in log.json and are moved there on load
  auditLogs?: AuditLog[];
  dashboardTiles?: DashboardTile[];
  // Set once the default tile has been offered, so deleting it keeps the slot free
  dashboardDefaultsApplied?: boolean;
}

const DEFAULT_PHASES: Phase[] = ([
  {
    id: 'phase-0',
    title: 'Pre-Sales & Estimation',
    description: "Preparazione della soluzione, effort, staffing, costi, price e proposta.",
    activities: [
      'Inventario pre-sales e requirement gathering',
      'Stime effort e sizing',
      'Staffing plan e seniority mix',
      'Cost and pricing model',
      'Elaborazione proposta tecnica'
    ],
    position: 0,
    isCore: true,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'phase-1',
    title: 'Assessment',
    description: "Comprendere il punto di partenza e dimensionare l'iniziativa.",
    activities: [
      'Inventario applicazioni e servizi',
      'Architetture e componenti',
      'Middleware e integrazioni',
      'Dati, volumi e retention',
      'Dipendenze e coupling',
      'Capacity e vincoli infrastrutturali'
    ],
    position: 1,
    isCore: true,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'phase-2',
    title: 'Gap Analysis & Target Design',
    description: "Definire come evolvere AS-IS verso TO-BE.",
    activities: [
      'Confronto AS-IS vs TO-BE',
      'Mappatura gap funzionali e tecnici',
      'Target architecture e security baseline',
      'Scelta degli architectural patterns',
      'Remediation plan e migration strategy'
    ],
    position: 2,
    isCore: true,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'phase-3',
    title: 'Readiness & Provisioning',
    description: "Predisporre tutti i prerequisiti infrastrutturali ed ecosistemici.",
    activities: [
      'Ambienti cloud e on-premise',
      'Networking, VPC e routing',
      'Database, storage e repliche',
      'Middleware e message broker',
      'Cache, search e cluster indexing',
      'Credenziali, IAM e connettività'
    ],
    position: 3,
    isCore: true,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'phase-4',
    title: 'Application & DevOps Adaptation',
    description: "Rendere applicazioni e deployment compatibili con il target.",
    activities: [
      'Configurazioni e containerizzazione',
      'Integrazioni API e contract testing',
      'Secret management e secure vault',
      'Manifest Kubernetes e Helm chart',
      'Pipeline CI/CD e Infrastructure as Code',
      'Automazione del delivery'
    ],
    position: 4,
    isCore: true,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'phase-5',
    title: 'Test & Validation',
    description: "Validare soluzione, integrazioni e ambienti.",
    activities: [
      'Test tecnici e di connettività',
      'Test funzionali e regressione',
      'Test non funzionali e load testing',
      'Integration test con terze parti',
      'Performance, latency e resilienza',
      'Collaudo utente (UAT)'
    ],
    position: 5,
    isCore: true,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'phase-6',
    title: 'Migration & Cutover',
    description: "Eseguire la transizione minimizzando rischio e downtime.",
    activities: [
      'Data migration e sync incrementale',
      'Esecuzione runbook dettagliato',
      'Cutover e switch DNS/traffic',
      'Restart e healthcheck post-migrazione',
      'Verifiche di integrità e business sign-off',
      'Procedure di rollback verificate'
    ],
    position: 6,
    isCore: true,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'phase-7',
    title: 'Operate & Handover',
    description: "Portare il servizio a regime e stabilizzarlo.",
    activities: [
      'Monitoring, alert e observability 24/7',
      'Stabilizzazione e tuning prestazioni',
      'Incident management e anomaly detection',
      'Handover al team operativo',
      'Presa in carico formale',
      'Dismissione infrastruttura legacy'
    ],
    position: 7,
    isCore: true,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
] as Omit<Phase, 'practiceId'>[]).map(p => ({ ...p, practiceId: DEFAULT_PRACTICE_ID }));

const DEFAULT_PRACTICES: Practice[] = [
  { id: DEFAULT_PRACTICE_ID, name: 'T&A', createdAt: '2026-01-01T00:00:00.000Z', createdBy: 'system' },
];

function randomSuffix(len = 5): string {
  return Math.random().toString(36).substring(2, 2 + len);
}

function slugify(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
}

// Fields the server owns: a client can never overwrite them through create or update requests
function withoutServerFields<T extends object>(data: T): T {
  const copy: Record<string, unknown> = { ...(data as Record<string, unknown>) };
  for (const field of ['id', 'practiceId', 'createdAt', 'createdBy', 'isCore', 'attachments']) delete copy[field];
  return copy as T;
}

const ATTACHMENT_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
const MAX_ATTACHMENT_CHARS = 7_500_000; // ~5 MB of base64, the limit the UI enforces

// Only known icon keys are stored; anything else means "default icon"
function cleanIcon(value: unknown): string | undefined {
  return isIconKey(value) ? value : undefined;
}

function resolveIcon(value: unknown, current: string | null | undefined): string | undefined {
  if (value === null || value === '') return undefined;
  return cleanIcon(value) ?? cleanIcon(current);
}

function cleanPriority(type: string, value: unknown): number | undefined {
  if (type === 'TOOL') return undefined;
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 ? value : undefined;
}

const DEFAULT_ITEMS: Omit<Item, 'practiceId'>[] = [
  {
    id: 'item-tool-1',
    type: 'TOOL',
    title: 'Document AI',
    summary: 'Analisi e acquisizione documentale a supporto delle attività di assessment.',
    description: 'Tool che utilizza un modello LLM per estrarre informazioni strutturate da documentazione tecnica, specifiche architetturali e manuali legacy.',
    phaseIds: ['phase-1'],
    generalizationRequired: true,
    owner: 'Carmelo Battiato',
    githubUrl: 'https://github.com/carmelobattiato/document-ai',
    catalogUrl: 'https://garage.accenture.com/tools/document-ai',
    notes: 'Necessita di generalizzare i parser PDF e diagrammi raster.',
    createdBy: 'Carmelo Battiato',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-tool-2',
    type: 'TOOL',
    title: 'Draw.io AI Architecture Assistant',
    summary: 'Generazione assistita di diagrammi architetturali Draw.io partendo da prompt e architetture AS-IS.',
    description: 'Tool che utilizza modelli di ragionamento e XML generation per produrre diagrammi Draw.io conformi ai pattern architetturali aziendali a partire da descrizioni testuali, documentazione o schemi AS-IS.',
    phaseIds: ['phase-1', 'phase-2'],
    generalizationRequired: true,
    owner: 'Carmelo Battiato',
    githubUrl: 'https://github.com/carmelobattiato/drawio-ai-flow',
    catalogUrl: 'https://garage.accenture.com/tools/drawio-ai',
    demoUrl: 'https://demo.drawio-ai.accenture.com',
    notes: 'Supporta import XML e visualizzazione interattiva.',
    createdBy: 'Carmelo Battiato',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-tool-3',
    type: 'TOOL',
    title: 'Estimator Web',
    summary: 'Applicazione web per la gestione strutturata di effort, risorse, costi e price.',
    description: 'Piattaforma web interna per la scomposizione WBS, stima effort con parametric model, allocazione seniority e calcolo marginalità per offerte T&A.',
    phaseIds: ['phase-0'],
    generalizationRequired: false,
    owner: 'Marco Rossi',
    catalogUrl: 'https://garage.accenture.com/tools/estimator-web',
    notes: 'In produzione, utilizzato regolarmente per le offerte.',
    createdBy: 'Marco Rossi',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-tool-4',
    type: 'TOOL',
    title: 'Generic Agent Template',
    summary: 'Template general purpose per creare agenti configurando prompt e MCP disponibili.',
    description: 'Struttura modulare TypeScript e Python con scaffolding standard per costruire agenti T&A collegati a Model Context Protocol (MCP) aziendali, logging e tracing.',
    phaseIds: ['phase-1', 'phase-2', 'phase-3', 'phase-4', 'phase-5', 'phase-6', 'phase-7'],
    generalizationRequired: true,
    owner: 'Carmelo Battiato',
    githubUrl: 'https://github.com/carmelobattiato/generic-agent-template',
    notes: 'Usato con successo in 3 progetti pilota, pronto per estensione cross-team.',
    createdBy: 'Carmelo Battiato',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-idea-1',
    type: 'IDEA',
    title: 'Terraform / IaC Agent',
    summary: 'Agente per la generazione automatica di moduli Infrastructure as Code.',
    problem: 'Accelerare la produzione di Infrastructure as Code evitando errori di naming e configurazioni non standard.',
    requirements: 'Utilizzare target architecture, standard infrastrutturali aziendali e requisiti per generare una prima versione dei moduli Terraform con validazione tflint e checkov.',
    expectedBenefit: 'Risparmio di oltre il 60% nel setup iniziale degli ambienti cloud con conformità security by-design.',
    phaseIds: ['phase-3', 'phase-4'],
    owner: 'Carmelo Battiato',
    createdBy: 'Carmelo Battiato',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-need-1',
    type: 'NEED',
    title: 'Inventario automatico applicazioni',
    summary: 'Automatizzare la raccolta delle informazioni relative ad applicazioni, componenti e dipendenze.',
    description: 'La raccolta manuale tramite interviste e fogli di calcolo è lenta e soggetta ad errori.',
    currentProcess: 'Interviste manuali con gli application owner e compilazione fogli Excel.',
    desiredTool: 'Discovery scanner o agente interrogatore che legga repository Git e configmap.',
    desiredOutcome: 'Inventario sempre aggiornato con mapping automatico del tech stack.',
    phaseIds: ['phase-1'],
    createdBy: 'local.user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-need-2',
    type: 'NEED',
    title: 'Analisi dipendenze',
    summary: 'Analizzare automaticamente dipendenze infrastrutturali e applicative.',
    description: 'Mappare chiamate API sincrone/asincrone e database condivisi tra microservizi.',
    currentProcess: 'Revisione documentale frammentata.',
    desiredTool: 'Dependency graph extractor da log e OpenAPI specs.',
    desiredOutcome: 'Grafo visivo delle dipendenze per pianificare onde di migrazione sicure.',
    phaseIds: ['phase-1', 'phase-2'],
    createdBy: 'local.user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-need-3',
    type: 'NEED',
    title: 'Standardizzare diagrammi architetturali',
    summary: 'Uniformare e validare i diagrammi Draw.io e plantUML rispetto alle linee guida T&A.',
    description: 'Ogni architetto usa icone e stili diversi, rendendo complessa la lettura unificata.',
    currentProcess: 'Disegno manuale non vincolato a librerie standard.',
    desiredOutcome: 'Validatore e assistente di stile automatico.',
    phaseIds: ['phase-2'],
    createdBy: 'local.user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-need-4',
    type: 'NEED',
    title: 'Automatizzare Terraform',
    summary: 'Generare codice Terraform partendo da specifiche di architettura target.',
    description: 'Vorrei un agente che partendo dal Target Design produca automaticamente una prima versione dei moduli Terraform.',
    currentProcess: 'Scrittura manuale dei file .tf a partire dai diagrammi.',
    desiredTool: 'Agente LLM con tooling MCP Terraform e template pre-approvati.',
    desiredOutcome: 'Codice IaC pronto per la review in pull request.',
    phaseIds: ['phase-3', 'phase-4'],
    createdBy: 'local.user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-need-5',
    type: 'NEED',
    title: 'Test automatici',
    summary: 'Esecuzione assistita e validazione automatica dei test tecnici e di connettività.',
    description: 'Validare automaticamente endpoint, latenze e firewall rule tra sorgente e target.',
    currentProcess: 'Script ad-hoc eseguiti manualmente da vari team.',
    desiredOutcome: 'Suite di test di collaudo eseguibile in un click con report conformità.',
    phaseIds: ['phase-5'],
    createdBy: 'local.user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-need-6',
    type: 'NEED',
    title: 'Runbook automatici',
    summary: 'Generazione e verifica automatizzata dei runbook di cutover con step di rollback.',
    description: 'I cutover notturni richiedono sincronizzazione meticolosa dei team; i runbook cartacei sono rischiosi.',
    currentProcess: 'Checklist su foglio di calcolo con tick manuali.',
    desiredOutcome: 'Runbook interattivo con step automatizzabili e timer di rollback verificati.',
    phaseIds: ['phase-6'],
    createdBy: 'local.user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-need-7',
    type: 'NEED',
    title: 'Monitoring anomalie',
    summary: 'Identificazione proattiva e triage automatico delle anomalie a regime.',
    description: 'Rilevare tempestivamente drift di prestazioni o errori applicativi subito dopo l\'handover.',
    currentProcess: 'Controllo dashboard Grafana da parte del team di reperibilità.',
    desiredOutcome: 'Agente di observability che correla log e metriche spiegando la root cause.',
    phaseIds: ['phase-7'],
    createdBy: 'local.user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

class DatabaseStore {
  private data: DatabaseSchema;
  private auditLogs: AuditLog[];

  constructor() {
    this.data = this.loadData();
    this.auditLogs = this.loadAuditLogs();
  }

  // Re-reads db.json and log.json after the files were replaced on disk (data import)
  reload() {
    this.data = this.loadData();
    this.auditLogs = this.loadAuditLogs();
  }

  private writeAuditLogs(logs: AuditLog[]): boolean {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      // Atomic write: a crash mid-write must never leave a truncated log.json
      const tmpFile = `${LOG_FILE}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(logs, null, 2), 'utf-8');
      fs.renameSync(tmpFile, LOG_FILE);
      return true;
    } catch (err) {
      console.error('Failed to save log.json:', err);
      return false;
    }
  }

  private loadAuditLogs(): AuditLog[] {
    const legacy = this.data.auditLogs;
    let stored: AuditLog[] | null = null;

    if (fs.existsSync(LOG_FILE)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
        if (!Array.isArray(parsed)) throw new Error('log.json is not an array');
        stored = parsed;
      } catch (e) {
        console.warn('Error reading log.json, starting a new one:', e);
        const corruptFile = `${LOG_FILE}.corrupt-${Date.now()}`;
        fs.renameSync(LOG_FILE, corruptFile);
        console.warn(`Unreadable log.json moved to ${corruptFile}`);
      }
    }

    // Logs written while practices were still called pillars
    for (const log of [...(stored ?? []), ...(legacy ?? [])] as any[]) {
      if (log.pillarId !== undefined) {
        log.practiceId ??= log.pillarId;
        delete log.pillarId;
      }
      if (log.entityType === 'PILLAR') log.entityType = 'PRACTICE';
    }

    if (stored && !legacy) return stored;

    // First run, or an older db.json that still embeds the logs: merge by id, newest first
    const merged = new Map<string, AuditLog>();
    for (const log of [...(stored ?? []), ...(legacy ?? [])]) merged.set(log.id, log);
    const logs = [...merged.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, MAX_AUDIT_LOGS);
    if (!stored && !legacy) {
      logs.push({
        id: 'log-init',
        user: 'system',
        action: 'CREATE',
        entityType: 'PHASE',
        entityId: 'all',
        payload: { count: DEFAULT_PHASES.length },
        createdAt: new Date().toISOString(),
      });
    }

    // Only drop the logs from db.json once log.json is safely on disk
    if (this.writeAuditLogs(logs) && legacy) {
      delete this.data.auditLogs;
      this.saveData(this.data);
    }
    return logs;
  }

  private loadData(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.phases && parsed.items) {
          // Older databases have a single map: everything belongs to the default practice
          // Databases saved while "practices" were still called "pillars"
          if (parsed.pillars && !parsed.practices) parsed.practices = parsed.pillars;
          delete parsed.pillars;
          const renameLegacyKey = (obj: Record<string, unknown>) => {
            if (obj.pillarId !== undefined) {
              obj.practiceId ??= obj.pillarId;
              delete obj.pillarId;
            }
          };
          parsed.phases.forEach(renameLegacyKey);
          parsed.items.forEach(renameLegacyKey);
          (parsed.dashboardTiles ?? []).forEach(renameLegacyKey);
          parsed.practices ??= DEFAULT_PRACTICES.map(p => ({ ...p }));
          for (const phase of parsed.phases) phase.practiceId ??= DEFAULT_PRACTICE_ID;
          for (const item of parsed.items) {
            item.practiceId ??= DEFAULT_PRACTICE_ID;
            item.tags ??= [];
            item.customers ??= [];
          }
          parsed.dashboardTiles ??= [];
          for (const tile of parsed.dashboardTiles) tile.practiceId ??= DEFAULT_PRACTICE_ID;
          if (!parsed.dashboardDefaultsApplied) {
            if (!parsed.dashboardTiles.some((t: DashboardTile) => t.practiceId === DEFAULT_PRACTICE_ID && t.slot === DEFAULT_TILE.slot)) {
              parsed.dashboardTiles.push({ ...DEFAULT_TILE, practiceId: DEFAULT_PRACTICE_ID });
            }
            parsed.dashboardDefaultsApplied = true;
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading db.json, using defaults:', e);
      // Keep the unreadable file aside instead of overwriting it with defaults
      if (fs.existsSync(DB_FILE)) {
        const corruptFile = `${DB_FILE}.corrupt-${Date.now()}`;
        fs.renameSync(DB_FILE, corruptFile);
        console.warn(`Unreadable db.json moved to ${corruptFile}`);
      }
    }

    const initialData: DatabaseSchema = {
      practices: DEFAULT_PRACTICES.map(p => ({ ...p })),
      phases: DEFAULT_PHASES,
      items: DEFAULT_ITEMS.map(item => ({ ...item, practiceId: DEFAULT_PRACTICE_ID, tags: item.tags ?? [], customers: item.customers ?? [] })),
      attachments: [],
      dashboardTiles: [{ ...DEFAULT_TILE, practiceId: DEFAULT_PRACTICE_ID }],
      dashboardDefaultsApplied: true,
    };
    this.saveData(initialData);
    return initialData;
  }

  private saveData(data: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      // Atomic write: a crash mid-write must never leave a truncated db.json
      const tmpFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('Failed to save db.json:', err);
    }
  }

  private persist() {
    this.saveData(this.data);
  }

  // --- Practices ---
  getPractices(): Practice[] {
    return [...(this.data.practices ??= DEFAULT_PRACTICES.map(p => ({ ...p })))];
  }

  getPractice(id: string): Practice | undefined {
    return this.getPractices().find(p => p.id === id);
  }

  createPractice(rawName: unknown, user = 'local.user'): Practice {
    const name = typeof rawName === 'string' ? rawName.trim().slice(0, 60) : '';
    if (!name) throw new Error('Practice name is required');
    if (this.getPractices().some(p => p.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('A practice with this name already exists');
    }
    let id = slugify(name) || `practice-${randomSuffix()}`;
    while (this.getPractice(id)) id = `${slugify(name) || 'practice'}-${randomSuffix(3)}`;

    const now = new Date().toISOString();
    const practice: Practice = { id, name, createdAt: now, createdBy: user };
    this.data.practices!.push(practice);
    // Every new practice starts from one editable phase
    this.data.phases.push({
      id: `phase-${Date.now()}-${randomSuffix()}`,
      practiceId: id,
      title: 'Base phase',
      description: 'Starting phase: rename it or add new phases to build your own map.',
      activities: [],
      position: 0,
      isCore: false,
      createdBy: user,
      createdAt: now,
      updatedAt: now,
    });
    this.addAuditLog(user, 'CREATE', 'PRACTICE', id, { name }, id);
    this.persist();
    return practice;
  }

  renamePractice(id: string, rawName: unknown, user = 'local.user'): Practice | null {
    const practice = this.data.practices?.find(p => p.id === id);
    if (!practice) return null;
    const name = typeof rawName === 'string' ? rawName.trim().slice(0, 60) : '';
    if (!name) throw new Error('Practice name is required');
    if (this.getPractices().some(p => p.id !== id && p.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('A practice with this name already exists');
    }
    practice.name = name;
    this.addAuditLog(user, 'UPDATE', 'PRACTICE', id, { name }, id);
    this.persist();
    return practice;
  }

  // Removes the practice and everything on its map
  deletePractice(id: string, user = 'local.user'): boolean {
    const practice = this.getPractice(id);
    if (!practice) return false;
    if (id === DEFAULT_PRACTICE_ID) throw new Error('The default practice cannot be deleted');
    const itemIds = new Set(this.data.items.filter(i => i.practiceId === id).map(i => i.id));
    this.data.phases = this.data.phases.filter(p => p.practiceId !== id);
    this.data.items = this.data.items.filter(i => i.practiceId !== id);
    this.data.attachments = this.data.attachments.filter(a => !itemIds.has(a.itemId));
    this.data.dashboardTiles = (this.data.dashboardTiles ?? []).filter(t => t.practiceId !== id);
    this.data.practices = this.getPractices().filter(p => p.id !== id);
    this.addAuditLog(user, 'DELETE', 'PRACTICE', id, { name: practice.name, items: itemIds.size }, id);
    this.persist();
    return true;
  }

  // --- Phases ---
  getPhases(practiceId: string): Phase[] {
    return this.data.phases.filter(p => p.practiceId === practiceId).sort((a, b) => a.position - b.position);
  }

  getPhase(id: string): Phase | undefined {
    return this.data.phases.find(p => p.id === id);
  }

  createPhase(phaseData: Partial<Phase> & { position?: number; targetIndex?: number }, user = 'local.user'): Phase {
    const practiceId = phaseData.practiceId;
    if (!practiceId || !this.getPractice(practiceId)) throw new Error('Invalid practice');
    const phases = this.getPhases(practiceId);
    let newPos = phaseData.position ?? phases.length;

    // Se viene fornito targetIndex o inserimento tra fasi
    if (typeof phaseData.targetIndex === 'number') {
      newPos = phaseData.targetIndex;
    }

    // Sposta le fasi successive (solo dello stessa practice)
    for (const p of phases) {
      if (p.position >= newPos) {
        p.position += 1;
        p.updatedAt = new Date().toISOString();
      }
    }

    const newPhase: Phase = {
      id: `phase-${Date.now()}-${randomSuffix(4)}`,
      practiceId,
      icon: cleanIcon(phaseData.icon),
      title: phaseData.title || 'New Phase',
      description: phaseData.description || '',
      activities: phaseData.activities || [],
      position: newPos,
      isCore: false,
      createdBy: user,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.phases.push(newPhase);
    this.addAuditLog(user, 'CREATE', 'PHASE', newPhase.id, newPhase, practiceId);
    this.persist();
    return newPhase;
  }

  updatePhase(id: string, rawUpdates: Partial<Phase>, user = 'local.user'): Phase | null {
    const updates = withoutServerFields(rawUpdates);
    const index = this.data.phases.findIndex(p => p.id === id);
    if (index === -1) return null;

    const current = this.data.phases[index];
    const updated = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    // null clears the icon (back to default); an unknown key is ignored and keeps the current one
    if ('icon' in updates) updated.icon = resolveIcon(updates.icon, current.icon);

    // Gestione eventuale cambio posizione
    if (typeof updates.position === 'number' && updates.position !== current.position) {
      const oldPos = current.position;
      const targetPos = updates.position;
      for (const p of this.getPhases(current.practiceId)) {
        if (p.id === id) continue;
        if (targetPos > oldPos) {
          if (p.position > oldPos && p.position <= targetPos) {
            p.position -= 1;
          }
        } else {
          if (p.position >= targetPos && p.position < oldPos) {
            p.position += 1;
          }
        }
      }
    }

    this.data.phases[index] = updated;
    this.addAuditLog(user, 'UPDATE', 'PHASE', id, updates, current.practiceId);
    this.persist();
    return updated;
  }

  deletePhase(id: string, user = 'local.user'): boolean {
    const target = this.data.phases.find(p => p.id === id);
    if (!target) return false;

    this.data.phases = this.data.phases.filter(p => p.id !== id);

    // Rimuovi la fase dagli item collegati
    for (const item of this.data.items) {
      item.phaseIds = item.phaseIds.filter(pid => pid !== id);
    }

    // Compatta le posizioni (solo della practice)
    this.getPhases(target.practiceId).forEach((p, idx) => {
      p.position = idx;
    });

    this.addAuditLog(user, 'DELETE', 'PHASE', id, { title: target.title }, target.practiceId);
    this.persist();
    return true;
  }

  // --- Items ---
  getItems(filter?: { practiceId?: string; type?: string; phaseId?: string; search?: string }): Item[] {
    let items = [...this.data.items];

    if (filter?.practiceId) {
      items = items.filter(i => i.practiceId === filter.practiceId);
    }

    if (filter?.type) {
      items = items.filter(i => i.type === filter.type);
    }
    if (filter?.phaseId) {
      items = items.filter(i => i.phaseIds.includes(filter.phaseId!));
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      items = items.filter(i =>
        i.title.toLowerCase().includes(q) ||
        (i.description && i.description.toLowerCase().includes(q)) ||
        (i.summary && i.summary.toLowerCase().includes(q)) ||
        (i.owner && i.owner.toLowerCase().includes(q)) ||
        (i.notes && i.notes.toLowerCase().includes(q)) ||
        (i.problem && i.problem.toLowerCase().includes(q)) ||
        (i.requirements && i.requirements.toLowerCase().includes(q)) ||
        (i.tags ?? []).some(t => t.toLowerCase().includes(q)) ||
        (i.customers ?? []).some(c => c.toLowerCase().includes(q))
      );
    }

    // Aggancia gli attachment
    return items.map(item => ({
      ...item,
      attachments: this.data.attachments.filter(a => a.itemId === item.id)
    }));
  }

  getItem(id: string): Item | null {
    const item = this.data.items.find(i => i.id === id);
    if (!item) return null;
    return {
      ...item,
      attachments: this.data.attachments.filter(a => a.itemId === item.id)
    };
  }

  createItem(itemData: Partial<Item>, user = 'local.user'): Item {
    const practiceId = itemData.practiceId;
    if (!practiceId || !this.getPractice(practiceId)) throw new Error('Invalid practice');
    // An item can only be linked to phases of its own practice
    const practicePhaseIds = new Set(this.getPhases(practiceId).map(p => p.id));
    const newItem: Item = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      practiceId,
      type: itemData.type || 'TOOL',
      title: itemData.title || 'New Item',
      summary: itemData.summary || '',
      description: itemData.description || '',
      notes: itemData.notes || '',
      phaseIds: (itemData.phaseIds || []).filter(pid => practicePhaseIds.has(pid)),
      githubUrl: toSafeHref(itemData.githubUrl),
      catalogUrl: toSafeHref(itemData.catalogUrl),
      demoUrl: toSafeHref(itemData.demoUrl),
      owner: itemData.owner,
      generalizationRequired: !!itemData.generalizationRequired,
      problem: itemData.problem,
      currentProcess: itemData.currentProcess,
      desiredTool: itemData.desiredTool,
      desiredOutcome: itemData.desiredOutcome,
      requirements: itemData.requirements,
      expectedBenefit: itemData.expectedBenefit,
      tags: itemData.tags ?? [],
      customers: itemData.customers ?? [],
      priority: cleanPriority(itemData.type || 'TOOL', itemData.priority),
      icon: cleanIcon(itemData.icon),
      positionX: itemData.positionX,
      positionY: itemData.positionY,
      createdBy: user,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.items.push(newItem);
    this.addAuditLog(user, 'CREATE', 'ITEM', newItem.id, newItem, practiceId);
    this.persist();
    return newItem;
  }

  updateItem(id: string, rawUpdates: Partial<Item>, user = 'local.user'): Item | null {
    const updates = withoutServerFields(rawUpdates);
    for (const field of ['githubUrl', 'catalogUrl', 'demoUrl'] as const) {
      if (field in updates) updates[field] = toSafeHref(updates[field]);
    }
    const idx = this.data.items.findIndex(i => i.id === id);
    if (idx === -1) return null;

    const current = this.data.items[idx];
    if (Array.isArray(updates.phaseIds)) {
      const practicePhaseIds = new Set(this.getPhases(current.practiceId).map(p => p.id));
      updates.phaseIds = updates.phaseIds.filter(pid => practicePhaseIds.has(pid));
    }
    const updated = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    // null clears the icon (back to default); an unknown key is ignored and keeps the current one
    if ('icon' in updates) updated.icon = resolveIcon(updates.icon, current.icon);
    if ('priority' in updates) {
      const priority = updates.priority === null ? undefined : cleanPriority(updated.type, updates.priority) ?? current.priority;
      if (priority == null) delete updated.priority;
      else updated.priority = priority;
    }

    this.data.items[idx] = updated;
    this.addAuditLog(user, 'UPDATE', 'ITEM', id, updates, current.practiceId);
    this.persist();
    return {
      ...updated,
      attachments: this.data.attachments.filter(a => a.itemId === updated.id)
    };
  }

  // --- Dashboard tiles (one custom tile per slot, per practice) ---
  getDashboardTiles(practiceId: string): DashboardTile[] {
    return (this.data.dashboardTiles ?? []).filter(t => t.practiceId === practiceId).sort((a, b) => a.slot - b.slot);
  }

  upsertDashboardTile(practiceId: string, tile: DashboardTile): DashboardTile {
    const tiles = (this.data.dashboardTiles ??= []);
    const stored = { ...tile, practiceId };
    const idx = tiles.findIndex(t => t.practiceId === practiceId && t.slot === tile.slot);
    if (idx === -1) tiles.push(stored);
    else tiles[idx] = stored;
    this.persist();
    return stored;
  }

  deleteDashboardTile(practiceId: string, slot: number): boolean {
    const tiles = this.data.dashboardTiles ?? [];
    if (!tiles.some(t => t.practiceId === practiceId && t.slot === slot)) return false;
    this.data.dashboardTiles = tiles.filter(t => !(t.practiceId === practiceId && t.slot === slot));
    this.persist();
    return true;
  }

  deleteItem(id: string, user = 'local.user'): boolean {
    const target = this.data.items.find(i => i.id === id);
    if (!target) return false;

    this.data.items = this.data.items.filter(i => i.id !== id);
    this.data.attachments = this.data.attachments.filter(a => a.itemId !== id);

    this.addAuditLog(user, 'DELETE', 'ITEM', id, { title: target.title, type: target.type }, target.practiceId);
    this.persist();
    return true;
  }

  // --- Attachments ---
  addAttachment(itemId: string, attachmentData: { fileName: string; mimeType: string; data: string }): Attachment {
    const { fileName, mimeType, data } = attachmentData;
    if (typeof fileName !== 'string' || typeof mimeType !== 'string' || typeof data !== 'string') {
      throw new Error('Invalid attachment');
    }
    if (!ATTACHMENT_MIME_TYPES.includes(mimeType) || !/^data:image\/(png|jpe?g);base64,/i.test(data)) {
      throw new Error('Only PNG, JPG or JPEG files are allowed');
    }
    if (data.length > MAX_ATTACHMENT_CHARS) {
      throw new Error('The file exceeds the 5 MB limit');
    }
    if (!this.data.items.some(i => i.id === itemId)) {
      throw new Error('Item not found');
    }
    const existing = this.data.attachments.filter(a => a.itemId === itemId);
    if (existing.length >= 3) {
      throw new Error('A maximum of 3 attachments is allowed per item');
    }

    const newAttachment: Attachment = {
      id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      itemId,
      fileName: fileName.slice(0, 200),
      mimeType,
      data,
      createdAt: new Date().toISOString(),
    };

    this.data.attachments.push(newAttachment);
    this.persist();
    return newAttachment;
  }

  deleteAttachment(id: string): boolean {
    const beforeCount = this.data.attachments.length;
    this.data.attachments = this.data.attachments.filter(a => a.id !== id);
    if (this.data.attachments.length !== beforeCount) {
      this.persist();
      return true;
    }
    return false;
  }

  // --- Audit Logs ---
  addAuditLog(user: string, action: 'CREATE' | 'UPDATE' | 'DELETE', entityType: AuditLog['entityType'], entityId: string, payload?: any, practiceId?: string) {
    const log: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      practiceId,
      user,
      action,
      entityType,
      entityId,
      payload,
      createdAt: new Date().toISOString(),
    };
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > MAX_AUDIT_LOGS) {
      this.auditLogs = this.auditLogs.slice(0, MAX_AUDIT_LOGS);
    }
    this.writeAuditLogs(this.auditLogs);
  }

  // Without a practice: every log. Logs written before practices existed belong to the default one.
  getAuditLogs(practiceId?: string): AuditLog[] {
    if (!practiceId) return this.auditLogs;
    return this.auditLogs.filter(l => l.entityType !== 'USER' && (l.practiceId ?? DEFAULT_PRACTICE_ID) === practiceId);
  }

  // Practice that owns an item / phase, used to authorise writes
  getItemPractice(id: string): string | undefined {
    return this.data.items.find(i => i.id === id)?.practiceId;
  }

  getPhasePractice(id: string): string | undefined {
    return this.data.phases.find(p => p.id === id)?.practiceId;
  }

  getAttachmentPractice(id: string): string | undefined {
    const att = this.data.attachments.find(a => a.id === id);
    return att ? this.getItemPractice(att.itemId) : undefined;
  }
}

export const db = new DatabaseStore();
