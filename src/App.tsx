import React, { useState, useEffect, useCallback } from 'react';
import { Phase, Item, FilterState } from './types/index.ts';
import { Header } from './components/header/Header.tsx';
import { ToolboxGraph } from './components/graph/ToolboxGraph.tsx';
import { PhaseDrawer } from './components/drawers/PhaseDrawer.tsx';
import { ItemDrawer } from './components/drawers/ItemDrawer.tsx';
import { ToolForm } from './components/forms/ToolForm.tsx';
import { IdeaForm } from './components/forms/IdeaForm.tsx';
import { NeedForm } from './components/forms/NeedForm.tsx';
import { PhaseForm } from './components/forms/PhaseForm.tsx';
import { AuditLogModal } from './components/modals/AuditLogModal.tsx';
import { TAIAssistant } from './components/chat/TAIAssistant.tsx';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    showTools: true,
    showIdeas: true,
    showNeeds: true,
    onlyGeneralize: false,
  });

  // Focus / Selection Mode (Spec 16-19)
  const [focusedPhaseId, setFocusedPhaseId] = useState<string | null>(null);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);

  // Modals & Forms State
  const [toolModalOpen, setToolModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<Item | null>(null);
  const [defaultToolPhaseId, setDefaultToolPhaseId] = useState<string | undefined>();

  const [ideaModalOpen, setIdeaModalOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<Item | null>(null);
  const [defaultIdeaPhaseId, setDefaultIdeaPhaseId] = useState<string | undefined>();

  const [needModalOpen, setNeedModalOpen] = useState(false);
  const [editingNeed, setEditingNeed] = useState<Item | null>(null);
  const [defaultNeedPhaseId, setDefaultNeedPhaseId] = useState<string | undefined>();

  const [phaseModalOpen, setPhaseModalOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
  const [targetPhaseIndex, setTargetPhaseIndex] = useState<number | undefined>();

  const [auditLogModalOpen, setAuditLogModalOpen] = useState(false);

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch all data from server
  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    try {
      const [phasesRes, itemsRes] = await Promise.all([
        fetch('/api/phases'),
        fetch('/api/items'),
      ]);

      if (phasesRes.ok && itemsRes.ok) {
        const phasesData = await phasesRes.json();
        const itemsData = await itemsRes.json();
        setPhases(phasesData);
        setItems(itemsData);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      if (!quiet) setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Polling every 10 seconds for multi-user collaboration (Spec 43)
  useEffect(() => {
    const timer = setInterval(() => {
      loadData(true);
    }, 10000);
    return () => clearInterval(timer);
  }, [loadData]);

  // Selection handlers
  const handleSelectPhase = (phaseId: string) => {
    if (focusedPhaseId === phaseId) {
      setFocusedPhaseId(null);
    } else {
      setFocusedPhaseId(phaseId);
      setFocusedItemId(null);
    }
  };

  const handleSelectItem = (item: Item) => {
    setFocusedItemId(item.id);
    setFocusedPhaseId(null);
  };

  const handleClearFocus = () => {
    setFocusedPhaseId(null);
    setFocusedItemId(null);
  };

  // Drag item position persistence
  const handleUpdateItemPosition = async (itemId: string, x: number, y: number) => {
    // Optimistic local update
    setItems(prev =>
      prev.map(i => (i.id === itemId ? { ...i, positionX: x, positionY: y } : i))
    );

    try {
      await fetch(`/api/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positionX: x, positionY: y }),
      });
    } catch (e) {
      console.error('Failed to save node coordinates:', e);
    }
  };

  // --- CRUD Item Handlers ---
  const handleSaveTool = async (toolData: Partial<Item>) => {
    if (editingTool) {
      // Update
      const res = await fetch(`/api/items/${editingTool.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toolData),
      });
      if (!res.ok) throw new Error('Errore durante l\'aggiornamento del Tool');
      const updated = await res.json();
      setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)));
      showToast(`Tool "${updated.title}" aggiornato.`);
    } else {
      // Create
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toolData),
      });
      if (!res.ok) throw new Error('Errore durante la creazione del Tool');
      const created = await res.json();
      setItems(prev => [...prev, created]);
      showToast(`Tool "${created.title}" aggiunto alla mappa.`);
    }
    setToolModalOpen(false);
    setEditingTool(null);
  };

  const handleSaveIdea = async (ideaData: Partial<Item>) => {
    if (editingIdea) {
      const res = await fetch(`/api/items/${editingIdea.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ideaData),
      });
      if (!res.ok) throw new Error('Errore aggiornamento Idea');
      const updated = await res.json();
      setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)));
      showToast(`Idea "${updated.title}" aggiornata.`);
    } else {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ideaData),
      });
      if (!res.ok) throw new Error('Errore creazione Idea');
      const created = await res.json();
      setItems(prev => [...prev, created]);
      showToast(`Idea "${created.title}" aggiunta alla mappa.`);
    }
    setIdeaModalOpen(false);
    setEditingIdea(null);
  };

  const handleSaveNeed = async (needData: Partial<Item>) => {
    if (editingNeed) {
      const res = await fetch(`/api/items/${editingNeed.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(needData),
      });
      if (!res.ok) throw new Error('Errore aggiornamento Esigenza');
      const updated = await res.json();
      setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)));
      showToast(`Esigenza "${updated.title}" aggiornata.`);
    } else {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(needData),
      });
      if (!res.ok) throw new Error('Errore creazione Esigenza');
      const created = await res.json();
      setItems(prev => [...prev, created]);
      showToast(`Esigenza "${created.title}" aggiunta.`);
    }
    setNeedModalOpen(false);
    setEditingNeed(null);
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Errore durante l\'eliminazione');
      setItems(prev => prev.filter(i => i.id !== itemId));
      setFocusedItemId(null);
      showToast('Elemento eliminato con successo.');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // --- CRUD Phase Handlers ---
  const handleSavePhase = async (phaseData: Partial<Phase> & { targetIndex?: number }) => {
    if (editingPhase) {
      const res = await fetch(`/api/phases/${editingPhase.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(phaseData),
      });
      if (!res.ok) throw new Error('Errore aggiornamento fase');
      await loadData();
      showToast(`Fase "${phaseData.title}" aggiornata.`);
    } else {
      const res = await fetch('/api/phases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(phaseData),
      });
      if (!res.ok) throw new Error('Errore creazione fase');
      await loadData();
      showToast(`Fase "${phaseData.title}" inserita nella sequenza.`);
    }
    setPhaseModalOpen(false);
    setEditingPhase(null);
  };

  const handleDeletePhase = async (phaseId: string) => {
    try {
      const res = await fetch(`/api/phases/${phaseId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Errore eliminazione fase');
      setFocusedPhaseId(null);
      await loadData();
      showToast('Fase eliminata e sequenza aggiornata.');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Attachments
  const handleAddAttachment = async (
    itemId: string,
    fileData: { fileName: string; mimeType: string; data: string }
  ) => {
    const res = await fetch(`/api/items/${itemId}/attachments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fileData),
    });
    if (!res.ok) throw new Error('Errore nel salvataggio dell\'allegato');
    const attachment = await res.json();

    setItems(prev =>
      prev.map(i =>
        i.id === itemId
          ? { ...i, attachments: [...(i.attachments || []), attachment] }
          : i
      )
    );
    showToast('Immagine caricata con successo.');
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    const res = await fetch(`/api/attachments/${attachmentId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Errore eliminazione allegato');

    setItems(prev =>
      prev.map(i => ({
        ...i,
        attachments: (i.attachments || []).filter(a => a.id !== attachmentId),
      }))
    );
    showToast('Allegato rimosso.');
  };

  // Reset to initial seed
  const handleResetSeed = async () => {
    if (confirm('Vuoi ripristinare il grafo ai dati iniziali standard T&A?')) {
      window.location.reload();
    }
  };

  const selectedPhase = phases.find(p => p.id === focusedPhaseId) || null;
  const selectedItem = items.find(i => i.id === focusedItemId) || null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#FAFBFD] text-slate-900 font-sans">
      {/* Sticky Top Header */}
      <Header
        filters={filters}
        onFilterChange={setFilters}
        onNewPhase={() => {
          setEditingPhase(null);
          setTargetPhaseIndex(phases.length);
          setPhaseModalOpen(true);
        }}
        onOpenAuditLog={() => setAuditLogModalOpen(true)}
        onResetSeed={handleResetSeed}
      />

      {/* Main Workspace Canvas Area */}
      <div className="flex-1 relative overflow-hidden flex">
        {isLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            <p className="text-xs font-semibold text-slate-500">
              Caricamento del processo T&A e del grafo...
            </p>
          </div>
        ) : (
          <div className="flex-1 h-full relative">
            <ToolboxGraph
              phases={phases}
              items={items}
              filters={filters}
              focusedPhaseId={focusedPhaseId}
              focusedItemId={focusedItemId}
              isDrawerOpen={Boolean(selectedPhase || selectedItem)}
              onSelectPhase={handleSelectPhase}
              onSelectItem={handleSelectItem}
              onClearFocus={handleClearFocus}
              onAddPhase={(idx) => {
                setEditingPhase(null);
                setTargetPhaseIndex(idx);
                setPhaseModalOpen(true);
              }}
              onAddTool={(phaseId) => {
                setEditingTool(null);
                setDefaultToolPhaseId(phaseId);
                setToolModalOpen(true);
              }}
              onAddIdea={(phaseId) => {
                setEditingIdea(null);
                setDefaultIdeaPhaseId(phaseId);
                setIdeaModalOpen(true);
              }}
              onAddNeed={(phaseId) => {
                setEditingNeed(null);
                setDefaultNeedPhaseId(phaseId);
                setNeedModalOpen(true);
              }}
              onUpdateItemPosition={handleUpdateItemPosition}
            />
          </div>
        )}

        {/* Phase Drawer (Right side) */}
        {selectedPhase && (
          <PhaseDrawer
            phase={selectedPhase}
            items={items}
            onClose={() => setFocusedPhaseId(null)}
            onSelectItem={handleSelectItem}
            onAddTool={(pid) => {
              setEditingTool(null);
              setDefaultToolPhaseId(pid);
              setToolModalOpen(true);
            }}
            onAddIdea={(pid) => {
              setEditingIdea(null);
              setDefaultIdeaPhaseId(pid);
              setIdeaModalOpen(true);
            }}
            onAddNeed={(pid) => {
              setEditingNeed(null);
              setDefaultNeedPhaseId(pid);
              setNeedModalOpen(true);
            }}
            onEditPhase={(p) => {
              setEditingPhase(p);
              setPhaseModalOpen(true);
            }}
            onDeletePhase={handleDeletePhase}
          />
        )}

        {/* Item Detail Drawer (Right side) */}
        {selectedItem && (
          <ItemDrawer
            item={selectedItem}
            phases={phases}
            onClose={() => setFocusedItemId(null)}
            onFocusPhase={(pid) => {
              setFocusedPhaseId(pid);
              setFocusedItemId(null);
            }}
            onEditItem={(itemToEdit) => {
              if (itemToEdit.type === 'TOOL') {
                setEditingTool(itemToEdit);
                setToolModalOpen(true);
              } else if (itemToEdit.type === 'IDEA') {
                setEditingIdea(itemToEdit);
                setIdeaModalOpen(true);
              } else {
                setEditingNeed(itemToEdit);
                setNeedModalOpen(true);
              }
            }}
            onDeleteItem={handleDeleteItem}
            onAddAttachment={handleAddAttachment}
            onDeleteAttachment={handleDeleteAttachment}
          />
        )}
      </div>

      {/* T&A Assistant Chatbot (Floating Bottom Right) */}
      <TAIAssistant
        onRefreshData={() => loadData(true)}
        isDrawerOpen={Boolean(selectedPhase || selectedItem)}
      />

      {/* Tool Modal Form */}
      <ToolForm
        initialData={editingTool}
        defaultPhaseId={defaultToolPhaseId}
        phases={phases}
        isOpen={toolModalOpen}
        onClose={() => {
          setToolModalOpen(false);
          setEditingTool(null);
        }}
        onSubmit={handleSaveTool}
      />

      {/* Idea Modal Form */}
      <IdeaForm
        initialData={editingIdea}
        defaultPhaseId={defaultIdeaPhaseId}
        phases={phases}
        isOpen={ideaModalOpen}
        onClose={() => {
          setIdeaModalOpen(false);
          setEditingIdea(null);
        }}
        onSubmit={handleSaveIdea}
      />

      {/* Need Modal Form */}
      <NeedForm
        initialData={editingNeed}
        defaultPhaseId={defaultNeedPhaseId}
        phases={phases}
        isOpen={needModalOpen}
        onClose={() => {
          setNeedModalOpen(false);
          setEditingNeed(null);
        }}
        onSubmit={handleSaveNeed}
      />

      {/* Phase Modal Form */}
      <PhaseForm
        initialData={editingPhase}
        targetIndex={targetPhaseIndex}
        isOpen={phaseModalOpen}
        onClose={() => {
          setPhaseModalOpen(false);
          setEditingPhase(null);
        }}
        onSubmit={handleSavePhase}
      />

      {/* Audit Log Modal */}
      <AuditLogModal
        isOpen={auditLogModalOpen}
        onClose={() => setAuditLogModalOpen(false)}
      />

      {/* Toast Feedback */}
      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-top-4 duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white shadow-emerald-500/20'
              : 'bg-red-600 text-white shadow-red-500/20'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
