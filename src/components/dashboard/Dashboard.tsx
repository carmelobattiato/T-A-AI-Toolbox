import React, { useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { DashboardTile, Item, Phase } from '../../types/index.ts';
import {
  Bucket,
  DASHBOARD_COLUMNS,
  DASHBOARD_ROWS,
  DASHBOARD_SLOTS,
  TYPE_LABELS_SINGULAR,
  computeTile,
  describeTile,
} from '../../utils/dashboard.ts';

interface DashboardProps {
  items: Item[];
  phases: Phase[];
  tiles: DashboardTile[];
  onAddTile: (slot: number) => void;
  onDeleteTile: (slot: number) => void;
  onSelectItem: (item: Item) => void;
}

const SlotBadge: React.FC<{ slot: number }> = ({ slot }) => (
  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-md px-1.5 py-0.5 shrink-0">
    N°{slot}
  </span>
);

const BarChart: React.FC<{ buckets: Bucket[] }> = ({ buckets }) => {
  if (buckets.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center text-xs text-slate-400 px-4">
        Nessun dato disponibile per questo grafico.
      </div>
    );
  }

  const max = Math.max(...buckets.map(b => b.count));
  const step = Math.ceil(max / 4);
  const top = step * Math.ceil(max / step);
  const ticks: number[] = [];
  for (let v = top; v >= 0; v -= step) ticks.push(v);
  const columns = { gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` };

  return (
    <div className="flex-1 min-h-0 flex gap-2">
      <div className="flex flex-col justify-between text-[10px] text-slate-400 text-right pb-6 -mt-1.5">
        {ticks.map(v => (
          <span key={v}>{v}</span>
        ))}
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex-1 min-h-0 relative border-l border-b border-slate-200">
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {ticks.map(v => (
              <div key={v} className="border-t border-slate-100" />
            ))}
          </div>
          <div className="absolute inset-0 grid gap-2 px-2 items-end" style={columns}>
            {buckets.map(({ label, count }) => (
              <div key={label} className="h-full flex flex-col justify-end items-center min-w-0" title={`${label}: ${count}`}>
                <span className="text-[10px] font-semibold text-slate-600 mb-0.5">{count}</span>
                <div
                  className="w-full max-w-10 rounded-t-md bg-blue-500 hover:bg-blue-600 transition-colors"
                  style={{ height: `${(count / top) * 100}%` }}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-2 px-2 pt-1.5 h-6" style={columns}>
          {buckets.map(({ label }) => (
            <span key={label} className="text-[10px] text-slate-600 text-center truncate" title={label}>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const ItemList: React.FC<{ rows: Item[]; total: number; onSelectItem: (item: Item) => void }> = ({ rows, total, onSelectItem }) => {
  if (rows.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center text-xs text-slate-400 px-4">
        Nessun elemento corrisponde a questa query.
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <ol className="flex-1 min-h-0 overflow-auto space-y-1.5 pr-1">
        {rows.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelectItem(item)}
              title="Apri nella mappa"
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50/40 text-left transition-colors cursor-pointer"
            >
              <span className="text-[11px] font-bold text-slate-400 w-4 shrink-0">{index + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-slate-900 truncate">{item.title}</span>
                <span className="block text-[10px] text-slate-500 truncate">
                  {TYPE_LABELS_SINGULAR[item.type]}
                  {item.customers && item.customers.length > 0 ? ` · ${item.customers.join(', ')}` : ''}
                </span>
              </span>
              {item.priority != null && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                  P{item.priority}
                </span>
              )}
            </button>
          </li>
        ))}
      </ol>
      {total > rows.length && (
        <p className="text-[10px] text-slate-400 mt-1.5">Mostrati {rows.length} di {total}</p>
      )}
    </div>
  );
};

interface TileViewProps {
  tile: DashboardTile;
  items: Item[];
  phases: Phase[];
  onDelete: () => void;
  onSelectItem: (item: Item) => void;
}

const TileView: React.FC<TileViewProps> = ({ tile, items, phases, onDelete, onSelectItem }) => {
  const { total, buckets, rows } = useMemo(() => computeTile(tile, items, phases), [tile, items, phases]);

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col min-h-0 min-w-0">
      <div className="flex items-center gap-2 mb-0.5">
        <SlotBadge slot={tile.slot} />
        <h2 className="text-sm font-bold text-slate-900 truncate flex-1" title={tile.title}>{tile.title}</h2>
        <button
          type="button"
          onClick={onDelete}
          title="Rimuovi tile"
          className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-[11px] text-slate-500 mb-3 line-clamp-2">{describeTile(tile)}</p>
      {tile.chart === 'number' && (
        <div className="flex-1 flex items-center justify-center text-5xl font-extrabold text-slate-900">{total}</div>
      )}
      {tile.chart === 'bar' && <BarChart buckets={buckets} />}
      {tile.chart === 'list' && <ItemList rows={rows} total={total} onSelectItem={onSelectItem} />}
    </section>
  );
};

const EmptyTile: React.FC<{ slot: number; onAdd: () => void }> = ({ slot, onAdd }) => (
  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-4 flex flex-col min-h-0">
    <div className="flex items-center gap-2">
      <SlotBadge slot={slot} />
      <span className="text-[11px] text-slate-400">Tile disponibile</span>
    </div>
    <div className="flex-1 flex items-center justify-center">
      <button
        type="button"
        onClick={onAdd}
        title={`Configura il tile N°${slot} con l'assistente`}
        className="w-10 h-10 rounded-full border border-slate-300 bg-white text-slate-500 hover:text-purple-700 hover:border-purple-400 hover:bg-purple-50 shadow-2xs flex items-center justify-center transition-colors cursor-pointer"
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ items, phases, tiles, onAddTile, onDeleteTile, onSelectItem }) => {
  const slots = Array.from({ length: DASHBOARD_SLOTS }, (_, i) => i + 1);

  return (
    <div className="flex-1 h-full overflow-auto p-6 bg-[#FAFBFD]">
      <div
        className="grid gap-4 h-full min-h-[520px] min-w-[900px]"
        style={{
          gridTemplateColumns: `repeat(${DASHBOARD_COLUMNS}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${DASHBOARD_ROWS}, minmax(0, 1fr))`,
        }}
      >
        {slots.map(slot => {
          const tile = tiles.find(t => t.slot === slot);
          if (tile) {
            return (
              <TileView
                key={slot}
                tile={tile}
                items={items}
                phases={phases}
                onSelectItem={onSelectItem}
                onDelete={() => {
                  if (window.confirm(`Rimuovere il tile N°${slot} "${tile.title}"?`)) onDeleteTile(slot);
                }}
              />
            );
          }
          return <EmptyTile key={slot} slot={slot} onAdd={() => onAddTile(slot)} />;
        })}
      </div>
    </div>
  );
};
