import React from 'react';
import {
  FileText,
  Search,
  BarChart3,
  Database,
  Cog,
  ClipboardCheck,
  ArrowLeftRight,
  Users,
  Layers,
  Lightbulb,
  Sparkles,
  Cpu,
  Wrench,
  Boxes,
  FileCode,
  Share2,
  ListTodo,
  CheckCircle2,
  MessageSquare,
  Compass,
  Repeat,
  ShieldCheck,
  FolderGit2,
  type LucideIcon,
} from 'lucide-react';
import { IconKey, isIconKey } from './iconKeys.ts';

// Every icon the app uses, offered in the forms. The key is what gets stored.
export const ICON_OPTIONS: { key: IconKey; label: string; Icon: LucideIcon }[] = [
  { key: 'document', label: 'Document', Icon: FileText },
  { key: 'search', label: 'Search / assessment', Icon: Search },
  { key: 'chart', label: 'Chart / analysis', Icon: BarChart3 },
  { key: 'database', label: 'Data / readiness', Icon: Database },
  { key: 'cog', label: 'Automation / DevOps', Icon: Cog },
  { key: 'check', label: 'Check / validation', Icon: ClipboardCheck },
  { key: 'transfer', label: 'Migration / cutover', Icon: ArrowLeftRight },
  { key: 'users', label: 'People / handover', Icon: Users },
  { key: 'compass', label: 'Compass / guidance', Icon: Compass },
  { key: 'layers', label: 'Layers / stack', Icon: Layers },
  { key: 'lightbulb', label: 'Idea', Icon: Lightbulb },
  { key: 'sparkles', label: 'AI / sparkle', Icon: Sparkles },
  { key: 'cpu', label: 'Agent / model', Icon: Cpu },
  { key: 'wrench', label: 'Tool', Icon: Wrench },
  { key: 'boxes', label: 'Inventory', Icon: Boxes },
  { key: 'filecode', label: 'Code / IaC', Icon: FileCode },
  { key: 'share', label: 'Graph / dependencies', Icon: Share2 },
  { key: 'list', label: 'Task list', Icon: ListTodo },
  { key: 'checkcircle', label: 'Test / done', Icon: CheckCircle2 },
  { key: 'message', label: 'Chat / question', Icon: MessageSquare },
  { key: 'foldergit', label: 'Repository / diagrams', Icon: FolderGit2 },
  { key: 'shield', label: 'Security / monitoring', Icon: ShieldCheck },
  { key: 'repeat', label: 'Loop / recurring', Icon: Repeat },
];

const ICON_BY_KEY = new Map(ICON_OPTIONS.map(o => [o.key, o.Icon]));

// The icon chosen by the user, or undefined when the field is empty or not a known key
function chosenIcon(key: unknown): LucideIcon | undefined {
  return isIconKey(key) ? ICON_BY_KEY.get(key) : undefined;
}

export function getPhaseIcon(position: number, customTitle?: string, iconKey?: unknown): React.ReactNode {
  const Chosen = chosenIcon(iconKey);
  if (Chosen) return <Chosen className="w-6 h-6 text-slate-700" />;
  const title = (customTitle || '').toLowerCase();
  if (title.includes('pre-sales') || title.includes('estimation') || position === 0) {
    return <FileText className="w-6 h-6 text-slate-700" />;
  }
  if (title.includes('assessment') || position === 1) {
    return <Search className="w-6 h-6 text-blue-600" />;
  }
  if (title.includes('gap') || title.includes('target') || position === 2) {
    return <BarChart3 className="w-6 h-6 text-indigo-600" />;
  }
  if (title.includes('readiness') || title.includes('provisioning') || position === 3) {
    return <Database className="w-6 h-6 text-purple-600" />;
  }
  if (title.includes('devops') || title.includes('adaptation') || position === 4) {
    return <Cog className="w-6 h-6 text-fuchsia-600" />;
  }
  if (title.includes('test') || title.includes('validation') || position === 5) {
    return <ClipboardCheck className="w-6 h-6 text-emerald-600" />;
  }
  if (title.includes('migration') || title.includes('cutover') || position === 6) {
    return <ArrowLeftRight className="w-6 h-6 text-teal-600" />;
  }
  if (title.includes('operate') || title.includes('handover') || position === 7) {
    return <Users className="w-6 h-6 text-green-600" />;
  }
  return <Compass className="w-6 h-6 text-indigo-500" />;
}

export function getItemIcon(type: string, title: string = '', iconKey?: unknown): React.ReactNode {
  const t = title.toLowerCase();
  const Chosen = chosenIcon(iconKey);
  if (Chosen) {
    const tone = type === 'TOOL' ? 'text-blue-600' : type === 'IDEA' ? 'text-purple-600' : 'text-emerald-600';
    return <Chosen className={`w-5 h-5 ${tone}`} />;
  }
  if (type === 'TOOL') {
    if (t.includes('document')) return <FileText className="w-5 h-5 text-blue-600" />;
    if (t.includes('draw') || t.includes('diagram')) return <Share2 className="w-5 h-5 text-orange-500" />;
    if (t.includes('estimator') || t.includes('cost')) return <BarChart3 className="w-5 h-5 text-blue-700" />;
    if (t.includes('agent') || t.includes('template')) return <Cpu className="w-5 h-5 text-blue-600" />;
    if (t.includes('inventory')) return <Boxes className="w-5 h-5 text-blue-500" />;
    return <Wrench className="w-5 h-5 text-blue-600" />;
  }
  if (type === 'IDEA') {
    if (t.includes('terraform') || t.includes('iac')) return <FileCode className="w-5 h-5 text-purple-600" />;
    if (t.includes('mcp') || t.includes('kubernetes')) return <Cpu className="w-5 h-5 text-purple-600" />;
    return <Sparkles className="w-5 h-5 text-purple-500" />;
  }
  // NEED
  if (t.includes('inventario')) return <ListTodo className="w-5 h-5 text-emerald-600" />;
  if (t.includes('dipendenze')) return <Share2 className="w-5 h-5 text-emerald-600" />;
  if (t.includes('diagrammi')) return <FolderGit2 className="w-5 h-5 text-emerald-600" />;
  if (t.includes('terraform')) return <FileCode className="w-5 h-5 text-emerald-600" />;
  if (t.includes('test')) return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
  if (t.includes('runbook')) return <FileText className="w-5 h-5 text-emerald-600" />;
  if (t.includes('monitoring') || t.includes('anomalie')) return <ShieldCheck className="w-5 h-5 text-emerald-600" />;
  return <MessageSquare className="w-5 h-5 text-emerald-600" />;
}

// Progressive colors for phases 0..7
export const PHASE_COLORS = [
  { bg: '#F1F5F9', border: '#CBD5E1', accent: '#64748B', text: '#334155' }, // 0 Pre-Sales
  { bg: '#EFF6FF', border: '#93C5FD', accent: '#2563EB', text: '#1E40AF' }, // 1 Assessment
  { bg: '#EEF2FF', border: '#A5B4FC', accent: '#4F46E5', text: '#3730A3' }, // 2 Gap Analysis
  { bg: '#F5F3FF', border: '#C4B5FD', accent: '#7C3AED', text: '#5B21B6' }, // 3 Readiness
  { bg: '#FAF5FF', border: '#E9D5FF', accent: '#9333EA', text: '#6B21A8' }, // 4 DevOps
  { bg: '#ECFDF5', border: '#6EE7B7', accent: '#059669', text: '#065F46' }, // 5 Test
  { bg: '#F0FDFA', border: '#5EEAD4', accent: '#0D9488', text: '#115E59' }, // 6 Migration
  { bg: '#F0FDF4', border: '#86EFAC', accent: '#16A34A', text: '#166534' }, // 7 Operate
];
