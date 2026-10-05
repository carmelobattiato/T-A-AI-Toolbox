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
  FolderGit2
} from 'lucide-react';

export function getPhaseIcon(position: number, customTitle?: string): React.ReactNode {
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

export function getItemIcon(type: string, title: string = ''): React.ReactNode {
  const t = title.toLowerCase();
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
