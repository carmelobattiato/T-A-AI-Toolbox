export type ItemType = 'TOOL' | 'IDEA' | 'NEED';

export interface Phase {
  id: string;
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

  // Need and Idea only: 1 = highest priority
  priority?: number | null;

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
  user: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: 'PHASE' | 'ITEM' | 'ATTACHMENT';
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
