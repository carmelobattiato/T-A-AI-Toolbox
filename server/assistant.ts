import { Type, FunctionDeclaration } from '@google/genai';
import { db } from './store.ts';
import { settingsStore, createGeminiClient } from './settingsStore.ts';
import { PendingAction, AISettings } from '../src/types/index.ts';
import {
  DASHBOARD_SLOTS,
  DASHBOARD_CHARTS,
  DASHBOARD_GROUP_BY,
  DASHBOARD_SORT_BY,
  ITEM_TYPES,
  LIST_DEFAULT_ROWS,
  LIST_MAX_ROWS,
  validateTile,
} from '../src/utils/dashboard.ts';

// Stored pending actions per user awaiting confirmation
const pendingActionsByUser = new Map<string, PendingAction>();

// Function Declarations per Gemini Function Calling
const searchItemsDeclaration: FunctionDeclaration = {
  name: 'search_items',
  description: 'Cerca tool, idee o esigenze nella knowledge base di T&A Toolbox.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: 'Termine di ricerca (es. "terraform", "assessment", "diagrammi")' },
      type: { type: Type.STRING, description: 'Filtro opzionale per tipo: TOOL, IDEA, o NEED' }
    }
  }
};

const listPhasesDeclaration: FunctionDeclaration = {
  name: 'list_phases',
  description: 'Elenca tutte le fasi del processo T&A in ordine sequenziale con id, titolo e statistiche.',
  parameters: {
    type: Type.OBJECT,
    properties: {}
  }
};

const getPhaseDeclaration: FunctionDeclaration = {
  name: 'get_phase',
  description: 'Ottiene i dettagli di una fase specifica (titolo, descrizione, attività, tool ed esigenze collegati).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      phaseId: { type: Type.STRING, description: 'ID della fase (es. "phase-1") o titolo/numero' }
    },
    required: ['phaseId']
  }
};

const createToolDeclaration: FunctionDeclaration = {
  name: 'create_tool',
  description: 'Crea un nuovo Tool e lo associa a una o più fasi del processo T&A.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Nome del Tool' },
      description: { type: Type.STRING, description: 'Descrizione completa del tool' },
      summary: { type: Type.STRING, description: 'Sintesi breve (1 riga)' },
      phaseIds: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Array di ID delle fasi associate (es. ["phase-1", "phase-2"])'
      },
      owner: { type: Type.STRING, description: 'Owner o POC del tool' },
      generalizationRequired: { type: Type.BOOLEAN, description: 'Se il tool richiede generalizzazione (default false)' },
      githubUrl: { type: Type.STRING, description: 'URL GitHub' },
      catalogUrl: { type: Type.STRING, description: 'URL Catalog aziendale' },
      demoUrl: { type: Type.STRING, description: 'URL demo' }
    },
    required: ['title', 'phaseIds']
  }
};

const createIdeaDeclaration: FunctionDeclaration = {
  name: 'create_idea',
  description: 'Crea una nuova Idea da sviluppare e la associa a una o più fasi.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Titolo dell\'idea' },
      problem: { type: Type.STRING, description: 'Problema che intende risolvere' },
      requirements: { type: Type.STRING, description: 'Requisiti tecnici o funzionali' },
      expectedBenefit: { type: Type.STRING, description: 'Beneficio atteso' },
      phaseIds: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Array di ID delle fasi'
      },
      owner: { type: Type.STRING, description: 'Autore / Proponente dell\'idea' }
    },
    required: ['title', 'phaseIds']
  }
};

const createNeedDeclaration: FunctionDeclaration = {
  name: 'create_need',
  description: 'Crea una nuova Esigenza operativa e la associa a una o più fasi.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Titolo dell\'esigenza' },
      description: { type: Type.STRING, description: 'Descrizione dettagliata del bisogno' },
      currentProcess: { type: Type.STRING, description: 'Come viene gestita l\'attività oggi' },
      desiredTool: { type: Type.STRING, description: 'Tool o agente desiderato' },
      desiredOutcome: { type: Type.STRING, description: 'Risultato desiderato' },
      phaseIds: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Array di ID delle fasi'
      },
      owner: { type: Type.STRING, description: 'Owner / Referente dell\'esigenza' }
    },
    required: ['title', 'phaseIds']
  }
};

const createPhaseDeclaration: FunctionDeclaration = {
  name: 'create_phase',
  description: 'Crea una nuova fase nel processo T&A e la inserisce nella sequenza.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Nome della nuova fase' },
      description: { type: Type.STRING, description: 'Descrizione dello scopo della fase' },
      targetIndex: { type: Type.NUMBER, description: 'Indice/posizione in cui inserire la fase' },
      activities: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Lista di attività principali'
      }
    },
    required: ['title']
  }
};

const updateItemDeclaration: FunctionDeclaration = {
  name: 'update_item',
  description: 'Modifica o rinomina un Tool, un\'Idea o un\'Esigenza esistente. Richiede ID o titolo dell\'elemento e conferma preventiva.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      itemId: { type: Type.STRING, description: 'ID o titolo dell\'elemento da modificare' },
      title: { type: Type.STRING, description: 'Nuovo titolo' },
      summary: { type: Type.STRING, description: 'Nuova sintesi breve' },
      description: { type: Type.STRING, description: 'Nuova descrizione completa' },
      generalizationRequired: { type: Type.BOOLEAN, description: 'Flag Da generalizzare' },
      phaseIds: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Nuove fasi coperte'
      },
      confirmed: { type: Type.BOOLEAN, description: 'Se la modifica è già stata confermata esplicitamente dall\'utente' }
    },
    required: ['itemId']
  }
};

const deleteItemDeclaration: FunctionDeclaration = {
  name: 'delete_item',
  description: 'Elimina un Tool, Idea o Esigenza dal grafo e dal database. Richiede conferma preventiva.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      itemId: { type: Type.STRING, description: 'ID o titolo dell\'elemento da eliminare' },
      confirmed: { type: Type.BOOLEAN, description: 'Se l\'eliminazione è già stata confermata dall\'utente' }
    },
    required: ['itemId']
  }
};

const createDashboardTileDeclaration: FunctionDeclaration = {
  name: 'create_dashboard_tile',
  description: `Configura un tile della dashboard (griglia di ${DASHBOARD_SLOTS} tile numerati da 1) definendo una query sui dati della mappa e come visualizzarla. Se lo slot è già occupato lo sostituisce. Chiamala direttamente con la configurazione migliore per la richiesta: il sistema mostra all'utente una card di anteprima da confermare, quindi non chiedere conferma a parole. Esempi: "le 3 esigenze con priorità più alta" = chart "list", itemTypes ["NEED"], sortBy "priority", order "asc", limit 3; "tool per cliente" = chart "bar", groupBy "customer", itemTypes ["TOOL"]; "quanti WiP creati negli ultimi 7 giorni" = chart "number", itemTypes ["IDEA"], where.createdWithinDays 7.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      slot: { type: Type.NUMBER, description: `Numero del tile, da 1 a ${DASHBOARD_SLOTS}` },
      title: { type: Type.STRING, description: 'Titolo breve del tile' },
      chart: {
        type: Type.STRING,
        enum: DASHBOARD_CHARTS,
        description: '"bar" = barre verticali, una per valore di groupBy (y = numero di elementi); "number" = un solo numero con il totale degli elementi; "list" = elenco ordinato dei singoli elementi (titolo, tipo, priorità), utile per classifiche e "ultimi N"'
      },
      itemTypes: {
        type: Type.ARRAY,
        items: { type: Type.STRING, enum: ITEM_TYPES },
        description: 'Quali elementi considerare: TOOL = tool, IDEA = WiP, NEED = esigenze. Se omesso, tutti'
      },
      where: {
        type: Type.OBJECT,
        description: 'Filtri facoltativi, tutti in AND. I testi corrispondono all\'inizio del valore, senza distinguere maiuscole',
        properties: {
          customer: { type: Type.STRING, description: 'Cliente' },
          tag: { type: Type.STRING, description: 'Tag' },
          phase: { type: Type.STRING, description: 'Titolo o ID della fase' },
          owner: { type: Type.STRING, description: 'Owner' },
          priorityMax: { type: Type.NUMBER, description: 'Solo elementi con priorità impostata e <= a questo valore (1 = più alta)' },
          createdWithinDays: { type: Type.NUMBER, description: 'Solo elementi creati negli ultimi N giorni' },
          generalizationRequired: { type: Type.BOOLEAN, description: 'Solo tool da generalizzare (true) o non da generalizzare (false)' }
        }
      },
      groupBy: {
        type: Type.STRING,
        enum: DASHBOARD_GROUP_BY,
        description: 'Solo per chart "bar" (obbligatorio): asse x. customer = clienti, tag, phase = fasi, type = tipo di elemento, owner, priority = priorità, month = mese di creazione'
      },
      sortBy: {
        type: Type.STRING,
        enum: DASHBOARD_SORT_BY,
        description: 'Solo per chart "list": criterio di ordinamento (default createdAt). Con "priority" compaiono solo gli elementi con priorità impostata'
      },
      order: {
        type: Type.STRING,
        enum: ['asc', 'desc'],
        description: 'Solo per chart "list". Per la priorità "asc" parte da 1 = la più alta; per le date "desc" parte dai più recenti'
      },
      limit: { type: Type.NUMBER, description: `Solo per chart "list": quanti elementi mostrare, da 1 a ${LIST_MAX_ROWS} (default ${LIST_DEFAULT_ROWS})` }
    },
    required: ['slot', 'title', 'chart']
  }
};

const toolsList = [
  searchItemsDeclaration,
  listPhasesDeclaration,
  getPhaseDeclaration,
  createToolDeclaration,
  createIdeaDeclaration,
  createNeedDeclaration,
  createPhaseDeclaration,
  updateItemDeclaration,
  deleteItemDeclaration,
  createDashboardTileDeclaration
];

// Same declarations for OpenAI-compatible endpoints: Gemini schema types are upper-case
// enums (Type.STRING = 'STRING'), OpenAI tools expect lower-case JSON Schema types.
// The `confirmed` flag is not exposed: on this path updates and deletions always go
// through the confirmation card.
function toJsonSchema(schema: any): any {
  const out: any = { ...schema };
  if (typeof schema.type === 'string') out.type = schema.type.toLowerCase();
  if (schema.items) out.items = toJsonSchema(schema.items);
  if (schema.properties) {
    out.properties = Object.fromEntries(
      Object.entries(schema.properties)
        .filter(([name]) => name !== 'confirmed')
        .map(([name, prop]) => [name, toJsonSchema(prop)])
    );
  }
  return out;
}

const openAiTools = toolsList.map(decl => ({
  type: 'function',
  function: {
    name: decl.name,
    description: decl.description,
    parameters: toJsonSchema(decl.parameters),
  },
}));

// Max model ↔ tool round trips per message (e.g. search_items, then update_item)
const MAX_TOOL_ROUNDS = 5;

function resolvePhaseId(input: string): string {
  const phases = db.getPhases();
  const lower = (input || '').toLowerCase();
  const direct = phases.find(p => p.id === input);
  if (direct) return direct.id;

  const match = phases.find(p =>
    p.title.toLowerCase().includes(lower) ||
    lower.includes(p.title.toLowerCase()) ||
    lower.includes(`fase ${p.position}`) ||
    lower.includes(`phase ${p.position}`)
  );
  if (match) return match.id;
  return phases[0]?.id || 'phase-1';
}

function findItemByQuery(query: string) {
  const items = db.getItems();
  const q = query.trim().toLowerCase();
  // 1. Exact ID
  const byId = items.find(i => i.id === query);
  if (byId) return byId;

  // 2. Exact Title
  const exactTitle = items.find(i => i.title.toLowerCase() === q);
  if (exactTitle) return exactTitle;

  // 3. Substring in Title
  const subTitle = items.find(i => i.title.toLowerCase().includes(q) || q.includes(i.title.toLowerCase()));
  if (subTitle) return subTitle;

  return null;
}

function stageCreateItem(user: string, title: string, fields: any): any {
  const resolvedPhaseIds: string[] = fields.phaseIds || [];
  const pending: PendingAction = {
    id: `act-${Date.now()}`,
    type: 'CREATE_ITEM',
    targetId: '',
    targetTitle: title,
    payload: {
      fields,
      phaseTitles: resolvedPhaseIds.map(id => db.getPhase(id)?.title).filter(Boolean)
    },
    status: 'PENDING'
  };
  pendingActionsByUser.set(user, pending);
  return {
    requiresConfirmation: true,
    pendingAction: pending,
    message: `Confermi la creazione di "${title}"?`
  };
}

function executeTool(name: string, args: any, user: string): any {
  switch (name) {
    case 'search_items': {
      const items = db.getItems({ search: args.query, type: args.type });
      return {
        count: items.length,
        items: items.map(i => ({
          id: i.id,
          title: i.title,
          type: i.type,
          phaseIds: i.phaseIds,
          generalizationRequired: i.generalizationRequired,
          summary: i.summary || i.description?.substring(0, 100)
        }))
      };
    }
    case 'list_phases': {
      const phases = db.getPhases();
      const allItems = db.getItems();
      return phases.map(p => ({
        id: p.id,
        position: p.position,
        title: p.title,
        description: p.description,
        toolsCount: allItems.filter(i => i.type === 'TOOL' && i.phaseIds.includes(p.id)).length,
        ideasCount: allItems.filter(i => i.type === 'IDEA' && i.phaseIds.includes(p.id)).length,
        needsCount: allItems.filter(i => i.type === 'NEED' && i.phaseIds.includes(p.id)).length,
      }));
    }
    case 'get_phase': {
      const phaseId = resolvePhaseId(args.phaseId);
      const phase = db.getPhase(phaseId);
      if (!phase) return { error: `Fase non trovata per ${args.phaseId}` };
      const items = db.getItems({ phaseId: phase.id });
      return {
        phase,
        tools: items.filter(i => i.type === 'TOOL'),
        ideas: items.filter(i => i.type === 'IDEA'),
        needs: items.filter(i => i.type === 'NEED')
      };
    }
    case 'create_tool': {
      const resolvedPhaseIds = (args.phaseIds || []).map((pid: string) => resolvePhaseId(pid));
      const fields = {
        type: 'TOOL' as const,
        title: args.title,
        description: args.description || args.summary || '',
        summary: args.summary || args.description?.slice(0, 80) || '',
        phaseIds: resolvedPhaseIds.length > 0 ? resolvedPhaseIds : ['phase-1'],
        owner: args.owner || user,
        generalizationRequired: args.generalizationRequired ?? false,
        githubUrl: args.githubUrl,
        catalogUrl: args.catalogUrl,
        demoUrl: args.demoUrl,
      };

      if (!args.confirmed) {
        return stageCreateItem(user, args.title, fields);
      }

      const created = db.createItem(fields, user);
      return {
        success: true,
        createdItem: created,
        message: `Tool "${created.title}" creato e collegato alle fasi indicate.`
      };
    }
    case 'create_idea': {
      const resolvedPhaseIds = (args.phaseIds || []).map((pid: string) => resolvePhaseId(pid));
      const fields = {
        type: 'IDEA' as const,
        title: args.title,
        problem: args.problem,
        requirements: args.requirements,
        expectedBenefit: args.expectedBenefit,
        phaseIds: resolvedPhaseIds.length > 0 ? resolvedPhaseIds : ['phase-3'],
        owner: args.owner || user,
      };

      if (!args.confirmed) {
        return stageCreateItem(user, args.title, fields);
      }

      const created = db.createItem(fields, user);
      return {
        success: true,
        createdItem: created,
        message: `Idea "${created.title}" creata con successo!`
      };
    }
    case 'create_need': {
      const resolvedPhaseIds = (args.phaseIds || []).map((pid: string) => resolvePhaseId(pid));
      const fields = {
        type: 'NEED' as const,
        title: args.title,
        description: args.description || '',
        currentProcess: args.currentProcess,
        desiredTool: args.desiredTool,
        desiredOutcome: args.desiredOutcome,
        phaseIds: resolvedPhaseIds.length > 0 ? resolvedPhaseIds : ['phase-1'],
        owner: args.owner || user,
      };

      if (!args.confirmed) {
        return stageCreateItem(user, args.title, fields);
      }

      const created = db.createItem(fields, user);
      return {
        success: true,
        createdItem: created,
        message: `Esigenza "${created.title}" registrata con successo!`
      };
    }
    case 'create_phase': {
      const fields = {
        title: args.title,
        description: args.description || '',
        targetIndex: typeof args.targetIndex === 'number' ? args.targetIndex : undefined,
        activities: args.activities || []
      };

      if (!args.confirmed) {
        const pending: PendingAction = {
          id: `act-${Date.now()}`,
          type: 'CREATE_PHASE',
          targetId: '',
          targetTitle: args.title,
          payload: { fields },
          status: 'PENDING'
        };
        pendingActionsByUser.set(user, pending);
        return {
          requiresConfirmation: true,
          pendingAction: pending,
          message: `Confermi la creazione della fase "${args.title}"?`
        };
      }

      const created = db.createPhase(fields, user);
      return {
        success: true,
        createdPhase: created,
        message: `Fase "${created.title}" inserita alla posizione ${created.position}.`
      };
    }
    case 'create_dashboard_tile': {
      const validated = validateTile(args);
      if ('error' in validated) return { error: validated.error };
      const { tile } = validated;
      const replaces = db.getDashboardTiles().find(t => t.slot === tile.slot)?.title;

      if (!args.confirmed) {
        const pending: PendingAction = {
          id: `act-${Date.now()}`,
          type: 'CREATE_TILE',
          targetId: String(tile.slot),
          targetTitle: tile.title,
          payload: { fields: tile, replaces },
          status: 'PENDING'
        };
        pendingActionsByUser.set(user, pending);
        return {
          requiresConfirmation: true,
          pendingAction: pending,
          message: `Confermi la configurazione del tile N°${tile.slot} "${tile.title}"?`
        };
      }

      db.upsertDashboardTile(tile);
      pendingActionsByUser.delete(user);
      return { success: true, message: `Tile N°${tile.slot} "${tile.title}" configurato.` };
    }
    case 'update_item': {
      const item = findItemByQuery(args.itemId);
      if (!item) return { error: `Elemento non trovato per "${args.itemId}"` };

      const updates: any = {};
      if (args.title) updates.title = args.title;
      if (args.summary) updates.summary = args.summary;
      if (args.description) updates.description = args.description;
      if (typeof args.generalizationRequired === 'boolean') updates.generalizationRequired = args.generalizationRequired;
      if (Array.isArray(args.phaseIds)) {
        updates.phaseIds = args.phaseIds.map((pid: string) => resolvePhaseId(pid));
      }

      if (!args.confirmed) {
        const pending: PendingAction = {
          id: `act-${Date.now()}`,
          type: 'UPDATE_ITEM',
          targetId: item.id,
          targetTitle: item.title,
          payload: updates,
          status: 'PENDING'
        };
        pendingActionsByUser.set(user, pending);
        return {
          requiresConfirmation: true,
          pendingAction: pending,
          message: `Confermi la modifica di "${item.title}"?`
        };
      }

      const updated = db.updateItem(item.id, updates, user);
      pendingActionsByUser.delete(user);
      return {
        success: true,
        updatedItem: updated,
        message: `Elemento "${item.title}" aggiornato.`
      };
    }
    case 'delete_item': {
      const item = findItemByQuery(args.itemId);
      if (!item) return { error: `Elemento non trovato per "${args.itemId}"` };

      if (!args.confirmed) {
        // Stage pending action
        const pending: PendingAction = {
          id: `act-${Date.now()}`,
          type: 'DELETE_ITEM',
          targetId: item.id,
          targetTitle: item.title,
          status: 'PENDING'
        };
        pendingActionsByUser.set(user, pending);
        return {
          requiresConfirmation: true,
          pendingAction: pending,
          message: `Confermi l'eliminazione di "${item.title}"?`
        };
      }

      db.deleteItem(item.id, user);
      pendingActionsByUser.delete(user);
      return {
        success: true,
        message: `Elemento "${item.title}" eliminato con successo dal grafo.`
      };
    }
    default:
      return { error: `Tool sconosciuto: ${name}` };
  }
}

// Fallback logic when GEMINI_API_KEY is absent or in local dev without network
function executeLocalIntents(prompt: string, user: string, confirmedAction?: PendingAction, cancelAction?: boolean) {
  const p = prompt.toLowerCase().trim();
  const allPhases = db.getPhases();
  const allItems = db.getItems();

  // 0. Handle cancellation
  if (cancelAction || p === 'annulla' || p === 'no' || p === 'lascia stare' || p === 'interrompi') {
    const pending = pendingActionsByUser.get(user);
    pendingActionsByUser.delete(user);
    if (pending) {
      return {
        reply: `Operazione annullata. **"${pending.targetTitle}"** non è stato eliminato. Nessuna modifica è stata apportata alla mappa.`,
        pendingAction: { ...pending, status: 'CANCELLED' as const }
      };
    }
    return {
      reply: 'Nessuna operazione in sospeso da annullare.'
    };
  }

  // 1. Handle confirmation
  if (confirmedAction || p === 'conferma' || p === 'sì' || p === 'si' || p === 'confermo' || p === 'procedi' || p === 'elimina') {
    const actionToExec = confirmedAction || pendingActionsByUser.get(user);
    if (actionToExec && actionToExec.type === 'DELETE_ITEM') {
      const deleted = db.deleteItem(actionToExec.targetId, user);
      pendingActionsByUser.delete(user);
      if (deleted) {
        return {
          reply: `✓ L'elemento **"${actionToExec.targetTitle}"** è stato **eliminato definitivamente** dal grafo e dal database.`,
          actionSummary: `Eliminato: "${actionToExec.targetTitle}"`,
          pendingAction: { ...actionToExec, status: 'CONFIRMED' as const }
        };
      } else {
        return {
          reply: `Non è stato possibile eliminare l'elemento (potrebbe essere già stato rimosso).`
        };
      }
    }
    if (actionToExec && actionToExec.type === 'UPDATE_ITEM') {
      const updated = db.updateItem(actionToExec.targetId, actionToExec.payload || {}, user);
      pendingActionsByUser.delete(user);
      return {
        reply: `✓ L'elemento **"${actionToExec.targetTitle}"** è stato aggiornato con successo.`,
        actionSummary: `Aggiornato: "${actionToExec.targetTitle}"`,
        pendingAction: { ...actionToExec, status: 'CONFIRMED' as const }
      };
    }
    if (actionToExec && actionToExec.type === 'CREATE_ITEM') {
      const created = db.createItem(actionToExec.payload.fields, user);
      pendingActionsByUser.delete(user);
      return {
        reply: `✓ **"${created.title}"** è stato creato con successo.`,
        actionSummary: `Creato: "${created.title}"`,
        createdItem: created,
        pendingAction: { ...actionToExec, status: 'CONFIRMED' as const }
      };
    }
    if (actionToExec && actionToExec.type === 'CREATE_TILE') {
      const validated = validateTile(actionToExec.payload?.fields);
      if ('error' in validated) {
        pendingActionsByUser.delete(user);
        return { reply: `Non è stato possibile configurare il tile: ${validated.error}.` };
      }
      db.upsertDashboardTile(validated.tile);
      pendingActionsByUser.delete(user);
      return {
        reply: `✓ Tile N°${validated.tile.slot} **"${validated.tile.title}"** configurato nella dashboard.`,
        actionSummary: `Tile N°${validated.tile.slot} configurato: "${validated.tile.title}"`,
        pendingAction: { ...actionToExec, status: 'CONFIRMED' as const }
      };
    }
    if (actionToExec && actionToExec.type === 'CREATE_PHASE') {
      const created = db.createPhase(actionToExec.payload.fields, user);
      pendingActionsByUser.delete(user);
      return {
        reply: `✓ Fase **"${created.title}"** inserita alla posizione ${created.position}.`,
        actionSummary: `Fase creata: "${created.title}"`,
        createdPhase: created,
        pendingAction: { ...actionToExec, status: 'CONFIRMED' as const }
      };
    }
  }

  // 2. Intent: Cancella / Elimina elemento (e.g. "cancellami xxx", "elimina il tool Document AI", "cancella esigenza xxx")
  const deleteRegex = /^(?:cancellami|cancella|elimina|rimuovi|delete)\s+(?:l'esigenza|il tool|l'idea|la fase|l'elemento)?\s*(.+)/i;
  const deleteMatch = prompt.match(deleteRegex);
  if (deleteMatch && deleteMatch[1]) {
    const rawTarget = deleteMatch[1].replace(/["']/g, '').trim();
    const item = findItemByQuery(rawTarget);
    if (item) {
      const pending: PendingAction = {
        id: `act-${Date.now()}`,
        type: 'DELETE_ITEM',
        targetId: item.id,
        targetTitle: item.title,
        status: 'PENDING'
      };
      pendingActionsByUser.set(user, pending);

      const typeLabel = item.type === 'TOOL' ? 'Tool' : item.type === 'IDEA' ? 'Idea' : 'Esigenza';
      return {
        reply: `⚠️ **Richiesta di eliminazione**\n\nSei sicuro di voler eliminare **"${item.title}"** (${typeLabel})?\n\nQuesta operazione cancellerà definitivamente il nodo e tutte le sue connessioni dal grafo. Clicca sul pulsante qui sotto per confermare o annullare:`,
        pendingAction: pending
      };
    }

    return {
      reply: `Non ho trovato nessun elemento corrispondente a **"${rawTarget}"**. Verifica il nome o cerca tra gli elementi della mappa.`
    };
  }

  // 3. Intent: Modifica elemento (e.g. "modifica xxx: nuova descrizione...", "rinomina xxx in yyy")
  const renameRegex = /(?:rinomina|modifica titolo di)\s+["']?([^"']+)["']?\s+in\s+["']?([^"']+)["']?/i;
  const renameMatch = prompt.match(renameRegex);
  if (renameMatch && renameMatch[1] && renameMatch[2]) {
    const targetName = renameMatch[1].trim();
    const newTitle = renameMatch[2].trim();
    const item = findItemByQuery(targetName);
    if (item) {
      const pending: PendingAction = {
        id: `act-${Date.now()}`,
        type: 'UPDATE_ITEM',
        targetId: item.id,
        targetTitle: item.title,
        payload: { title: newTitle },
        status: 'PENDING'
      };
      pendingActionsByUser.set(user, pending);
      return {
        reply: `⚠️ **Richiesta di modifica**\n\nVuoi confermare la ridenominazione di **"${item.title}"** in **"${newTitle}"**?`,
        pendingAction: pending
      };
    }
  }

  // 4. Intent: Aggiungi esigenza
  if (p.includes('aggiungi un\'esigenza') || p.includes('aggiungi esigenza') || p.includes('nuova esigenza')) {
    let targetPhase = allPhases.find(ph => p.includes(ph.title.toLowerCase()) || p.includes(ph.id));
    if (!targetPhase) {
      if (p.includes('readiness') || p.includes('provisioning')) targetPhase = allPhases.find(ph => ph.id === 'phase-3');
      else if (p.includes('assessment')) targetPhase = allPhases.find(ph => ph.id === 'phase-1');
      else if (p.includes('gap') || p.includes('design')) targetPhase = allPhases.find(ph => ph.id === 'phase-2');
      else if (p.includes('devops') || p.includes('adaptation')) targetPhase = allPhases.find(ph => ph.id === 'phase-4');
      else targetPhase = allPhases[1];
    }

    let title = 'Nuova Esigenza Operativa';
    const colonMatch = prompt.split(/:\s*/);
    if (colonMatch.length > 1) {
      title = colonMatch[1].split('.')[0].trim();
      if (title.length > 60) title = title.substring(0, 60);
    } else {
      title = prompt.replace(/aggiungi (un'esigenza|esigenza) (a|alla fase|in)?/i, '').trim();
    }

    const fields = {
      type: 'NEED' as const,
      title,
      description: prompt,
      desiredTool: 'Agente / Tool automatizzato',
      phaseIds: [targetPhase ? targetPhase.id : 'phase-1'],
    };
    const staged = stageCreateItem(user, title, fields);
    return { reply: staged.message, pendingAction: staged.pendingAction };
  }

  // 5. Intent: Aggiungi idea
  if (p.includes('aggiungi come idea') || p.includes('aggiungi idea') || p.includes('nuova idea')) {
    let targetPhases = allPhases.filter(ph => p.includes(ph.title.toLowerCase()) || p.includes(ph.id));
    if (targetPhases.length === 0) {
      if (p.includes('kubernetes') || p.includes('openshift') || p.includes('mcp')) {
        targetPhases = allPhases.filter(ph => ['phase-3', 'phase-4', 'phase-7'].includes(ph.id));
      } else {
        targetPhases = [allPhases[2] || allPhases[0]];
      }
    }

    let title = 'Nuova Idea';
    if (p.includes('mcp')) title = 'Kubernetes / OpenShift MCP';
    else {
      const match = prompt.match(/idea\s+(?:per|di)?\s*([^,.:]+)/i);
      if (match && match[1]) title = match[1].trim();
    }

    const fields = {
      type: 'IDEA' as const,
      title,
      problem: prompt,
      requirements: 'Integrazione con cluster e protocollo MCP',
      phaseIds: targetPhases.map(ph => ph.id),
      owner: user,
    };
    const staged = stageCreateItem(user, title, fields);
    return { reply: staged.message, pendingAction: staged.pendingAction };
  }

  // 6. Intent: Aggiungi fase
  if (p.includes('aggiungi fase') || p.includes('inserisci una fase') || p.includes('nuova fase')) {
    let title = 'Discovery Cliente';
    if (p.includes('discovery')) title = 'Discovery Cliente';
    else {
      const m = prompt.match(/fase\s+["']?([^"'.:,]+)["']?/i);
      if (m && m[1]) title = m[1].trim();
    }

    let targetIdx = 1;
    if (p.includes('prima di assessment')) {
      const assess = allPhases.find(ph => ph.id === 'phase-1');
      targetIdx = assess ? assess.position : 1;
    }

    const fields = {
      title,
      description: 'Attività preliminari di allineamento e discovery con gli stakeholder.',
      targetIndex: targetIdx,
      activities: ['Kick-off meeting', 'Interviste stakeholder', 'Raccolta accessi e prerequisiti']
    };
    const pending: PendingAction = {
      id: `act-${Date.now()}`,
      type: 'CREATE_PHASE',
      targetId: '',
      targetTitle: title,
      payload: { fields },
      status: 'PENDING'
    };
    pendingActionsByUser.set(user, pending);
    return {
      reply: `Confermi la creazione della fase "${title}"?`,
      pendingAction: pending
    };
  }

  // 7. Domande sui Tool di una fase
  if (p.includes('che tool abbiamo') || p.includes('quali tool') || p.includes('tool per')) {
    const matchedPhase = allPhases.find(ph => p.includes(ph.title.toLowerCase()) || p.includes(ph.id));
    if (matchedPhase) {
      const tools = allItems.filter(i => i.type === 'TOOL' && i.phaseIds.includes(matchedPhase.id));
      if (tools.length === 0) {
        return {
          reply: `Per la fase **${matchedPhase.title}** attualmente **non sono mappati Tool specifici** (questo evidenzia un gap di automazione). Puoi cliccare su "+" sopra la fase per aggiungerne uno!`
        };
      }
      const list = tools.map((t, i) => `${i + 1}. **${t.title}** ${t.generalizationRequired ? '*(Da generalizzare)*' : ''}: ${t.summary || t.description}`).join('\n');
      return {
        reply: `Per la fase **${matchedPhase.title}** abbiamo attualmente ${tools.length} tool:\n\n${list}`
      };
    }
  }

  // 8. Tool da generalizzare
  if (p.includes('generalizzare') || p.includes('da generalizzare')) {
    const generalizeTools = allItems.filter(i => i.type === 'TOOL' && i.generalizationRequired);
    const list = generalizeTools.map((t, i) => `${i + 1}. **${t.title}** (Copre: ${t.phaseIds.map(pid => allPhases.find(p => p.id === pid)?.title).join(', ')}) - Owner: ${t.owner || 'N/A'}`).join('\n');
    return {
      reply: `I seguenti **${generalizeTools.length} tool** sono contrassegnati come **"Da generalizzare"** per poter essere riutilizzati in altri progetti:\n\n${list}`
    };
  }

  // 9. Tool multi-fase
  if (p.includes('più fasi') || p.includes('multifase') || p.includes('trasversal')) {
    const multi = allItems.filter(i => i.type === 'TOOL' && i.phaseIds.length > 1);
    const list = multi.map(t => `- **${t.title}**: copre **${t.phaseIds.length} fasi** (${t.phaseIds.map(pid => allPhases.find(p => p.id === pid)?.title).join(', ')})`).join('\n');
    return {
      reply: `I tool trasversali che coprono più fasi sono:\n\n${list}`
    };
  }

  // 10. Esigenze scoperte o aperte
  if (p.includes('esigenze') || p.includes('gap')) {
    const needs = allItems.filter(i => i.type === 'NEED');
    const list = needs.slice(0, 5).map(n => `- **${n.title}** (${n.phaseIds.map(pid => allPhases.find(p => p.id === pid)?.title).join(', ')}): ${n.summary || n.description}`).join('\n');
    return {
      reply: `Ci sono attualmente **${needs.length} esigenze operative** aperte mappate sul processo. Eccone alcune prioritarie:\n\n${list}\n\nPuoi cliccare sulle sfere verdi nella mappa per approfondirle.`
    };
  }

  // Risposta standard
  return {
    reply: `Sono il **T&A Assistant**. Conosco l'intero processo end-to-end (${allPhases.length} fasi), i tool esistenti, le idee e le esigenze operative.

Puoi chiedermi di:
- *"Che tool abbiamo per Assessment?"*
- *"Quali tool coprono più fasi?"*
- *"Quali tool devono essere generalizzati?"*
- *"Aggiungi un'esigenza a Readiness: Terraform automatizzato"*
- *"Cancellami [nome elemento]"* (con conferma guidata)
- *"Rinomina [elemento] in [nuovo nome]"* (con conferma)`
  };
}

export async function handleAssistantChat(
  userMessage: string,
  user: string = 'local.user',
  confirmedAction?: PendingAction,
  cancelAction?: boolean
): Promise<{ reply: string; actionSummary?: string; pendingAction?: PendingAction }> {
  // If user is directly confirming or cancelling an action
  if (confirmedAction || cancelAction) {
    return executeLocalIntents(userMessage, user, confirmedAction, cancelAction);
  }

  // Check if message is a confirmation or cancellation of a stored pending action
  const pending = pendingActionsByUser.get(user);
  if (pending && (
    userMessage.toLowerCase().trim() === 'sì' ||
    userMessage.toLowerCase().trim() === 'si' ||
    userMessage.toLowerCase().trim() === 'conferma' ||
    userMessage.toLowerCase().trim() === 'procedi' ||
    userMessage.toLowerCase().trim() === 'elimina' ||
    userMessage.toLowerCase().trim() === 'annulla' ||
    userMessage.toLowerCase().trim() === 'no'
  )) {
    return executeLocalIntents(userMessage, user, confirmedAction, cancelAction);
  }

  async function handleOpenAIChat(
  userMessage: string,
  user: string,
  settings: AISettings
): Promise<{ reply: string; actionSummary?: string; pendingAction?: PendingAction } | null> {
  const allPhases = db.getPhases();
  const allItems = db.getItems();

  let baseUrl = (settings.openaiBaseUrl || 'https://api.openai.com/v1').trim().replace(/\/+$/, '');
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = 'https://' + baseUrl;
  }

  const systemInstruction = `Sei l'assistente esperto di T&A AI Toolbox per Accenture Technology & Architecture.
L'applicazione visualizza il processo di lavoro T&A a "matitoni" centrali con sfere sopra (Tool e Idee) e sfere sotto (Esigenze).
Hai accesso a funzioni di sistema per cercare elementi, consultare le fasi, creare tool, idee, esigenze e fasi, modificare ed eliminare elementi.
Per creare, modificare o eliminare qualcosa DEVI chiamare la funzione corrispondente: non dichiarare mai di aver eseguito un'operazione senza averla chiamata.
Modifiche ed eliminazioni non sono immediate: il sistema mostra all'utente una card di conferma. In quel caso di' all'utente di confermare dalla card, non che l'operazione è completata.
Nei parametri phaseIds usa gli ID delle fasi (es. "phase-1").
La dashboard ha ${DASHBOARD_SLOTS} tile numerati da 1. Quando l'utente chiede di configurare un tile (es. "tile N°3", "le 3 esigenze con priorità più alta") chiama SUBITO create_dashboard_tile con lo slot indicato, traducendo la richiesta in una query (itemTypes, where) e in un tipo di visualizzazione (chart: bar, number o list): non proporre alternative a parole e non chiedere conferma, perché il sistema mostra una card con l'anteprima che l'utente conferma. La priorità 1 è la più alta. Se manca lo slot, chiedilo. Solo se la richiesta non è proprio esprimibile con i parametri della funzione, spiega il limite.
Rispondi in modo professionale, conciso e in lingua italiana, utilizzando formattazione markdown (elenchi puntati, **grassetto**, ecc.).
Attualmente ci sono ${allItems.length} elementi (${allItems.filter(i => i.type === 'TOOL').length} tool, ${allItems.filter(i => i.type === 'IDEA').length} idee, ${allItems.filter(i => i.type === 'NEED').length} esigenze) e ${allPhases.length} fasi.
Fasi di processo:
${allPhases.map(p => `- ${p.id} (pos ${p.position}): ${p.title} - ${p.description}`).join('\n')}
Elementi attuali:
${allItems.map(i => `- [${i.type}] "${i.title}" (ID: ${i.id}, Fasi: ${i.phaseIds.join(', ')}): ${i.summary || i.description?.substring(0, 100)}`).join('\n')}`;

  const messages: any[] = [
    { role: 'system', content: systemInstruction },
    { role: 'user', content: userMessage }
  ];
  const actionSummaries: string[] = [];
  let pendingAction: PendingAction | undefined;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const isLastRound = round === MAX_TOOL_ROUNDS - 1;
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.openaiApiKey.trim()}`,
      },
      body: JSON.stringify({
        model: settings.openaiModel || 'gpt-4o-mini',
        messages,
        tools: openAiTools,
        // Last round: force a text answer (tools stay declared, Anthropic rejects
        // tool results in the history without tool definitions)
        tool_choice: isLastRound ? 'none' : 'auto',
        // No temperature: some models reject anything but their default
        // (e.g. claude-opus-5-5 via LiteLLM accepts only temperature=1)
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Custom OpenAI API error:', res.status, errorText);
      // Tools already executed: report them instead of falling back to another
      // engine, which could run the same action twice
      if (actionSummaries.length > 0 || pendingAction) {
        return {
          reply: 'Ho eseguito le operazioni richieste, ma il modello non ha completato la risposta.',
          actionSummary: actionSummaries.join(' · ') || undefined,
          pendingAction
        };
      }
      throw new Error(`Errore API OpenAI custom (${res.status}): ${errorText.substring(0, 100)}`);
    }

    const data = await res.json();
    const message = data.choices?.[0]?.message;
    const toolCalls = message?.tool_calls;

    if (!toolCalls || toolCalls.length === 0) {
      return {
        reply: message?.content || 'Nessuna risposta dal modello custom.',
        actionSummary: actionSummaries.join(' · ') || undefined,
        pendingAction
      };
    }

    // Send the assistant message back unchanged: with Gemini 3 behind LiteLLM it
    // carries the thought signature required by the follow-up request
    messages.push(message);

    for (const call of toolCalls) {
      let result: any;
      try {
        const args = JSON.parse(call.function?.arguments || '{}');
        // The model can never confirm on the user's behalf
        delete args.confirmed;
        result = executeTool(call.function?.name, args, user);
      } catch (err: any) {
        result = { error: err.message || 'Errore durante l\'esecuzione della funzione' };
      }
      if (result?.success && result.message) actionSummaries.push(result.message);
      if (result?.pendingAction) pendingAction = result.pendingAction;
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }

  // Only reached if the model ignores tool_choice 'none' on the last round
  return {
    reply: 'Nessuna risposta dal modello custom.',
    actionSummary: actionSummaries.join(' · ') || undefined,
    pendingAction
  };
}

// If message contains explicit delete or rename intent, handle with confirmation prompt immediately
  const p = userMessage.toLowerCase().trim();
  if (
    p.startsWith('cancellami') ||
    p.startsWith('cancella') ||
    p.startsWith('elimina') ||
    p.startsWith('rimuovi') ||
    p.startsWith('rinomina')
  ) {
    return executeLocalIntents(userMessage, user);
  }

  // 1. Check if Custom OpenAI is enabled and configured
  const aiSettings = settingsStore.getSettings();
  if (aiSettings.provider === 'openai' && aiSettings.openaiApiKey) {
    try {
      const openAiResult = await handleOpenAIChat(userMessage, user, aiSettings);
      if (openAiResult) return openAiResult;
    } catch (err: any) {
      // No fallback: the keyword engine below would write wrong data to the graph
      // (e.g. an idea titled with the whole sentence) when the provider is down
      console.warn('Custom OpenAI execution error:', err.message);
      return {
        reply: `⚠️ Il provider AI configurato non ha risposto correttamente, quindi **nessuna modifica è stata apportata alla mappa**.\n\nDettaglio: \`${err.message}\`\n\nRiprova tra poco o verifica la configurazione in **Settings AI**.`
      };
    }
  }

  // 2. If a Gemini API key is configured, invoke Gemini with tools
  const geminiKey = settingsStore.getGeminiApiKey();
  if (geminiKey && geminiKey.length > 10) {
    try {
      const { geminiBaseUrl, geminiModel } = settingsStore.getSettings();
      const ai = createGeminiClient(geminiKey, geminiBaseUrl);
      const allPhases = db.getPhases();
      const allItems = db.getItems();
      const systemInstruction = `Sei l'assistente esperto di T&A AI Toolbox per Accenture Technology & Architecture.
L'applicazione visualizza il processo di lavoro T&A a "matitoni" centrali con sfere sopra (Tool e Idee) e sfere sotto (Esigenze).
Hai accesso a funzioni di sistema per cercare elementi, consultare le fasi, creare, modificare ed eliminare tool, idee ed esigenze.
Per configurare un tile della dashboard (numerati da 1 a ${DASHBOARD_SLOTS}) USA subito create_dashboard_tile con lo slot indicato dall'utente, traducendo la richiesta in una query e in un tipo di visualizzazione (bar, number, list); la conferma è una card mostrata dal sistema.
Quando l'utente chiede di eliminare o modificare un elemento, USA delete_item o update_item. Per l'eliminazione, richiedi SEMPRE conferma preventiva all'utente prima di cancellare definitivamente.
Rispondi in modo professionale, conciso e in lingua italiana.
Attualmente ci sono ${allItems.length} elementi (${allItems.filter(i => i.type === 'TOOL').length} tool, ${allItems.filter(i => i.type === 'IDEA').length} idee, ${allItems.filter(i => i.type === 'NEED').length} esigenze).`;

      const response = await ai.models.generateContent({
        model: geminiModel,
        contents: userMessage,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: toolsList }]
        }
      });

      const functionCalls = response.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        let actionSummary = '';
        let pendingActionToReturn: PendingAction | undefined;
        const toolResponses = [];

        for (const call of functionCalls) {
          if (!call.name) continue;
          const result = executeTool(call.name, call.args, user);
          toolResponses.push(result);
          if (result && (result as any).message) {
            actionSummary = (result as any).message;
          }
          if (result && (result as any).pendingAction) {
            pendingActionToReturn = (result as any).pendingAction;
          }
        }

        const followUp = await ai.models.generateContent({
          model: geminiModel,
          contents: [
            { role: 'user', parts: [{ text: userMessage }] },
            {
              role: 'model',
              parts: functionCalls.map(c => ({
                functionCall: { name: c.name, args: c.args }
              }))
            },
            {
              role: 'user',
              parts: [{ text: `Risultati dell'esecuzione:\n${JSON.stringify(toolResponses, null, 2)}\nSpiega all'utente il risultato o chiedi conferma se richiesta.` }]
            }
          ],
          config: {
            systemInstruction
          }
        });

        return {
          reply: followUp.text || 'Operazione elaborata.',
          actionSummary,
          pendingAction: pendingActionToReturn
        };
      }

      return {
        reply: response.text || 'Ho elaborato la tua richiesta.'
      };
    } catch (err) {
      console.warn('Gemini API call error, using deterministic engine:', err);
    }
  }

  // Deterministic fallback
  return executeLocalIntents(userMessage, user);
}
