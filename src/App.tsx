import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Phase, Item, FilterState, DashboardTile, Practice, DEFAULT_PRACTICE_ID } from './types/index.ts';
import { useAuth } from './auth/AuthContext.tsx';
import { Header, AppView } from './components/header/Header.tsx';
import { Dashboard } from './components/dashboard/Dashboard.tsx';
import { FilterBar } from './components/header/FilterBar.tsx';
import { ToolboxGraph } from './components/graph/ToolboxGraph.tsx';
import { PhaseDrawer } from './components/drawers/PhaseDrawer.tsx';
import { ItemDrawer } from './components/drawers/ItemDrawer.tsx';
import { ToolForm } from './components/forms/ToolForm.tsx';
import { IdeaForm } from './components/forms/IdeaForm.tsx';
import { NeedForm } from './components/forms/NeedForm.tsx';
import { PhaseForm } from './components/forms/PhaseForm.tsx';
import { AuditLogModal } from './components/modals/AuditLogModal.tsx';
import { SettingsModal } from './components/modals/SettingsModal.tsx';
import { LoginModal } from './components/modals/LoginModal.tsx';
import { SplashScreen, SPLASH_STORAGE_KEY } from './components/splash/SplashScreen.tsx';
import { ProductTour, TOUR_STORAGE_KEY } from './components/tour/ProductTour.tsx';
import { ChangePasswordModal } from './components/modals/ChangePasswordModal.tsx';
import { TAIAssistant } from './components/chat/TAIAssistant.tsx';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const PRACTICE_STORAGE_KEY = 'adm.practice';

export default function App() {
  const { user, isAdmin, canEdit, logout } = useAuth();
  const [practices, setPractices] = useState<Practice[]>([]);
  const [practiceId, setPracticeId] = useState<string>(() => localStorage.getItem(PRACTICE_STORAGE_KEY) || DEFAULT_PRACTICE_ID);
  // Latest practice selection, so a slow response for the previous practice never overwrites the map
  const practiceRef = useRef(practiceId);
  const [loginOpen, setLoginOpen] = useState(false);
  // The ADM introduction is shown once per browser session, before everything else
  const [splashOpen, setSplashOpen] = useState(() => !sessionStorage.getItem(SPLASH_STORAGE_KEY));
  const [tourOpen, setTourOpen] = useState(false);
  // The tour opens by itself at most once per page load, even if "Don't show again" is unchecked
  const tourAutoShown = useRef(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [view, setView] = useState<AppView>('map');
  const [tiles, setTiles] = useState<DashboardTile[]>([]);
  const [chatPreset, setChatPreset] = useState<{ text: string; nonce: number } | null>(null);

  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    showTools: true,
    showIdeas: true,
    showNeeds: true,
    onlyGeneralize: false,
    maxAgeDays: null,
    tagQuery: '',
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
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'ai' | 'users' | 'practices'>('ai');
  const [isCustomAiActive, setIsCustomAiActive] = useState(false);

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const readOnly = !canEdit(practiceId);
  const currentPractice = practices.find(p => p.id === practiceId);
  const mustChangePassword = Boolean(user?.mustChangePassword);

  const loadPractices = useCallback(async () => {
    try {
      const res = await fetch('/api/practices');
      if (!res.ok) return;
      const list: Practice[] = await res.json();
      setPractices(list);
      // The selected practice may have been deleted meanwhile
      if (list.length > 0 && !list.some(p => p.id === practiceRef.current)) {
        setPracticeId(list.find(p => p.id === DEFAULT_PRACTICE_ID)?.id ?? list[0].id);
      }
    } catch (e) {
      console.error('Failed to load practices:', e);
    }
  }, []);

  const selectPractice = (id: string) => {
    if (id === practiceId) return;
    localStorage.setItem(PRACTICE_STORAGE_KEY, id);
    setFocusedPhaseId(null);
    setFocusedItemId(null);
    setPhases([]);
    setItems([]);
    setTiles([]);
    setPracticeId(id);
  };

  // Creates a practice (admins only, enforced by the server) and switches to its empty map
  const handleCreatePractice = async (name: string): Promise<string | null> => {
    try {
      const res = await fetch('/api/practices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return data.error || 'Failed to create the practice';
      }
      const created: Practice = await res.json();
      await loadPractices();
      selectPractice(created.id);
      showToast(`Practice "${created.name}" created: it starts with a Base phase to customize.`);
      return null;
    } catch {
      return 'Failed to create the practice';
    }
  };

  const checkSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setIsCustomAiActive(Boolean(data.provider === 'openai' && data.hasApiKey));
      }
    } catch (e) {
      console.error('Failed to check settings:', e);
    }
  }, []);

  // Fetch all data from server
  const loadData = useCallback(async (quiet = false) => {
    const requested = practiceId;
    const query = `?practice=${encodeURIComponent(requested)}`;
    if (!quiet) setIsLoading(true);
    try {
      const [phasesRes, itemsRes, tilesRes] = await Promise.all([
        fetch(`/api/phases${query}`),
        fetch(`/api/items${query}`),
        fetch(`/api/dashboard/tiles${query}`),
      ]);

      if (practiceRef.current !== requested) return;
      if (phasesRes.status === 404) {
        // Unknown practice (e.g. deleted): the practice list decides where to go next
        await loadPractices();
        return;
      }
      if (phasesRes.ok && itemsRes.ok) {
        const phasesData = await phasesRes.json();
        const itemsData = await itemsRes.json();
        setPhases(phasesData);
        setItems(itemsData);
        if (tilesRes.ok) setTiles(await tilesRes.json());
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      if (!quiet && practiceRef.current === requested) setIsLoading(false);
    }
  }, [practiceId, loadPractices]);

  useEffect(() => {
    practiceRef.current = practiceId;
  }, [practiceId]);

  // Load on start and whenever the practice changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // The AI indicator is only visible to admins
  useEffect(() => {
    checkSettings();
  }, [checkSettings, isAdmin]);

  useEffect(() => {
    loadPractices();
  }, [loadPractices]);

  // First visit (decided by the browser's local storage): show the tour once the map is on screen
  useEffect(() => {
    if (splashOpen || isLoading || mustChangePassword || tourAutoShown.current || localStorage.getItem(TOUR_STORAGE_KEY)) return;
    const timer = setTimeout(() => {
      tourAutoShown.current = true;
      setTourOpen(true);
    }, 900);
    return () => clearTimeout(timer);
  }, [splashOpen, isLoading, mustChangePassword]);

  // Polling every 10 seconds for multi-user collaboration (Spec 43)
  useEffect(() => {
    const timer = setInterval(() => {
      loadData(true);
      loadPractices();
    }, 10000);
    return () => clearInterval(timer);
  }, [loadData, loadPractices]);

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
      if (!res.ok) throw new Error('Error while updating the Tool');
      const updated = await res.json();
      setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)));
      showToast(`Tool "${updated.title}" updated.`);
    } else {
      // Create
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...toolData, practiceId }),
      });
      if (!res.ok) throw new Error('Error while creating the Tool');
      const created = await res.json();
      setItems(prev => [...prev, created]);
      showToast(`Tool "${created.title}" added to the map.`);
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
      if (!res.ok) throw new Error('Error while updating the WiP');
      const updated = await res.json();
      setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)));
      showToast(`WiP "${updated.title}" updated.`);
    } else {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ideaData, practiceId }),
      });
      if (!res.ok) throw new Error('Error while creating the WiP');
      const created = await res.json();
      setItems(prev => [...prev, created]);
      showToast(`WiP "${created.title}" added to the map.`);
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
      if (!res.ok) throw new Error('Error while updating the Need');
      const updated = await res.json();
      setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)));
      showToast(`Need "${updated.title}" updated.`);
    } else {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...needData, practiceId }),
      });
      if (!res.ok) throw new Error('Error while creating the Need');
      const created = await res.json();
      setItems(prev => [...prev, created]);
      showToast(`Need "${created.title}" added.`);
    }
    setNeedModalOpen(false);
    setEditingNeed(null);
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error while deleting');
      setItems(prev => prev.filter(i => i.id !== itemId));
      setFocusedItemId(null);
      showToast('Item deleted successfully.');
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
      if (!res.ok) throw new Error('Error while updating the phase');
      await loadData();
      showToast(`Phase "${phaseData.title}" updated.`);
    } else {
      const res = await fetch('/api/phases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...phaseData, practiceId }),
      });
      if (!res.ok) throw new Error('Error while creating the phase');
      await loadData();
      showToast(`Phase "${phaseData.title}" added to the sequence.`);
    }
    setPhaseModalOpen(false);
    setEditingPhase(null);
  };

  const handleDeletePhase = async (phaseId: string) => {
    try {
      const res = await fetch(`/api/phases/${phaseId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error while deleting the phase');
      setFocusedPhaseId(null);
      await loadData();
      showToast('Phase deleted and sequence updated.');
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
    if (!res.ok) throw new Error('Error while saving the attachment');
    const attachment = await res.json();

    setItems(prev =>
      prev.map(i =>
        i.id === itemId
          ? { ...i, attachments: [...(i.attachments || []), attachment] }
          : i
      )
    );
    showToast('Image uploaded successfully.');
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    const res = await fetch(`/api/attachments/${attachmentId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error while deleting the attachment');

    setItems(prev =>
      prev.map(i => ({
        ...i,
        attachments: (i.attachments || []).filter(a => a.id !== attachmentId),
      }))
    );
    showToast('Attachment removed.');
  };

  // New elements are owned by whoever creates them, else by the practice's team
  const defaultOwner = user?.displayName ?? `Team ${currentPractice?.name ?? ''}`.trim();

  const selectedPhase = phases.find(p => p.id === focusedPhaseId) || null;
  const selectedItem = items.find(i => i.id === focusedItemId) || null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#FAFBFD] text-slate-900 font-sans">
      {/* Sticky Top Header */}
      <Header
        view={view}
        onViewChange={setView}
        filters={filters}
        onFilterChange={setFilters}
        onNewPhase={() => {
          setEditingPhase(null);
          setTargetPhaseIndex(phases.length);
          setPhaseModalOpen(true);
        }}
        onOpenAuditLog={() => setAuditLogModalOpen(true)}
        onOpenSettings={() => {
          setSettingsTab('ai');
          setSettingsModalOpen(true);
        }}
        isCustomAiActive={isCustomAiActive}
        practices={practices}
        practiceId={practiceId}
        onSelectPractice={selectPractice}
        onCreatePractice={handleCreatePractice}
        user={user}
        isAdmin={isAdmin}
        canEditPractice={!readOnly}
        onLogin={() => setLoginOpen(true)}
        onLogout={logout}
        onChangePassword={() => setChangePasswordOpen(true)}
        onStartTour={() => setTourOpen(true)}
      />

      {view === 'map' && <FilterBar filters={filters} onFilterChange={setFilters} />}

      {/* Main Workspace Canvas Area */}
      <div data-tour="workspace" className="flex-1 relative overflow-hidden flex">
        {view === 'dashboard' ? (
          <Dashboard
            items={items}
            phases={phases}
            tiles={tiles}
            readOnly={readOnly}
            onSelectItem={item => {
              setView('map');
              handleSelectItem(item);
            }}
            onAddTile={slot =>
              setChatPreset({
                text: `I want to configure tile No. ${slot} of the dashboard. I would like to see: `,
                nonce: Date.now(),
              })
            }
            onDeleteTile={async slot => {
              const res = await fetch(`/api/dashboard/tiles/${slot}?practice=${encodeURIComponent(practiceId)}`, { method: 'DELETE' });
              if (res.ok) {
                setTiles(prev => prev.filter(t => t.slot !== slot));
                showToast(`Tile No. ${slot} removed.`);
              } else {
                showToast('Error while removing the tile.', 'error');
              }
            }}
          />
        ) : isLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            <p className="text-xs font-semibold text-slate-500">
              Loading the practice map...
            </p>
          </div>
        ) : (
          <div className="flex-1 h-full relative">
            <ToolboxGraph
              readOnly={readOnly}
              practices={practices}
              practiceId={practiceId}
              canCreatePractice={isAdmin}
              onSelectPractice={selectPractice}
              onCreatePractice={() => {
                setSettingsTab('practices');
                setSettingsModalOpen(true);
              }}
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
        {view === 'map' && selectedPhase && (
          <PhaseDrawer
            readOnly={readOnly}
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
        {view === 'map' && selectedItem && (
          <ItemDrawer
            readOnly={readOnly}
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

      {/* ADM Assistant Chatbot (Floating Bottom Right) */}
      <TAIAssistant
        onRefreshData={() => loadData(true)}
        isDrawerOpen={Boolean(selectedPhase || selectedItem)}
        presetRequest={chatPreset}
        practiceId={practiceId}
        practiceName={currentPractice?.name ?? practiceId}
        canEdit={!readOnly}
      />

      {/* Tool Modal Form */}
      <ToolForm
        defaultOwner={defaultOwner}
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
        defaultOwner={defaultOwner}
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
        defaultOwner={defaultOwner}
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

      {/* Settings AI Modal */}
      <SettingsModal
        isOpen={settingsModalOpen && isAdmin}
        initialTab={settingsTab}
        onPracticesChanged={loadPractices}
        onClose={() => setSettingsModalOpen(false)}
        onSaved={() => {
          checkSettings();
          showToast('AI configuration saved.');
        }}
      />

      {splashOpen && (
        <SplashScreen
          onDone={() => {
            sessionStorage.setItem(SPLASH_STORAGE_KEY, '1');
            setSplashOpen(false);
          }}
        />
      )}

      <ProductTour
        isOpen={tourOpen}
        initialView={view}
        onViewChange={setView}
        onClose={dontShowAgain => {
          setTourOpen(false);
          if (dontShowAgain) localStorage.setItem(TOUR_STORAGE_KEY, '1');
        }}
      />

      <LoginModal isOpen={loginOpen && !user} onClose={() => setLoginOpen(false)} />

      {/* A temporary password (first admin login, or reset by an admin) must be replaced right away */}
      <ChangePasswordModal
        isOpen={mustChangePassword || changePasswordOpen}
        forced={mustChangePassword}
        onClose={() => setChangePasswordOpen(false)}
        onChanged={() => showToast('Password updated.')}
      />

      {/* Toast Feedback */}
      {toast && (
        <div
          className={`fixed top-32 right-6 z-50 px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-top-4 duration-200 ${
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
