import { Type, FunctionDeclaration } from '@google/genai';
import { db } from './store.ts';
import { settingsStore, createGeminiClient, checkEndpoint } from './settingsStore.ts';
import { PendingAction, AISettings, AuthUser } from '../src/types/index.ts';
import { anonymousNeedAllowed, canEdit } from './auth.ts';
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

// Who is chatting and on which practice's map. Anonymous visitors (user = null) can only read.
export interface ChatContext {
  user: AuthUser | null;
  practiceId: string;
  // Client address, used to rate limit needs submitted without login
  ip?: string;
}

// Stored pending actions per user awaiting confirmation (keyed by username)
const pendingActionsByUser = new Map<string, PendingAction>();

function practiceName(practiceId: string): string {
  return db.getPractice(practiceId)?.name ?? practiceId;
}

// Message to show when the user may not write on the practice, or null when allowed
function writeDenied(ctx: ChatContext, practiceId: string): string | null {
  if (!ctx.user) return 'To create tools, WiPs or phases, or to edit and delete anything, you need to sign in with the "Sign in" button at the top right. Without signing in I can browse the map and register new needs.';
  if (!canEdit(ctx.user, practiceId)) return `You do not have permission to edit the practice "${practiceName(practiceId)}".`;
  return null;
}

// What the current user may do, spelled out for the model: the assistant has exactly the rights of the user
function permissionNote(ctx: ChatContext): string {
  if (ctx.user && canEdit(ctx.user, ctx.practiceId)) {
    return `The user "${ctx.user.username}" is signed in and may edit this practice: you may create, edit and delete everything here (still with the confirmation card).\n`;
  }
  const why = ctx.user
    ? `The user "${ctx.user.username}" is signed in but has no edit rights on this practice`
    : 'The user is not signed in';
  const fix = ctx.user ? 'they need a user with edit rights on this practice' : 'they must sign in with the "Sign in" button';
  return `${why}. They CAN: browse and search, and create needs (create_need, with the confirmation card), exactly like the "+" under a phase. They CANNOT: create tools, WiPs, phases or dashboard tiles, or edit or delete anything: for those, tell them ${fix}; the write functions will return an error.\n`;
}

// The phase the user asked for, else the preferred one when it exists in the practice, else the first
function defaultPhaseId(practiceId: string, preferredId: string): string {
  const phases = db.getPhases(practiceId);
  return phases.find(p => p.id === preferredId)?.id ?? phases[0]?.id ?? '';
}

// create_need is open to everybody (like the "+" on the map); everything else needs edit rights
const WRITE_TOOLS = new Set(['create_tool', 'create_idea', 'create_phase', 'create_dashboard_tile', 'update_item', 'delete_item']);

// Function Declarations per Gemini Function Calling
const searchItemsDeclaration: FunctionDeclaration = {
  name: 'search_items',
  description: 'Search tools, WiP items or needs in the current practice of ADM Project Blueprint.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: 'Search term (e.g. "terraform", "assessment", "diagrams")' },
      type: { type: Type.STRING, description: 'Optional type filter: TOOL, IDEA (WiP), or NEED' }
    }
  }
};

const listPhasesDeclaration: FunctionDeclaration = {
  name: 'list_phases',
  description: 'List all process phases of the current practice in sequential order with id, title and statistics.',
  parameters: {
    type: Type.OBJECT,
    properties: {}
  }
};

const getPhaseDeclaration: FunctionDeclaration = {
  name: 'get_phase',
  description: 'Get the details of a specific phase (title, description, activities, linked tools and needs).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      phaseId: { type: Type.STRING, description: 'Phase ID (e.g. "phase-1") or title/number' }
    },
    required: ['phaseId']
  }
};

const createToolDeclaration: FunctionDeclaration = {
  name: 'create_tool',
  description: 'Create a new Tool and link it to one or more phases of the current practice process.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Tool name' },
      description: { type: Type.STRING, description: 'Full description of the tool' },
      summary: { type: Type.STRING, description: 'Short summary (1 line)' },
      phaseIds: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Array of linked phase IDs (e.g. ["phase-1", "phase-2"])'
      },
      owner: { type: Type.STRING, description: 'Owner or POC of the tool' },
      generalizationRequired: { type: Type.BOOLEAN, description: 'Whether the tool needs to be generalized (default false)' },
      githubUrl: { type: Type.STRING, description: 'URL GitHub' },
      catalogUrl: { type: Type.STRING, description: 'Company catalog URL' },
      demoUrl: { type: Type.STRING, description: 'Demo URL' }
    },
    required: ['title', 'phaseIds']
  }
};

const createIdeaDeclaration: FunctionDeclaration = {
  name: 'create_idea',
  description: 'Create a new WiP (work in progress idea) to develop and link it to one or more phases.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'WiP title' },
      problem: { type: Type.STRING, description: 'Problem it aims to solve' },
      requirements: { type: Type.STRING, description: 'Technical or functional requirements' },
      expectedBenefit: { type: Type.STRING, description: 'Expected benefit' },
      phaseIds: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Array of phase IDs'
      },
      owner: { type: Type.STRING, description: 'Author / proposer of the WiP' }
    },
    required: ['title', 'phaseIds']
  }
};

const createNeedDeclaration: FunctionDeclaration = {
  name: 'create_need',
  description: 'Create a new operational Need and link it to one or more phases.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Need title' },
      description: { type: Type.STRING, description: 'Detailed description of the need' },
      currentProcess: { type: Type.STRING, description: 'How the activity is handled today' },
      desiredTool: { type: Type.STRING, description: 'Desired tool or agent' },
      desiredOutcome: { type: Type.STRING, description: 'Desired outcome' },
      phaseIds: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Array of phase IDs'
      },
      owner: { type: Type.STRING, description: 'Owner / contact person of the need' }
    },
    required: ['title', 'phaseIds']
  }
};

const createPhaseDeclaration: FunctionDeclaration = {
  name: 'create_phase',
  description: 'Create a new phase in the current practice process and insert it into the sequence.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Name of the new phase' },
      description: { type: Type.STRING, description: 'Description of the purpose of the phase' },
      targetIndex: { type: Type.NUMBER, description: 'Index/position at which to insert the phase' },
      activities: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'List of main activities'
      }
    },
    required: ['title']
  }
};

const updateItemDeclaration: FunctionDeclaration = {
  name: 'update_item',
  description: 'Edit or rename an existing Tool, WiP or Need. Requires the item ID or title and prior confirmation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      itemId: { type: Type.STRING, description: 'ID or title of the item to edit' },
      title: { type: Type.STRING, description: 'New title' },
      summary: { type: Type.STRING, description: 'New short summary' },
      description: { type: Type.STRING, description: 'New full description' },
      generalizationRequired: { type: Type.BOOLEAN, description: '"To generalize" flag' },
      phaseIds: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'New phases covered'
      },
      confirmed: { type: Type.BOOLEAN, description: 'Whether the user has already explicitly confirmed the change' }
    },
    required: ['itemId']
  }
};

const deleteItemDeclaration: FunctionDeclaration = {
  name: 'delete_item',
  description: 'Delete a Tool, WiP or Need from the graph and the database. Requires prior confirmation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      itemId: { type: Type.STRING, description: 'ID or title of the item to delete' },
      confirmed: { type: Type.BOOLEAN, description: 'Whether the user has already confirmed the deletion' }
    },
    required: ['itemId']
  }
};

const createDashboardTileDeclaration: FunctionDeclaration = {
  name: 'create_dashboard_tile',
  description: `Configure a dashboard tile (grid of ${DASHBOARD_SLOTS} tiles numbered from 1) by defining a query on the map data and how to display it. If the slot is already taken it is replaced. Call it directly with the best configuration for the request: the system shows the user a preview card to confirm, so do not ask for confirmation in words. Examples: "the 3 needs with the highest priority" = chart "list", itemTypes ["NEED"], sortBy "priority", order "asc", limit 3; "tools per customer" = chart "bar", groupBy "customer", itemTypes ["TOOL"]; "how many WiP created in the last 7 days" = chart "number", itemTypes ["IDEA"], where.createdWithinDays 7.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      slot: { type: Type.NUMBER, description: `Tile number, from 1 to ${DASHBOARD_SLOTS}` },
      title: { type: Type.STRING, description: 'Short tile title' },
      chart: {
        type: Type.STRING,
        enum: DASHBOARD_CHARTS,
        description: '"bar" = vertical bars, one per groupBy value (y = number of items); "number" = a single number with the total count of items; "list" = sorted list of individual items (title, type, priority), useful for rankings and "latest N"'
      },
      itemTypes: {
        type: Type.ARRAY,
        items: { type: Type.STRING, enum: ITEM_TYPES },
        description: 'Which items to consider: TOOL = tools, IDEA = WiP, NEED = needs. All if omitted'
      },
      where: {
        type: Type.OBJECT,
        description: 'Optional filters, all combined with AND. Text values match the start of the value, case-insensitive',
        properties: {
          customer: { type: Type.STRING, description: 'Customer' },
          tag: { type: Type.STRING, description: 'Tag' },
          phase: { type: Type.STRING, description: 'Phase title or ID' },
          owner: { type: Type.STRING, description: 'Owner' },
          priorityMax: { type: Type.NUMBER, description: 'Only items with a priority set and <= this value (1 = highest)' },
          createdWithinDays: { type: Type.NUMBER, description: 'Only items created in the last N days' },
          generalizationRequired: { type: Type.BOOLEAN, description: 'Only tools to be generalized (true) or not to be generalized (false)' }
        }
      },
      groupBy: {
        type: Type.STRING,
        enum: DASHBOARD_GROUP_BY,
        description: 'Only for chart "bar" (required): x axis. customer = customers, tag, phase = phases, type = item type, owner, priority, month = creation month'
      },
      sortBy: {
        type: Type.STRING,
        enum: DASHBOARD_SORT_BY,
        description: 'Only for chart "list": sort criterion (default createdAt). With "priority" only items with a priority set are shown'
      },
      order: {
        type: Type.STRING,
        enum: ['asc', 'desc'],
        description: 'Only for chart "list". For priority, "asc" starts from 1 = highest; for dates, "desc" starts from the most recent'
      },
      limit: { type: Type.NUMBER, description: `Only for chart "list": how many items to show, from 1 to ${LIST_MAX_ROWS} (default ${LIST_DEFAULT_ROWS})` }
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

function resolvePhaseId(input: string, practiceId: string): string {
  const phases = db.getPhases(practiceId);
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
  return phases[0]?.id || '';
}

function findItemByQuery(query: string, practiceId: string) {
  const items = db.getItems({ practiceId });
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
    message: `Do you confirm the creation of "${title}"?`
  };
}

function executeTool(name: string, args: any, ctx: ChatContext): any {
  const user = ctx.user?.username ?? 'anonymous';
  const practiceId = ctx.practiceId;
  if (WRITE_TOOLS.has(name)) {
    const denied = writeDenied(ctx, practiceId);
    if (denied) return { error: denied };
  }
  switch (name) {
    case 'search_items': {
      const items = db.getItems({ practiceId, search: args.query, type: args.type });
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
      const phases = db.getPhases(practiceId);
      const allItems = db.getItems({ practiceId });
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
      const phaseId = resolvePhaseId(args.phaseId, practiceId);
      const phase = db.getPhase(phaseId);
      if (!phase) return { error: `Phase not found for ${args.phaseId}` };
      const items = db.getItems({ phaseId: phase.id });
      return {
        phase,
        tools: items.filter(i => i.type === 'TOOL'),
        ideas: items.filter(i => i.type === 'IDEA'),
        needs: items.filter(i => i.type === 'NEED')
      };
    }
    case 'create_tool': {
      const resolvedPhaseIds = (args.phaseIds || []).map((pid: string) => resolvePhaseId(pid, practiceId));
      const fields = {
        type: 'TOOL' as const,
        title: args.title,
        description: args.description || args.summary || '',
        summary: args.summary || args.description?.slice(0, 80) || '',
        phaseIds: resolvedPhaseIds.length > 0 ? resolvedPhaseIds : [defaultPhaseId(practiceId, 'phase-1')],
        practiceId,
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
        message: `Tool "${created.title}" created and linked to the specified phases.`
      };
    }
    case 'create_idea': {
      const resolvedPhaseIds = (args.phaseIds || []).map((pid: string) => resolvePhaseId(pid, practiceId));
      const fields = {
        type: 'IDEA' as const,
        title: args.title,
        problem: args.problem,
        requirements: args.requirements,
        expectedBenefit: args.expectedBenefit,
        phaseIds: resolvedPhaseIds.length > 0 ? resolvedPhaseIds : [defaultPhaseId(practiceId, 'phase-3')],
        practiceId,
        owner: args.owner || user,
      };

      if (!args.confirmed) {
        return stageCreateItem(user, args.title, fields);
      }

      const created = db.createItem(fields, user);
      return {
        success: true,
        createdItem: created,
        message: `WiP "${created.title}" created successfully!`
      };
    }
    case 'create_need': {
      const resolvedPhaseIds = (args.phaseIds || []).map((pid: string) => resolvePhaseId(pid, practiceId));
      const fields = {
        type: 'NEED' as const,
        title: args.title,
        description: args.description || '',
        currentProcess: args.currentProcess,
        desiredTool: args.desiredTool,
        desiredOutcome: args.desiredOutcome,
        phaseIds: resolvedPhaseIds.length > 0 ? resolvedPhaseIds : [defaultPhaseId(practiceId, 'phase-1')],
        practiceId,
        owner: args.owner || user,
      };

      if (!args.confirmed) {
        return stageCreateItem(user, args.title, fields);
      }

      const created = db.createItem(fields, user);
      return {
        success: true,
        createdItem: created,
        message: `Need "${created.title}" registered successfully!`
      };
    }
    case 'create_phase': {
      const fields = {
        practiceId,
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
          message: `Do you confirm the creation of the phase "${args.title}"?`
        };
      }

      const created = db.createPhase(fields, user);
      return {
        success: true,
        createdPhase: created,
        message: `Phase "${created.title}" inserted at position ${created.position}.`
      };
    }
    case 'create_dashboard_tile': {
      const validated = validateTile(args);
      if ('error' in validated) return { error: validated.error };
      const { tile } = validated;
      const replaces = db.getDashboardTiles(practiceId).find(t => t.slot === tile.slot)?.title;

      if (!args.confirmed) {
        const pending: PendingAction = {
          id: `act-${Date.now()}`,
          type: 'CREATE_TILE',
          targetId: String(tile.slot),
          targetTitle: tile.title,
          payload: { fields: tile, replaces, practiceId },
          status: 'PENDING'
        };
        pendingActionsByUser.set(user, pending);
        return {
          requiresConfirmation: true,
          pendingAction: pending,
          message: `Do you confirm the configuration of tile N°${tile.slot} "${tile.title}"?`
        };
      }

      db.upsertDashboardTile(practiceId, tile);
      pendingActionsByUser.delete(user);
      return { success: true, message: `Tile N°${tile.slot} "${tile.title}" configured.` };
    }
    case 'update_item': {
      const item = findItemByQuery(args.itemId, practiceId);
      if (!item) return { error: `Item not found for "${args.itemId}"` };

      const updates: any = {};
      if (args.title) updates.title = args.title;
      if (args.summary) updates.summary = args.summary;
      if (args.description) updates.description = args.description;
      if (typeof args.generalizationRequired === 'boolean') updates.generalizationRequired = args.generalizationRequired;
      if (Array.isArray(args.phaseIds)) {
        updates.phaseIds = args.phaseIds.map((pid: string) => resolvePhaseId(pid, practiceId));
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
          message: `Do you confirm the change to "${item.title}"?`
        };
      }

      const updated = db.updateItem(item.id, updates, user);
      pendingActionsByUser.delete(user);
      return {
        success: true,
        updatedItem: updated,
        message: `Item "${item.title}" updated.`
      };
    }
    case 'delete_item': {
      const item = findItemByQuery(args.itemId, practiceId);
      if (!item) return { error: `Item not found for "${args.itemId}"` };

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
          message: `Do you confirm the deletion of "${item.title}"?`
        };
      }

      db.deleteItem(item.id, user);
      pendingActionsByUser.delete(user);
      return {
        success: true,
        message: `Item "${item.title}" successfully deleted from the graph.`
      };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// Typed confirm / cancel words, Italian and English. Compared after normalizeWord().
const CONFIRM_WORDS = new Set([
  'conferma', 'sì', 'si', 'confermo', 'procedi', 'elimina',
  'yes', 'confirm', 'confirmed', 'proceed', 'delete', 'ok',
]);
const CANCEL_WORDS = new Set([
  'annulla', 'no', 'lascia stare', 'interrompi',
  'cancel', 'never mind', 'nevermind', 'stop',
]);

// Lower-case, trimmed, without trailing punctuation ("Yes!" -> "yes")
function normalizeWord(text: string): string {
  return text.toLowerCase().trim().replace(/[\s.!]+$/, '');
}

// English add-intents ("add a need", "add as WiP", "insert a phase", ...). The word boundary
// after the noun keeps "new needs" / "phases" questions out of the create flows.
const NEED_INTENT = /\b(?:(?:add|create|insert)\s+(?:an?\s+)?(?:new\s+)?(?:operational\s+)?need|new\s+(?:operational\s+)?need)\b/;
const WIP_INTENT = /\b(?:(?:add|create)\s+(?:as\s+)?(?:an?\s+)?(?:new\s+)?(?:idea|wip)|new\s+(?:idea|wip))\b/;
const PHASE_INTENT = /\b(?:(?:add|insert|create)\s+(?:an?\s+)?(?:new\s+)?phase|new\s+phase)\b/;

// Fallback logic when GEMINI_API_KEY is absent or in local dev without network
function executeLocalIntents(prompt: string, ctx: ChatContext, confirmedAction?: PendingAction, cancelAction?: boolean) {
  const user = ctx.user?.username ?? 'anonymous';
  const practiceId = ctx.practiceId;
  const p = prompt.toLowerCase().trim();
  const word = normalizeWord(prompt);
  const allPhases = db.getPhases(practiceId);
  const allItems = db.getItems({ practiceId });
  // Anonymous or unauthorised users get the refusal instead of any write intent below
  const denied = writeDenied(ctx, practiceId);

  // 0. Handle cancellation
  if (cancelAction || CANCEL_WORDS.has(word)) {
    const pending = pendingActionsByUser.get(user);
    pendingActionsByUser.delete(user);
    if (pending) {
      return {
        reply: `Operation cancelled. **"${pending.targetTitle}"** was not changed. No changes were made to the map.`,
        pendingAction: { ...pending, status: 'CANCELLED' as const }
      };
    }
    return {
      reply: 'There is no pending operation to cancel.'
    };
  }

  // 1. Handle confirmation
  if (confirmedAction || CONFIRM_WORDS.has(word)) {
    // Anonymous visitors share one username: they can only confirm through the card, never by typing
    const actionToExec = confirmedAction || (ctx.user ? pendingActionsByUser.get(user) : undefined);
    const isNeedCreation = actionToExec?.type === 'CREATE_ITEM' && actionToExec.payload?.fields?.type === 'NEED';
    if (actionToExec && !isNeedCreation) {
      // Re-check on the practice that really owns the target: the payload comes from the client
      const fieldsPractice = actionToExec.payload?.fields?.practiceId ?? actionToExec.payload?.practiceId;
      const targetPractice = actionToExec.type === 'DELETE_ITEM' || actionToExec.type === 'UPDATE_ITEM'
        ? db.getItemPractice(actionToExec.targetId) ?? practiceId
        : typeof fieldsPractice === 'string' ? fieldsPractice : practiceId;
      const refusal = writeDenied(ctx, targetPractice);
      if (refusal) {
        pendingActionsByUser.delete(user);
        return { reply: refusal };
      }
      if (actionToExec.type === 'CREATE_ITEM' || actionToExec.type === 'CREATE_PHASE') {
        actionToExec.payload = { ...actionToExec.payload, fields: { ...actionToExec.payload?.fields, practiceId: targetPractice } };
      }
    }
    if (isNeedCreation && !ctx.user && !anonymousNeedAllowed(ctx.ip ?? 'unknown')) {
      return { reply: 'You have submitted too many needs in a short time: try again later or sign in.' };
    }
    if (actionToExec && actionToExec.type === 'DELETE_ITEM') {
      const deleted = db.deleteItem(actionToExec.targetId, user);
      pendingActionsByUser.delete(user);
      if (deleted) {
        return {
          reply: `✓ The item **"${actionToExec.targetTitle}"** has been **permanently deleted** from the graph and the database.`,
          actionSummary: `Deleted: "${actionToExec.targetTitle}"`,
          pendingAction: { ...actionToExec, status: 'CONFIRMED' as const }
        };
      } else {
        return {
          reply: `The item could not be deleted (it may already have been removed).`
        };
      }
    }
    if (actionToExec && actionToExec.type === 'UPDATE_ITEM') {
      const updated = db.updateItem(actionToExec.targetId, actionToExec.payload || {}, user);
      pendingActionsByUser.delete(user);
      return {
        reply: `✓ The item **"${actionToExec.targetTitle}"** was updated successfully.`,
        actionSummary: `Updated: "${actionToExec.targetTitle}"`,
        pendingAction: { ...actionToExec, status: 'CONFIRMED' as const }
      };
    }
    if (actionToExec && actionToExec.type === 'CREATE_ITEM') {
      const created = db.createItem(actionToExec.payload.fields, user);
      pendingActionsByUser.delete(user);
      return {
        reply: `✓ **"${created.title}"** was created successfully.`,
        actionSummary: `Created: "${created.title}"`,
        createdItem: created,
        pendingAction: { ...actionToExec, status: 'CONFIRMED' as const }
      };
    }
    if (actionToExec && actionToExec.type === 'CREATE_TILE') {
      const validated = validateTile(actionToExec.payload?.fields);
      if ('error' in validated) {
        pendingActionsByUser.delete(user);
        return { reply: `The tile could not be configured: ${validated.error}.` };
      }
      const tilePractice = actionToExec.payload?.practiceId ?? practiceId;
      db.upsertDashboardTile(tilePractice, validated.tile);
      pendingActionsByUser.delete(user);
      return {
        reply: `✓ Tile N°${validated.tile.slot} **"${validated.tile.title}"** configured on the dashboard.`,
        actionSummary: `Tile N°${validated.tile.slot} configured: "${validated.tile.title}"`,
        pendingAction: { ...actionToExec, status: 'CONFIRMED' as const }
      };
    }
    if (actionToExec && actionToExec.type === 'CREATE_PHASE') {
      const created = db.createPhase(actionToExec.payload.fields, user);
      pendingActionsByUser.delete(user);
      return {
        reply: `✓ Phase **"${created.title}"** inserted at position ${created.position}.`,
        actionSummary: `Phase created: "${created.title}"`,
        createdPhase: created,
        pendingAction: { ...actionToExec, status: 'CONFIRMED' as const }
      };
    }
  }

  // 2. Intent: delete an item (e.g. "delete the tool Document AI", "remove need xxx", "cancellami xxx", "elimina il tool Document AI")
  const deleteRegex = /^(?:cancellami|cancella|elimina|rimuovi|delete|remove)\s+(?:(?:l'esigenza|il tool|l'idea|la fase|l'elemento)\s*|(?:the\s+|an?\s+|il\s+|lo\s+|la\s+)?(?:need|tool|idea|wip|phase|item|esigenza|fase|elemento)\s+)?(.+)/i;
  const deleteMatch = prompt.match(deleteRegex);
  if (deleteMatch && deleteMatch[1]) {
    const rawTarget = deleteMatch[1].replace(/["']/g, '').trim();
    // The optional noun may belong to the title (e.g. "Tool Finder"): retry with the full text
    const fullTarget = prompt.replace(/^\S+\s+/, '').replace(/["']/g, '').trim();
    const item = findItemByQuery(rawTarget, practiceId) ?? findItemByQuery(fullTarget, practiceId);
    if (item) {
      if (denied) return { reply: denied };
      const pending: PendingAction = {
        id: `act-${Date.now()}`,
        type: 'DELETE_ITEM',
        targetId: item.id,
        targetTitle: item.title,
        status: 'PENDING'
      };
      pendingActionsByUser.set(user, pending);

      const typeLabel = item.type === 'TOOL' ? 'Tool' : item.type === 'IDEA' ? 'WiP' : 'Need';
      return {
        reply: `⚠️ **Deletion request**\n\nAre you sure you want to delete **"${item.title}"** (${typeLabel})?\n\nThis will permanently remove the node and all its connections from the graph. Use the buttons below to confirm or cancel:`,
        pendingAction: pending
      };
    }

    return {
      reply: `I could not find any item matching **"${rawTarget}"**. Check the name or browse the items on the map.`
    };
  }

  // 3. Intent: rename an item (e.g. "rename xxx to yyy", "rinomina xxx in yyy")
  const renameRegex = /(?:rinomina|rename|modifica titolo di|change (?:the )?title of)\s+["']?([^"']+)["']?\s+(?:in|to)\s+["']?([^"']+)["']?/i;
  const renameMatch = prompt.match(renameRegex);
  if (renameMatch && renameMatch[1] && renameMatch[2]) {
    const targetName = renameMatch[1].trim();
    const newTitle = renameMatch[2].trim();
    const item = findItemByQuery(targetName, practiceId);
    if (item) {
      if (denied) return { reply: denied };
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
        reply: `⚠️ **Change request**\n\nDo you confirm renaming **"${item.title}"** to **"${newTitle}"**?`,
        pendingAction: pending
      };
    }
  }

  // 4. Intent: add a need
  if (p.includes('aggiungi un\'esigenza') || p.includes('aggiungi esigenza') || p.includes('nuova esigenza') || NEED_INTENT.test(p)) {
    // Needs can be submitted by anyone, so no permission check here
    let targetPhase = allPhases.find(ph => p.includes(ph.title.toLowerCase()) || p.includes(ph.id));
    if (!targetPhase) {
      if (p.includes('readiness') || p.includes('provisioning')) targetPhase = allPhases.find(ph => ph.id === 'phase-3');
      else if (p.includes('assessment')) targetPhase = allPhases.find(ph => ph.id === 'phase-1');
      else if (p.includes('gap') || p.includes('design')) targetPhase = allPhases.find(ph => ph.id === 'phase-2');
      else if (p.includes('devops') || p.includes('adaptation')) targetPhase = allPhases.find(ph => ph.id === 'phase-4');
      else targetPhase = allPhases[1];
    }
    targetPhase ??= allPhases[0];

    let title = 'New operational need';
    const colonMatch = prompt.split(/:\s*/);
    if (colonMatch.length > 1) {
      title = colonMatch[1].split('.')[0].trim();
      if (title.length > 60) title = title.substring(0, 60);
    } else {
      title = prompt.replace(/(?:aggiungi (?:un'esigenza|esigenza)|(?:add|create|insert) (?:an? )?(?:new )?(?:operational )?need)\s*(?:(?:alla fase|a|in|to|for)\s+)?/i, '').trim();
    }

    const fields = {
      type: 'NEED' as const,
      title,
      description: prompt,
      desiredTool: 'Automated agent / tool',
      practiceId,
      phaseIds: targetPhase ? [targetPhase.id] : [],
    };
    const staged = stageCreateItem(user, title, fields);
    return { reply: staged.message, pendingAction: staged.pendingAction };
  }

  // 5. Intent: add a WiP (idea)
  if (p.includes('aggiungi come idea') || p.includes('aggiungi idea') || p.includes('nuova idea') || WIP_INTENT.test(p)) {
    if (denied) return { reply: denied };
    let targetPhases = allPhases.filter(ph => p.includes(ph.title.toLowerCase()) || p.includes(ph.id));
    if (targetPhases.length === 0) {
      if (p.includes('kubernetes') || p.includes('openshift') || p.includes('mcp')) {
        targetPhases = allPhases.filter(ph => ['phase-3', 'phase-4', 'phase-7'].includes(ph.id));
      } else {
        targetPhases = [allPhases[2] || allPhases[0]];
      }
    }
    if (targetPhases.length === 0 || !targetPhases[0]) targetPhases = allPhases.slice(0, 1);

    let title = 'New WiP';
    if (p.includes('mcp')) title = 'Kubernetes / OpenShift MCP';
    else {
      const match = prompt.match(/(?:idea|wip)\s+(?:(?:per|di|for|about)\s+)?([^,.:]+)/i);
      if (match && match[1]) title = match[1].trim().replace(/^(?:an?|the|un|una|uno)\s+/i, '') || title;
    }

    const fields = {
      type: 'IDEA' as const,
      title,
      problem: prompt,
      requirements: 'Integration with clusters and the MCP protocol',
      practiceId,
      phaseIds: targetPhases.map(ph => ph.id),
      owner: user,
    };
    const staged = stageCreateItem(user, title, fields);
    return { reply: staged.message, pendingAction: staged.pendingAction };
  }

  // 6. Intent: add a phase
  if (p.includes('aggiungi fase') || p.includes('inserisci una fase') || p.includes('nuova fase') || PHASE_INTENT.test(p)) {
    if (denied) return { reply: denied };
    let title = 'Customer Discovery';
    if (p.includes('discovery')) title = 'Customer Discovery';
    else {
      const m = prompt.match(/(?:fase|phase)\s+["']?([^"'.:,]+)["']?/i);
      if (m && m[1]) {
        // Drop a trailing position clause ("... before Assessment") and leading "called/named"
        const cleaned = m[1].replace(/\s+(?:prima di|before)\s+.*$/i, '').replace(/^(?:called|named|chiamata|denominata)\s+/i, '').trim();
        if (cleaned && !/^(?:prima di|before)\b/i.test(cleaned)) title = cleaned;
      }
    }

    let targetIdx = 1;
    if (p.includes('prima di assessment') || p.includes('before assessment')) {
      const assess = allPhases.find(ph => ph.id === 'phase-1');
      targetIdx = assess ? assess.position : 1;
    }

    const fields = {
      practiceId,
      title,
      description: 'Preliminary alignment and discovery activities with stakeholders.',
      targetIndex: targetIdx,
      activities: ['Kick-off meeting', 'Stakeholder interviews', 'Collection of access and prerequisites']
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
      reply: `Do you confirm the creation of the phase "${title}"?`,
      pendingAction: pending
    };
  }

  // 7. Questions about the tools of a phase
  if (p.includes('che tool abbiamo') || p.includes('quali tool') || p.includes('tool per') || p.includes('which tools') || p.includes('what tools') || p.includes('tools for')) {
    const matchedPhase = allPhases.find(ph => p.includes(ph.title.toLowerCase()) || p.includes(ph.id));
    if (matchedPhase) {
      const tools = allItems.filter(i => i.type === 'TOOL' && i.phaseIds.includes(matchedPhase.id));
      if (tools.length === 0) {
        return {
          reply: `There are currently **no specific Tools mapped** to the phase **${matchedPhase.title}** (this highlights an automation gap). You can click "+" above the phase to add one!`
        };
      }
      const list = tools.map((t, i) => `${i + 1}. **${t.title}** ${t.generalizationRequired ? '*(To be generalized)*' : ''}: ${t.summary || t.description}`).join('\n');
      return {
        reply: `For the phase **${matchedPhase.title}** we currently have ${tools.length} tool${tools.length === 1 ? '' : 's'}:\n\n${list}`
      };
    }
  }

  // 8. Tools to be generalized
  if (p.includes('generalizzare') || p.includes('da generalizzare') || p.includes('generaliz')) {
    const generalizeTools = allItems.filter(i => i.type === 'TOOL' && i.generalizationRequired);
    const list = generalizeTools.map((t, i) => `${i + 1}. **${t.title}** (Covers: ${t.phaseIds.map(pid => allPhases.find(p => p.id === pid)?.title).join(', ')}) - Owner: ${t.owner || 'N/A'}`).join('\n');
    return {
      reply: `The following **${generalizeTools.length} tool${generalizeTools.length === 1 ? '' : 's'}** ${generalizeTools.length === 1 ? 'is' : 'are'} marked as **"To be generalized"** so they can be reused in other projects:\n\n${list}`
    };
  }

  // 9. Multi-phase tools
  if (p.includes('più fasi') || p.includes('multifase') || p.includes('trasversal') || p.includes('multiple phases') || p.includes('multi-phase') || p.includes('multiphase') || p.includes('cross-phase') || p.includes('more than one phase')) {
    const multi = allItems.filter(i => i.type === 'TOOL' && i.phaseIds.length > 1);
    const list = multi.map(t => `- **${t.title}**: covers **${t.phaseIds.length} phases** (${t.phaseIds.map(pid => allPhases.find(p => p.id === pid)?.title).join(', ')})`).join('\n');
    return {
      reply: `The cross-phase tools that cover multiple phases are:\n\n${list}`
    };
  }

  // 10. Uncovered or open needs
  if (p.includes('esigenze') || p.includes('needs') || p.includes('gap')) {
    const needs = allItems.filter(i => i.type === 'NEED');
    const list = needs.slice(0, 5).map(n => `- **${n.title}** (${n.phaseIds.map(pid => allPhases.find(p => p.id === pid)?.title).join(', ')}): ${n.summary || n.description}`).join('\n');
    return {
      reply: `There are currently **${needs.length} open operational needs** mapped on the process. Here are some of them:\n\n${list}\n\nYou can click the green bubbles on the map to explore them further.`
    };
  }

  // Default reply
  return {
    reply: `I am the **ADM Assistant** of the **${practiceName(practiceId)}** practice. I know the end-to-end process (${allPhases.length} phases), the existing tools, the WiP items and the operational needs.

You can ask me:
- *"Which tools do we have for Assessment?"*
- *"Which tools cover multiple phases?"*
- *"Which tools need to be generalized?"*
- *"Are there uncovered needs?"*
- *"Add a need to Readiness: automated Terraform"*
- *"Add as WiP an MCP for Kubernetes"*
- *"Delete [item name]"* (with guided confirmation)
- *"Rename [item] to [new name]"* (with confirmation)`
  };
}

export async function handleAssistantChat(
  userMessage: string,
  ctx: ChatContext,
  confirmedAction?: PendingAction,
  cancelAction?: boolean
): Promise<{ reply: string; actionSummary?: string; pendingAction?: PendingAction }> {
  const user = ctx.user?.username ?? 'anonymous';
  // If user is directly confirming or cancelling an action
  if (confirmedAction || cancelAction) {
    return executeLocalIntents(userMessage, ctx, confirmedAction, cancelAction);
  }

  // Check if message is a confirmation or cancellation of a stored pending action
  const pending = ctx.user ? pendingActionsByUser.get(user) : undefined;
  const typedWord = normalizeWord(userMessage);
  if (pending && (CONFIRM_WORDS.has(typedWord) || CANCEL_WORDS.has(typedWord))) {
    return executeLocalIntents(userMessage, ctx, confirmedAction, cancelAction);
  }

  async function handleOpenAIChat(
  userMessage: string,
  settings: AISettings
): Promise<{ reply: string; actionSummary?: string; pendingAction?: PendingAction } | null> {
  const allPhases = db.getPhases(ctx.practiceId);
  const allItems = db.getItems({ practiceId: ctx.practiceId });

  let baseUrl = (settings.openaiBaseUrl || 'https://api.openai.com/v1').trim().replace(/\/+$/, '');
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = 'https://' + baseUrl;
  }
  const endpointError = checkEndpoint(baseUrl);
  if (endpointError) throw new Error(endpointError);

  const systemInstruction = `You are the expert assistant of ADM Project Blueprint for Accenture.
The application has a map for each practice; you are working on the practice "${practiceName(ctx.practiceId)}": its process is a sequence of central chevron blocks (phases) with bubbles above (Tools and WiP) and bubbles below (Needs). Everything you see and create concerns this practice only.
${permissionNote(ctx)}
You have access to system functions to search items, look up phases, create tools, WiP items, needs and phases, and edit or delete items.
To create, edit or delete anything you MUST call the corresponding function: never claim to have performed an operation without calling it.
Edits and deletions are not immediate: the system shows the user a confirmation card. In that case tell the user to confirm from the card, not that the operation is complete.
In the phaseIds parameters use the phase IDs listed below.
The dashboard has ${DASHBOARD_SLOTS} tiles numbered from 1. When the user asks to configure a tile (e.g. "tile N°3", "the 3 needs with the highest priority") call create_dashboard_tile IMMEDIATELY with the given slot, translating the request into a query (itemTypes, where) and a visualization type (chart: bar, number or list): do not propose alternatives in words and do not ask for confirmation, because the system shows a preview card that the user confirms. Priority 1 is the highest. If the slot is missing, ask for it. Only if the request cannot be expressed with the function parameters, explain the limitation.
Reply in a professional, concise way, in the same language the user writes in, using markdown formatting (bullet lists, **bold**, etc.).
There are currently ${allItems.length} items (${allItems.filter(i => i.type === 'TOOL').length} tools, ${allItems.filter(i => i.type === 'IDEA').length} WiP, ${allItems.filter(i => i.type === 'NEED').length} needs) and ${allPhases.length} phases.
Process phases:
${allPhases.map(p => `- ${p.id} (pos ${p.position}): ${p.title} - ${p.description}`).join('\n')}
Current items:
${allItems.map(i => `- [${i.type}] "${i.title}" (ID: ${i.id}, Phases: ${i.phaseIds.join(', ')}): ${i.summary || i.description?.substring(0, 100)}`).join('\n')}`;

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
          reply: 'I carried out the requested operations, but the model did not complete its reply.',
          actionSummary: actionSummaries.join(' · ') || undefined,
          pendingAction
        };
      }
      throw new Error(`Custom OpenAI API error (${res.status}): ${errorText.substring(0, 100)}`);
    }

    const data = await res.json();
    const message = data.choices?.[0]?.message;
    const toolCalls = message?.tool_calls;

    if (!toolCalls || toolCalls.length === 0) {
      return {
        reply: message?.content || 'No response from the custom model.',
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
        result = executeTool(call.function?.name, args, ctx);
      } catch (err: any) {
        result = { error: err.message || 'Error while running the function' };
      }
      if (result?.success && result.message) actionSummaries.push(result.message);
      if (result?.pendingAction) pendingAction = result.pendingAction;
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }

  // Only reached if the model ignores tool_choice 'none' on the last round
  return {
    reply: 'No response from the custom model.',
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
    p.startsWith('rinomina') ||
    p.startsWith('delete') ||
    p.startsWith('remove') ||
    p.startsWith('rename')
  ) {
    return executeLocalIntents(userMessage, ctx);
  }

  // 1. Check if Custom OpenAI is enabled and configured
  const aiSettings = settingsStore.getSettings();
  if (aiSettings.provider === 'openai' && aiSettings.openaiApiKey) {
    try {
      const openAiResult = await handleOpenAIChat(userMessage, aiSettings);
      if (openAiResult) return openAiResult;
    } catch (err: any) {
      // No fallback: the keyword engine below would write wrong data to the graph
      // (e.g. an idea titled with the whole sentence) when the provider is down
      console.warn('Custom OpenAI execution error:', err.message);
      return {
        reply: `⚠️ The configured AI provider did not respond correctly, so **no changes were made to the map**.\n\nDetails: \`${err.message}\`\n\nTry again shortly or check the configuration in **AI Settings**.`
      };
    }
  }

  // 2. If a Gemini API key is configured, invoke Gemini with tools
  const geminiKey = settingsStore.getGeminiApiKey();
  if (geminiKey && geminiKey.length > 10) {
    try {
      const { geminiBaseUrl, geminiModel } = settingsStore.getSettings();
      const endpointError = checkEndpoint(geminiBaseUrl);
      if (endpointError) throw new Error(endpointError);
      const ai = createGeminiClient(geminiKey, geminiBaseUrl);
      const allPhases = db.getPhases(ctx.practiceId);
      const allItems = db.getItems({ practiceId: ctx.practiceId });
      const systemInstruction = `You are the expert assistant of ADM Project Blueprint for Accenture.
The application has a map for each practice; you are working on the practice "${practiceName(ctx.practiceId)}": its process is a sequence of central chevron blocks (phases) with bubbles above (Tools and WiP) and bubbles below (Needs). Everything you see and create concerns this practice only.
${permissionNote(ctx)}
You have access to system functions to search items, look up phases, and create, edit and delete tools, WiP items and needs.
To configure a dashboard tile (numbered from 1 to ${DASHBOARD_SLOTS}) IMMEDIATELY use create_dashboard_tile with the slot given by the user, translating the request into a query and a visualization type (bar, number, list); confirmation is a card shown by the system.
When the user asks to delete or edit an item, USE delete_item or update_item. For deletion, ALWAYS ask the user for confirmation before permanently deleting.
Reply in a professional, concise way, in the same language the user writes in, using markdown formatting where useful.
There are currently ${allItems.length} items (${allItems.filter(i => i.type === 'TOOL').length} tools, ${allItems.filter(i => i.type === 'IDEA').length} WiP, ${allItems.filter(i => i.type === 'NEED').length} needs).`;

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
          // The model can never confirm on the user's behalf (same rule as the OpenAI branch)
          const args = { ...(call.args ?? {}) };
          delete args.confirmed;
          const result = executeTool(call.name, args, ctx);
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
              parts: [{ text: `Execution results:\n${JSON.stringify(toolResponses, null, 2)}\nExplain the result to the user or ask for confirmation if required.` }]
            }
          ],
          config: {
            systemInstruction
          }
        });

        return {
          reply: followUp.text || 'Operation processed.',
          actionSummary,
          pendingAction: pendingActionToReturn
        };
      }

      return {
        reply: response.text || 'I have processed your request.'
      };
    } catch (err) {
      console.warn('Gemini API call error, using deterministic engine:', err);
    }
  }

  // Deterministic fallback
  return executeLocalIntents(userMessage, ctx);
}
