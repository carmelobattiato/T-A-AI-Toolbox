import React, { useMemo, useState } from 'react';
import { Info, Layers, Target, Wrench } from 'lucide-react';
import { Item, ItemType, Phase } from '../../types/index.ts';
import { getOwnerInitials } from '../../utils/owner.ts';

interface KanbanBoardProps {
  items: Item[];
  phases: Phase[];
  // Opens the full item card on the side, without leaving the board
  onOpenDetails: (item: Item) => void;
  // Read-only for users who cannot edit the practice: no dragging between columns
  readOnly?: boolean;
  // Dropping a card on another column changes its kind (same call as the detail drawer)
  onChangeType: (item: Item, type: ItemType) => void;
}

type SortKey = 'efficiency' | 'completion' | 'priority' | 'title';

// Each column: its sort options, the first one is the default
const COLUMNS: {
  type: ItemType;
  label: string;
  Icon: React.FC<{ className?: string }>;
  accent: string;
  head: string;
  sorts: { key: SortKey; label: string }[];
}[] = [
  {
    type: 'TOOL',
    label: 'Tools',
    Icon: Wrench,
    accent: 'border-l-blue-500',
    head: 'bg-blue-50 text-blue-800',
    sorts: [
      { key: 'efficiency', label: 'Efficiency (high → low)' },
      { key: 'title', label: 'Name (A → Z)' },
    ],
  },
  {
    type: 'IDEA',
    label: 'WiP – Work in Progress',
    Icon: Layers,
    accent: 'border-l-purple-500',
    head: 'bg-purple-50 text-purple-800',
    sorts: [
      { key: 'completion', label: 'Completion (high → low)' },
      { key: 'title', label: 'Name (A → Z)' },
    ],
  },
  {
    type: 'NEED',
    label: 'Needs',
    Icon: Target,
    accent: 'border-l-emerald-500',
    head: 'bg-emerald-50 text-emerald-800',
    sorts: [
      { key: 'priority', label: 'Priority (P-1 first)' },
      { key: 'title', label: 'Name (A → Z)' },
    ],
  },
];

// Numeric value for sorting; a missing value sorts last whatever the direction
function compareItems(a: Item, b: Item, key: SortKey): number {
  if (key === 'title') return a.title.localeCompare(b.title);
  if (key === 'priority') {
    const pa = a.priority ?? Number.POSITIVE_INFINITY;
    const pb = b.priority ?? Number.POSITIVE_INFINITY;
    if (pa !== pb) return pa - pb;
    return a.title.localeCompare(b.title);
  }
  // efficiency / completion: high first
  const va = key === 'efficiency' ? a.efficiency : a.completion;
  const vb = key === 'efficiency' ? b.efficiency : b.completion;
  if (va == null && vb == null) return a.title.localeCompare(b.title);
  if (va == null) return 1;
  if (vb == null) return -1;
  if (va !== vb) return vb - va;
  return a.title.localeCompare(b.title);
}

const Card: React.FC<{
  item: Item;
  phaseTitles: string[];
  accent: string;
  onDetails: () => void;
  draggable: boolean;
  dragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}> = ({ item, phaseTitles, accent, onDetails, draggable, dragging, onDragStart, onDragEnd }) => {
  const shown = phaseTitles.slice(0, 2);
  const hidden = phaseTitles.length - shown.length;
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title={draggable ? 'Drag to another column to change its kind' : undefined}
      className={`relative w-full rounded-xl border border-slate-200 border-l-4 bg-white p-3 text-left shadow-sm transition hover:shadow-md ${accent} ${
        draggable ? 'cursor-grab active:cursor-grabbing' : ''
      } ${dragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start gap-2">
        <div className="line-clamp-2 min-w-0 flex-1 text-sm font-semibold text-slate-900">{item.title}</div>
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onDetails();
          }}
          onMouseDown={e => e.stopPropagation()}
          title="Open the full card"
          className="flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:border-purple-300 hover:text-purple-700"
        >
          <Info className="h-3 w-3" /> Details
        </button>
      </div>

      {phaseTitles.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {shown.map(title => (
            <span key={title} className="max-w-full truncate rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
              {title}
            </span>
          ))}
          {hidden > 0 && <span className="px-1 text-[10px] text-slate-400">+{hidden}</span>}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        {item.type === 'IDEA' && (
          <div className="flex min-w-0 flex-1 items-center gap-2" title="Completion of the work">
            <span className="shrink-0 text-[10px] font-semibold text-slate-500">Completion</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-purple-600" style={{ width: `${item.completion ?? 0}%` }} />
            </div>
            <span className="text-[11px] font-bold text-purple-700">{item.completion ?? 0}%</span>
          </div>
        )}
        {item.type === 'TOOL' && item.efficiency != null && (
          <span className="rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700" title="Efficiency of the activity this tool covers">
            Efficiency {item.efficiency}%
          </span>
        )}
        {item.type === 'NEED' && item.priority != null && (
          <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-white" title="Priority (1 is the highest)">
            Priority P-{item.priority}
          </span>
        )}
        {item.owner?.trim() && (
          <span
            title={`Owner: ${item.owner}`}
            className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-black bg-white text-[10px] font-bold text-slate-900"
          >
            {getOwnerInitials(item.owner)}
          </span>
        )}
      </div>
    </div>
  );
};

// Read-only board of the current practice: Tools, WiPs and Needs as cards, each column filterable by process and sortable
export const KanbanBoard: React.FC<KanbanBoardProps> = ({ items, phases, onOpenDetails, readOnly = false, onChangeType }) => {
  const phaseTitle = useMemo(() => new Map(phases.map(p => [p.id, p.title])), [phases]);
  // Card being dragged, and the column it is over
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<ItemType | null>(null);
  const draggedItem = draggedId ? items.find(i => i.id === draggedId) : undefined;

  const handleDrop = (type: ItemType) => {
    const item = draggedItem;
    setDraggedId(null);
    setDropTarget(null);
    if (!item || item.type === type) return;
    // Tools have no priority: same confirmation as the detail drawer
    if (type === 'TOOL' && item.priority != null) {
      if (!window.confirm(`Tools have no priority. P-${item.priority} will be removed. Change to Tool?`)) return;
    }
    onChangeType(item, type);
  };
  const orderedPhases = useMemo(() => [...phases].sort((a, b) => a.position - b.position), [phases]);
  // Per column: process filter ('' = all) and sort key (the first option by default)
  const [filters, setFilters] = useState<Record<ItemType, { phaseId: string; sort: SortKey }>>(() => ({
    TOOL: { phaseId: '', sort: 'efficiency' },
    IDEA: { phaseId: '', sort: 'completion' },
    NEED: { phaseId: '', sort: 'priority' },
  }));

  const update = (type: ItemType, patch: Partial<{ phaseId: string; sort: SortKey }>) =>
    setFilters(prev => ({ ...prev, [type]: { ...prev[type], ...patch } }));

  return (
    <div className="flex h-full w-full gap-4 overflow-x-auto p-4">
      {COLUMNS.map(({ type, label, Icon, accent, head, sorts }) => {
        const { phaseId, sort } = filters[type];
        const column = items
          .filter(i => i.type === type && (!phaseId || i.phaseIds.includes(phaseId)))
          .sort((a, b) => compareItems(a, b, sort));
        const total = items.filter(i => i.type === type).length;
        return (
          <section
            key={type}
            onDragOver={e => {
              // Only a card of another kind can be dropped here
              if (!draggedItem || draggedItem.type === type || readOnly) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (dropTarget !== type) setDropTarget(type);
            }}
            onDragLeave={e => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropTarget(null);
            }}
            onDrop={e => {
              if (!draggedItem || draggedItem.type === type || readOnly) return;
              e.preventDefault();
              handleDrop(type);
            }}
            className={`flex min-h-0 min-w-[18rem] flex-1 flex-col rounded-2xl bg-slate-50 transition ${
              dropTarget === type ? 'ring-2 ring-purple-400 ring-offset-2' : ''
            }`}
          >
            <header className={`flex items-center gap-2 rounded-t-2xl px-4 py-3 text-sm font-bold ${head}`}>
              <Icon className="h-4 w-4" />
              <span className="truncate">{label}</span>
              <span className="ml-auto text-xs font-semibold opacity-70">
                ({phaseId ? `${column.length} / ${total}` : total})
              </span>
            </header>

            <div className="grid grid-cols-2 gap-2 border-b border-slate-200 bg-white/60 p-2">
              <label className="flex min-w-0 flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Process
                <select
                  value={phaseId}
                  onChange={e => update(type, { phaseId: e.target.value })}
                  className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs font-medium normal-case tracking-normal text-slate-700 focus:border-purple-500 focus:outline-none"
                >
                  <option value="">All processes</option>
                  {orderedPhases.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-0 flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Sort by
                <select
                  value={sort}
                  onChange={e => update(type, { sort: e.target.value as SortKey })}
                  className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs font-medium normal-case tracking-normal text-slate-700 focus:border-purple-500 focus:outline-none"
                >
                  {sorts.map(s => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-2">
              {column.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-slate-400">
                  {total === 0 ? 'Nothing here yet.' : 'No item matches this process.'}
                </p>
              ) : (
                column.map(item => (
                  <Card
                    key={item.id}
                    item={item}
                    accent={accent}
                    phaseTitles={item.phaseIds.map(id => phaseTitle.get(id)).filter((t): t is string => Boolean(t))}
                    onDetails={() => onOpenDetails(item)}
                    draggable={!readOnly}
                    dragging={draggedId === item.id}
                    onDragStart={e => {
                      e.dataTransfer.setData('text/plain', item.id);
                      e.dataTransfer.effectAllowed = 'move';
                      setDraggedId(item.id);
                    }}
                    onDragEnd={() => {
                      setDraggedId(null);
                      setDropTarget(null);
                    }}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
};
