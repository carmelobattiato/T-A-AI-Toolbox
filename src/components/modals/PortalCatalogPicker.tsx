import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Search, X } from 'lucide-react';
import { CatalogCard, ItemType } from '../../types/index.ts';
import { portalRequest } from '../../utils/portal.ts';

const PAGE_SIZE = 12;
const ALL = '';

function uniqueSorted(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))].sort((a, b) => a.localeCompare(b));
}

interface PortalCatalogPickerProps {
  isOpen: boolean;
  // create: the chosen solution starts a new item. link: the chosen solution is linked to the item being edited
  mode: 'create' | 'link';
  // Kind of the item: the form opens as a Tool or as a WiP
  kind: Exclude<ItemType, 'NEED'>;
  practiceId: string;
  // Portal solutions already on this map (by their portal id), shown with a badge
  importedIds: Set<string>;
  onClose: () => void;
  // Called with the chosen solution; a rejected promise shows its message in the picker
  onSelect: (card: CatalogCard) => Promise<void>;
}

// Portal solutions as tiles, with search and filters. The caller decides what picking a solution does.
export const PortalCatalogPicker: React.FC<PortalCatalogPickerProps> = ({
  isOpen,
  mode,
  kind,
  practiceId,
  importedIds,
  onClose,
  onSelect,
}) => {
  const [cards, setCards] = useState<CatalogCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [pickError, setPickError] = useState('');
  const [picking, setPicking] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [pillar, setPillar] = useState(ALL);
  const [lifecycle, setLifecycle] = useState(ALL);
  const [assetType, setAssetType] = useState(ALL);
  const [cluster, setCluster] = useState(ALL);
  const [page, setPage] = useState(1);

  // Loaded each time the picker opens
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    portalRequest<CatalogCard[]>(`/api/portal/catalog?practice=${encodeURIComponent(practiceId)}`)
      .then(list => {
        if (!cancelled) setCards(list);
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, practiceId, reloadKey]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const pillars = useMemo(() => {
    const byCode = new Map<string, string>();
    cards.forEach(c => c.pillar && byCode.set(c.pillar.code, c.pillar.name));
    return [...byCode.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [cards]);
  const lifecycles = useMemo(() => uniqueSorted(cards.map(c => c.lifecycle)), [cards]);
  const assetTypes = useMemo(() => uniqueSorted(cards.map(c => c.assetType)), [cards]);
  const clusters = useMemo(() => uniqueSorted(cards.flatMap(c => c.clusters)), [cards]);

  const term = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      cards
        .filter(c => !pillar || c.pillar?.code === pillar)
        .filter(c => !lifecycle || c.lifecycle === lifecycle)
        .filter(c => !assetType || c.assetType === assetType)
        .filter(c => !cluster || c.clusters.includes(cluster))
        .filter(c =>
          !term ||
          [c.name, c.shortDescription, c.pillar?.name ?? '', c.enablers.join(' '), c.clusters.join(' ')]
            .join(' ')
            .toLowerCase()
            .includes(term)
        )
        // Same default order as the portal: most viewed first
        .sort((a, b) => b.viewCount - a.viewCount),
    [cards, pillar, lifecycle, assetType, cluster, term]
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageCards = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const filtersActive = Boolean(term || pillar || lifecycle || assetType || cluster);
  const kindLabel = kind === 'TOOL' ? 'Tool' : 'WiP';

  const clearFilters = () => {
    setQuery('');
    setPillar(ALL);
    setLifecycle(ALL);
    setAssetType(ALL);
    setCluster(ALL);
    setPage(1);
  };

  const pick = async (card: CatalogCard) => {
    setPicking(card.id);
    setPickError('');
    try {
      await onSelect(card);
    } catch (err: unknown) {
      setPickError(err instanceof Error ? err.message : 'The solution could not be used');
    } finally {
      setPicking(null);
    }
  };

  if (!isOpen) return null;

  const selectClass =
    'rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 focus:border-purple-400 focus:outline-none';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-label="Portal Catalog"
        className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between bg-purple-50/50 gap-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              {mode === 'link' ? 'Link to the portal' : 'Portal Catalog'}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {mode === 'link'
                ? `Pick the portal solution this ${kindLabel} comes from. Its portal fields are updated from the solution; notes, phases and the rest are kept.`
                : `Pick the solution to add as a ${kindLabel}. The form opens pre-filled: you can change it before saving.`}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {!loading && !loadError && (
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                {filtered.length} of {cards.length} solutions
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search and filters */}
        <div className="px-6 py-3 border-b border-slate-100 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, description, enabler or cluster"
              className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-xs focus:border-purple-400 focus:outline-none"
            />
          </div>
          <select
            aria-label="Pillar"
            value={pillar}
            onChange={e => {
              setPillar(e.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value={ALL}>All pillars</option>
            {pillars.map(([code, name]) => (
              <option key={code} value={code}>
                {code} · {name}
              </option>
            ))}
          </select>
          <select
            aria-label="Lifecycle"
            value={lifecycle}
            onChange={e => {
              setLifecycle(e.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value={ALL}>All lifecycles</option>
            {lifecycles.map(v => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <select
            aria-label="Asset type"
            value={assetType}
            onChange={e => {
              setAssetType(e.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value={ALL}>All asset types</option>
            {assetTypes.map(v => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <select
            aria-label="Cluster"
            value={cluster}
            onChange={e => {
              setCluster(e.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value={ALL}>All clusters</option>
            {clusters.map(v => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-purple-700 hover:underline cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="h-full flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading the portal catalog...
            </div>
          )}

          {!loading && loadError && (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-slate-700 max-w-md">{loadError}</p>
              <button
                type="button"
                onClick={() => setReloadKey(k => k + 1)}
                className="px-4 py-2 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 cursor-pointer"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !loadError && filtered.length === 0 && (
            <p className="text-xs text-slate-500 text-center mt-10">No solutions match the filters.</p>
          )}

          {!loading && !loadError && pageCards.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {pageCards.map(card => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => pick(card)}
                  disabled={picking !== null}
                  className="text-left flex flex-col rounded-xl border border-slate-200 bg-white p-4 hover:border-purple-400 hover:shadow-md transition disabled:opacity-60 cursor-pointer"
                >
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {card.pillar && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-700">
                        {card.pillar.code} · {card.pillar.name}
                      </span>
                    )}
                    {card.lifecycle && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                        {card.lifecycle}
                      </span>
                    )}
                    {importedIds.has(card.id) && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700">
                        Already on this map
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-sm text-slate-900">{card.name}</div>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed line-clamp-3 flex-1">{card.shortDescription}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                    {card.assetType && <span>{card.assetType}</span>}
                    {card.clusters.map(name => (
                      <span key={name} className="px-1.5 py-0.5 rounded bg-slate-100">
                        {name}
                      </span>
                    ))}
                    {card.efficiencyPercentage != null && (
                      <span className="font-bold text-emerald-700">+{card.efficiencyPercentage}%</span>
                    )}
                    {picking === card.id && <Loader2 className="w-3.5 h-3.5 animate-spin ml-auto" />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer: errors and pages */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between gap-4">
          <span className="text-xs text-red-600">{pickError}</span>
          {pageCount > 1 && (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <button
                type="button"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage <= 1}
                aria-label="Previous page"
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-default"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>
                Page {currentPage} of {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= pageCount}
                aria-label="Next page"
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-default"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
