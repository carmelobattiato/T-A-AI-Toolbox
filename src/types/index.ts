export type ItemType = 'TOOL' | 'IDEA' | 'NEED';

export const DEFAULT_PRACTICE_ID = 'ta';

export interface Practice {
  id: string;
  name: string;
  // Shown to users when they choose a default practice; required at creation, may be empty on older practices
  description: string;
  // Icon shown on the practice tile; null = default icon
  icon?: string | null;
  createdAt: string;
  createdBy?: string;
}

export type UserRole = 'admin' | 'editor' | 'viewer';

// Public view of a user (never includes password data)
export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  practices: string[];
  active: boolean;
  mustChangePassword: boolean;
  // Practice opened at login; null until the user chooses one
  defaultPracticeId?: string | null;
  // True until the user has chosen a default practice (welcome + choice shown in the splash)
  onboarding?: boolean;
}

export interface Phase {
  id: string;
  practiceId: string;
  // Icon key chosen by the user (see iconKeys.ts); empty = the default icon for the position
  icon?: string | null;
  title: string;
  description: string;
  activities: string[];
  position: number;
  isCore: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  itemId: string;
  fileName: string;
  mimeType: string;
  data: string; // Base64 data URL
  createdAt: string;
}

export interface Item {
  id: string;
  practiceId: string;
  type: ItemType;
  title: string;
  summary?: string;
  description?: string;
  notes?: string;

  // Tool specific
  githubUrl?: string;
  catalogUrl?: string;
  demoUrl?: string;
  owner?: string;
  generalizationRequired?: boolean;

  // Need specific
  problem?: string;
  currentProcess?: string;
  desiredTool?: string;
  desiredOutcome?: string;

  // Idea specific
  requirements?: string;
  expectedBenefit?: string;

  tags?: string[];
  customers?: string[];

  // Icon key chosen by the user (see iconKeys.ts); empty = the default icon for the type
  icon?: string | null;
  // Need and Idea only: 1 = highest priority
  priority?: number | null;
  // WiP only: how far the work has gone, 0-100 (orange % on the circle)
  completion?: number | null;
  // Tool only: efficiency of the activity it covers, 0-100 (green % on the circle)
  efficiency?: number | null;
  // Portal solution this Tool or WiP is linked to; empty = not linked. The portal owns the fields listed in server/store.ts (applyPortalSync)
  portalProjectId?: string | null;
  // Portal details (pillar, lifecycle, efficiency, links...) as read by the last sync; read-only in the drawer
  portalInfo?: string | null;
  portalSyncedAt?: string | null;

  // Positioning
  positionX?: number;
  positionY?: number;

  createdBy?: string;
  createdAt: string;
  updatedAt: string;

  // Relazioni many-to-many
  phaseIds: string[];
  attachments?: Attachment[];
}

export interface ItemPhase {
  id: string;
  itemId: string;
  phaseId: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  practiceId?: string;
  user: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: 'PHASE' | 'ITEM' | 'ATTACHMENT' | 'PRACTICE' | 'USER';
  entityId: string;
  payload?: any;
  createdAt: string;
}

export type DashboardGroupBy = 'customer' | 'tag' | 'phase' | 'type' | 'owner' | 'priority' | 'month';

export type DashboardSortBy = 'priority' | 'createdAt' | 'updatedAt' | 'title';

// Filters of a tile query, combined with AND
export interface DashboardWhere {
  customer?: string;
  tag?: string;
  phase?: string;
  owner?: string;
  priorityMax?: number;
  createdWithinDays?: number;
  generalizationRequired?: boolean;
}

// A tile is a query (itemTypes, where, plus groupBy or sortBy/order/limit) and how to show it (chart)
export interface DashboardTile {
  practiceId?: string;
  slot: number;
  title: string;
  chart: 'bar' | 'number' | 'list';
  itemTypes: ItemType[];
  where?: DashboardWhere;
  groupBy?: DashboardGroupBy;
  sortBy?: DashboardSortBy;
  order?: 'asc' | 'desc';
  limit?: number;
}

export interface PendingAction {
  id: string;
  type: 'DELETE_ITEM' | 'UPDATE_ITEM' | 'DELETE_PHASE' | 'CREATE_ITEM' | 'CREATE_PHASE' | 'CREATE_TILE';
  targetId: string;
  targetTitle: string;
  payload?: any;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  actionSummary?: string;
  pendingAction?: PendingAction;
}

export interface FilterState {
  searchQuery: string;
  showTools: boolean;
  showIdeas: boolean;
  showNeeds: boolean;
  onlyGeneralize: boolean;
  maxAgeDays: number | null;
  tagQuery: string;
}

export interface AISettings {
  provider: 'gemini' | 'openai';
  geminiBaseUrl: string;
  geminiModel: string;
  geminiApiKey: string;
  openaiBaseUrl: string;
  openaiModel: string;
  openaiApiKey: string;
  isConfigured?: boolean;
}

// Portal catalog (server/portalCatalog.ts): a solution as shown in the picker, and the values a new Tool or WiP starts from
export interface CatalogCard {
  id: string;
  name: string;
  shortDescription: string;
  pillar: { code: string; name: string } | null;
  lifecycle: string | null;
  assetType: string | null;
  clusters: string[];
  enablers: string[];
  efficiencyPercentage: number | null;
  viewCount: number;
}

export type CatalogDraft = Partial<Item> & { portalProjectId: string };
