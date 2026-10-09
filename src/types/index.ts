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

export interface PendingAction {
  id: string;
  type: 'DELETE_ITEM' | 'UPDATE_ITEM' | 'DELETE_PHASE' | 'CREATE_ITEM' | 'CREATE_PHASE';
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
