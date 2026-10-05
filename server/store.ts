import fs from 'fs';
import path from 'path';
import { Phase, Item, Attachment, AuditLog } from '../src/types/index.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');

interface DatabaseSchema {
  phases: Phase[];
  items: Item[];
  attachments: Attachment[];
  auditLogs: AuditLog[];
}

const DEFAULT_PHASES: Phase[] = [
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
];

const DEFAULT_ITEMS: Item[] = [
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

  constructor() {
    this.data = this.loadData();
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
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading db.json, using defaults:', e);
    }

    const initialData: DatabaseSchema = {
      phases: DEFAULT_PHASES,
      items: DEFAULT_ITEMS,
      attachments: [],
      auditLogs: [
        {
          id: 'log-init',
          user: 'system',
          action: 'CREATE',
          entityType: 'PHASE',
          entityId: 'all',
          payload: { count: DEFAULT_PHASES.length },
          createdAt: new Date().toISOString(),
        }
      ]
    };
    this.saveData(initialData);
    return initialData;
  }

  private saveData(data: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save db.json:', err);
    }
  }

  private persist() {
    this.saveData(this.data);
  }

  // --- Phases ---
  getPhases(): Phase[] {
    return [...this.data.phases].sort((a, b) => a.position - b.position);
  }

  getPhase(id: string): Phase | undefined {
    return this.data.phases.find(p => p.id === id);
  }

  createPhase(phaseData: Partial<Phase> & { position?: number; targetIndex?: number }, user = 'local.user'): Phase {
    const phases = this.getPhases();
    let newPos = phaseData.position ?? phases.length;

    // Se viene fornito targetIndex o inserimento tra fasi
    if (typeof phaseData.targetIndex === 'number') {
      newPos = phaseData.targetIndex;
    }

    // Sposta le fasi successive
    for (const p of this.data.phases) {
      if (p.position >= newPos) {
        p.position += 1;
        p.updatedAt = new Date().toISOString();
      }
    }

    const newPhase: Phase = {
      id: phaseData.id || `phase-${Date.now()}`,
      title: phaseData.title || 'Nuova Fase',
      description: phaseData.description || '',
      activities: phaseData.activities || [],
      position: newPos,
      isCore: phaseData.isCore ?? false,
      createdBy: user,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.phases.push(newPhase);
    this.addAuditLog(user, 'CREATE', 'PHASE', newPhase.id, newPhase);
    this.persist();
    return newPhase;
  }

  updatePhase(id: string, updates: Partial<Phase>, user = 'local.user'): Phase | null {
    const index = this.data.phases.findIndex(p => p.id === id);
    if (index === -1) return null;

    const current = this.data.phases[index];
    const updated = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Gestione eventuale cambio posizione
    if (typeof updates.position === 'number' && updates.position !== current.position) {
      const oldPos = current.position;
      const targetPos = updates.position;
      for (const p of this.data.phases) {
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
    this.addAuditLog(user, 'UPDATE', 'PHASE', id, updates);
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

    // Compatta le posizioni
    const sorted = this.getPhases();
    sorted.forEach((p, idx) => {
      p.position = idx;
    });

    this.addAuditLog(user, 'DELETE', 'PHASE', id, { title: target.title });
    this.persist();
    return true;
  }

  // --- Items ---
  getItems(filter?: { type?: string; phaseId?: string; search?: string }): Item[] {
    let items = [...this.data.items];

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
        (i.requirements && i.requirements.toLowerCase().includes(q))
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
    const newItem: Item = {
      id: itemData.id || `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: itemData.type || 'TOOL',
      title: itemData.title || 'Nuovo Elemento',
      summary: itemData.summary || '',
      description: itemData.description || '',
      notes: itemData.notes || '',
      phaseIds: itemData.phaseIds || [],
      githubUrl: itemData.githubUrl,
      catalogUrl: itemData.catalogUrl,
      demoUrl: itemData.demoUrl,
      owner: itemData.owner,
      generalizationRequired: !!itemData.generalizationRequired,
      problem: itemData.problem,
      currentProcess: itemData.currentProcess,
      desiredTool: itemData.desiredTool,
      desiredOutcome: itemData.desiredOutcome,
      requirements: itemData.requirements,
      expectedBenefit: itemData.expectedBenefit,
      positionX: itemData.positionX,
      positionY: itemData.positionY,
      createdBy: user,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.items.push(newItem);
    this.addAuditLog(user, 'CREATE', 'ITEM', newItem.id, newItem);
    this.persist();
    return newItem;
  }

  updateItem(id: string, updates: Partial<Item>, user = 'local.user'): Item | null {
    const idx = this.data.items.findIndex(i => i.id === id);
    if (idx === -1) return null;

    const current = this.data.items[idx];
    const updated = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.data.items[idx] = updated;
    this.addAuditLog(user, 'UPDATE', 'ITEM', id, updates);
    this.persist();
    return {
      ...updated,
      attachments: this.data.attachments.filter(a => a.itemId === updated.id)
    };
  }

  deleteItem(id: string, user = 'local.user'): boolean {
    const target = this.data.items.find(i => i.id === id);
    if (!target) return false;

    this.data.items = this.data.items.filter(i => i.id !== id);
    this.data.attachments = this.data.attachments.filter(a => a.itemId !== id);

    this.addAuditLog(user, 'DELETE', 'ITEM', id, { title: target.title, type: target.type });
    this.persist();
    return true;
  }

  // --- Attachments ---
  addAttachment(itemId: string, attachmentData: { fileName: string; mimeType: string; data: string }): Attachment {
    const existing = this.data.attachments.filter(a => a.itemId === itemId);
    if (existing.length >= 3) {
      throw new Error('Massimo 3 allegati consentiti per elemento');
    }

    const newAttachment: Attachment = {
      id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      itemId,
      fileName: attachmentData.fileName,
      mimeType: attachmentData.mimeType,
      data: attachmentData.data,
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
  addAuditLog(user: string, action: 'CREATE' | 'UPDATE' | 'DELETE', entityType: 'PHASE' | 'ITEM' | 'ATTACHMENT', entityId: string, payload?: any) {
    const log: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user,
      action,
      entityType,
      entityId,
      payload,
      createdAt: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(log);
    // Keep max 500 logs
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
  }

  getAuditLogs(): AuditLog[] {
    return this.data.auditLogs;
  }
}

export const db = new DatabaseStore();
