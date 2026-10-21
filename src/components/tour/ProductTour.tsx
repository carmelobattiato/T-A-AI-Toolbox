import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Layers, Network, SlidersHorizontal, LayoutDashboard, Sparkles, X, Check } from 'lucide-react';

export const TOUR_STORAGE_KEY = 'adm.tour.v1.dismissed';

type TourView = 'map' | 'dashboard';

interface TourStep {
  // Value of the data-tour attribute of the element to focus
  target: string;
  title: string;
  body: React.ReactNode;
  icon: React.ReactNode;
  accent: string;
  // Page the step needs on screen (the tour switches to it)
  view?: TourView;
}

const STEPS: TourStep[] = [
  {
    target: 'practice',
    title: 'One practice, one map',
    icon: <Layers className="w-5 h-5" />,
    accent: 'from-purple-600 to-indigo-600',
    body: (
      <>
        Each practice (T&A, Operations, Developer…) has its own process, tools, WiPs and needs. Switch practice from here.
        <span className="mt-2 block text-slate-500">
          Everyone can <strong className="text-slate-700">browse</strong>; to edit you need to sign in with a user enabled on the practice. You can submit <strong className="text-emerald-600">needs</strong> even without signing in.
        </span>
      </>
    ),
    view: 'map',
  },
  {
    target: 'workspace',
    title: 'The three-level graph',
    icon: <Network className="w-5 h-5" />,
    accent: 'from-blue-600 to-indigo-600',
    body: (
      <>
        In the middle, the <strong className="text-slate-800">process phases</strong>; above them the <strong className="text-blue-600">Tools</strong> and{' '}
        <strong className="text-purple-600">WiPs</strong> that cover them; below, the <strong className="text-emerald-600">Needs</strong> to be addressed.
        <span className="mt-2 block text-slate-500">Click a phase or an item for details, drag to pan, use the "+" buttons to add.</span>
      </>
    ),
    view: 'map',
  },
  {
    target: 'filters',
    title: 'Search and filter',
    icon: <SlidersHorizontal className="w-5 h-5" />,
    accent: 'from-sky-500 to-blue-600',
    body: (
      <>
        Narrow the map by <strong className="text-slate-800">creation date</strong>, <strong className="text-slate-800">tag and customer</strong> (even several values
        separated by <code className="rounded bg-slate-100 px-1">;</code>), item type or "To generalize". The search box at the top highlights what you are looking for.
      </>
    ),
    view: 'map',
  },
  {
    target: 'workspace',
    title: 'The dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    accent: 'from-emerald-500 to-teal-600',
    body: (
      <>
        Eight tiles with charts, totals and lists. The <strong className="text-slate-800">+</strong> button on a free tile opens the chat: describe in words what you want
        to see (e.g. "the 3 needs with the highest priority") and the assistant builds it.
        <span className="mt-2 block text-slate-500">Switch view with the Map / Dashboard toggle at the top.</span>
      </>
    ),
    view: 'dashboard',
  },
  {
    target: 'assistant',
    title: 'The AI assistant',
    icon: <Sparkles className="w-5 h-5" />,
    accent: 'from-fuchsia-500 to-purple-600',
    body: (
      <>
        Write in natural language to <strong className="text-slate-800">search</strong> ("which tools do we have for Assessment?"),{' '}
        <strong className="text-slate-800">create</strong> tools, WiPs, needs and phases, or <strong className="text-slate-800">delete</strong> and edit items.
        <span className="mt-2 block text-slate-500">Every change goes through a confirmation card: nothing changes without your OK.</span>
      </>
    ),
    view: 'map',
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const SPOT_PAD = 8;
const CARD_W = 360;
const CARD_GAP = 16;
const EDGE = 12;

function measure(target: string): Rect | null {
  const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

// Places the card beside the spotlight (below, above, right, left), else centred on screen
function placeCard(rect: Rect | null, cardH: number): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const centred = { top: Math.max(EDGE, (vh - cardH) / 2), left: Math.max(EDGE, (vw - CARD_W) / 2) };
  if (!rect) return centred;

  const clampLeft = (x: number) => Math.min(Math.max(EDGE, x), vw - CARD_W - EDGE);
  const clampTop = (y: number) => Math.min(Math.max(EDGE, y), vh - cardH - EDGE);
  const spot = { top: rect.top - SPOT_PAD, left: rect.left - SPOT_PAD, bottom: rect.top + rect.height + SPOT_PAD, right: rect.left + rect.width + SPOT_PAD };

  if (spot.bottom + CARD_GAP + cardH <= vh - EDGE) return { top: spot.bottom + CARD_GAP, left: clampLeft(rect.left + rect.width / 2 - CARD_W / 2) };
  if (spot.top - CARD_GAP - cardH >= EDGE) return { top: spot.top - CARD_GAP - cardH, left: clampLeft(rect.left + rect.width / 2 - CARD_W / 2) };
  if (spot.right + CARD_GAP + CARD_W <= vw - EDGE) return { top: clampTop(rect.top + rect.height / 2 - cardH / 2), left: spot.right + CARD_GAP };
  if (spot.left - CARD_GAP - CARD_W >= EDGE) return { top: clampTop(rect.top + rect.height / 2 - cardH / 2), left: spot.left - CARD_GAP - CARD_W };
  // The target fills the screen: float the card over its lower-left part
  return { top: clampTop(vh - cardH - 32), left: clampLeft(spot.left + 24) };
}

interface ProductTourProps {
  isOpen: boolean;
  onClose: (dontShowAgain: boolean) => void;
  onViewChange: (view: TourView) => void;
  // View to go back to when the tour ends
  initialView: TourView;
}

export const ProductTour: React.FC<ProductTourProps> = ({ isOpen, onClose, onViewChange, initialView }) => {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [dontShow, setDontShow] = useState(true);
  const [cardH, setCardH] = useState(280);
  const cardRef = useRef<HTMLDivElement>(null);
  const startView = useRef<TourView>(initialView);
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  // Each run starts from the first step and remembers the page to return to
  useEffect(() => {
    if (!isOpen) return;
    setIndex(0);
    setDontShow(true);
    startView.current = initialView;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && step.view) onViewChange(step.view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, index]);

  // Follow the target: it can move when the page switches view, resizes or finishes loading
  useEffect(() => {
    if (!isOpen) return;
    const update = () => setRect(prev => {
      const next = measure(step.target);
      if (!next) return null;
      return prev && prev.top === next.top && prev.left === next.left && prev.width === next.width && prev.height === next.height ? prev : next;
    });
    update();
    const timer = setInterval(update, 150);
    window.addEventListener('resize', update);
    return () => {
      clearInterval(timer);
      window.removeEventListener('resize', update);
    };
  }, [isOpen, step.target, index]);

  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight);
  }, [index, isOpen]);

  const finish = useCallback(() => {
    onViewChange(startView.current);
    onClose(dontShow);
  }, [dontShow, onClose, onViewChange]);

  const next = useCallback(() => (isLast ? finish() : setIndex(i => i + 1)), [isLast, finish]);
  const prev = useCallback(() => setIndex(i => Math.max(0, i - 1)), []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, finish, next, prev]);

  if (!isOpen) return null;

  const pos = placeCard(rect, cardH);

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Intro tour">
      {/* Blocks clicks on the page while the tour is open */}
      <div className="absolute inset-0" />

      {/* Spotlight: the page stays bright inside the cut-out, dimmed everywhere else */}
      {rect ? (
        <div
          className="absolute rounded-2xl pointer-events-none transition-all duration-500 ease-out"
          style={{
            top: rect.top - SPOT_PAD,
            left: rect.left - SPOT_PAD,
            width: rect.width + SPOT_PAD * 2,
            height: rect.height + SPOT_PAD * 2,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.68), 0 0 0 2px rgba(168, 85, 247, 0.95), 0 0 28px 6px rgba(168, 85, 247, 0.45)',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-900/68 pointer-events-none" style={{ background: 'rgba(15, 23, 42, 0.68)' }} />
      )}

      {/* Tooltip card */}
      <div
        ref={cardRef}
        key={index}
        className="absolute rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden transition-all duration-500 ease-out animate-in fade-in zoom-in-95"
        style={{ width: CARD_W, top: pos.top, left: pos.left, maxWidth: 'calc(100vw - 24px)' }}
      >
        <div className={`h-1.5 bg-gradient-to-r ${step.accent}`} />
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className={`shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${step.accent} text-white flex items-center justify-center shadow-md`}>
              {step.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {index + 1} of {STEPS.length}
              </div>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">{step.title}</h3>
            </div>
            <button type="button" onClick={finish} title="Close the tour (Esc)" className="shrink-0 p-1 -mr-1 -mt-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 text-[13px] leading-relaxed text-slate-600">{step.body}</div>

          {/* Progress dots, clickable */}
          <div className="mt-4 flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <button
                key={s.title}
                type="button"
                onClick={() => setIndex(i)}
                title={s.title}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${i === index ? `w-6 bg-gradient-to-r ${step.accent}` : i < index ? 'w-1.5 bg-purple-300' : 'w-1.5 bg-slate-200 hover:bg-slate-300'}`}
              />
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-[11px] font-medium text-slate-500 cursor-pointer select-none">
              <input type="checkbox" checked={dontShow} onChange={e => setDontShow(e.target.checked)} className="accent-purple-600 w-3.5 h-3.5" />
              Don't show again
            </label>
            <div className="flex items-center gap-1.5">
              {index > 0 && (
                <button type="button" onClick={prev} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
              )}
              <button
                type="button"
                onClick={next}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white rounded-lg shadow-sm bg-gradient-to-r ${step.accent} hover:brightness-110 cursor-pointer`}
              >
                {isLast ? (<>Get started <Check className="w-3.5 h-3.5" /></>) : (<>Next <ArrowRight className="w-3.5 h-3.5" /></>)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
