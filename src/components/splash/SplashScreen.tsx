import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Info, Pause, Play } from 'lucide-react';
import { APP_PURPOSE } from '../../utils/adm.ts';
import { Practice } from '../../types/index.ts';
import { PracticePicker } from '../practices/PracticePicker.tsx';
import { PracticeStats } from './PracticeStats.tsx';

export const SPLASH_STORAGE_KEY = 'adm.splash.seen';
const AUTO_CLOSE_MS = 9000;
const EXIT_MS = 500;
export const CHAMPION_EMAIL = 'carmelo.battiato@accenture.com';

const FINDINGS = [
  'Process phases aligned to the practice',
  'Tools already available',
  'WiPs in development',
  'Open needs and reuse opportunities',
];

interface SplashScreenProps {
  onDone: () => void;
  // First time for this user (no default practice yet): welcome + practice choice, the splash waits for the user
  onboarding?: boolean;
  // Signed-in user's name; empty for anonymous visitors
  userName?: string;
  practices?: Practice[];
  // Practice the app is showing (the user's default, or the last one used): highlighted when nothing is chosen
  currentPracticeId?: string | null;
  // Saves the chosen default practice; the splash closes only if it succeeds
  onChoosePractice?: (practiceId: string) => Promise<void>;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onDone,
  onboarding = false,
  userName,
  practices = [],
  currentPracticeId = null,
  onChoosePractice,
}) => {
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false); // paused with the button or Space
  const [hovered, setHovered] = useState(false); // paused while the pointer is on the card
  const [chosen, setChosen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const elapsedRef = useRef(0);

  const close = () => setLeaving(true);
  const isPaused = paused || hovered;
  // The practice shown as selected, and whose counts the strip displays
  const highlightedId = onboarding ? chosen : currentPracticeId;
  const statsId = chosen ?? currentPracticeId ?? practices[0]?.id ?? null;
  const statsName = practices.find(p => p.id === statsId)?.name;

  // Fade out, then tell the app the splash is gone
  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(onDone, EXIT_MS);
    return () => clearTimeout(timer);
  }, [leaving, onDone]);

  // Progress bar and auto-close share one clock, so pausing stops both and resuming continues from the same point
  useEffect(() => {
    if (onboarding || isPaused || leaving) return;
    let last = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      elapsedRef.current += now - last;
      last = now;
      if (elapsedRef.current >= AUTO_CLOSE_MS) {
        elapsedRef.current = AUTO_CLOSE_MS;
        if (barRef.current) barRef.current.style.transform = 'scaleX(1)';
        close();
        return;
      }
      if (barRef.current) barRef.current.style.transform = `scaleX(${elapsedRef.current / AUTO_CLOSE_MS})`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [onboarding, isPaused, leaving]);

  // Esc and Enter close; Space pauses. The welcome waits for its button.
  useEffect(() => {
    if (onboarding) return;
    const onKey = (e: KeyboardEvent) => {
      // Keys on a focused button already act as a click on it
      if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement) return;
      if (e.key === 'Escape' || e.key === 'Enter') close();
      if (e.key === ' ') {
        e.preventDefault();
        setPaused(p => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onboarding]);

  const choose = async () => {
    if (!chosen || !onChoosePractice) return;
    setSaving(true);
    setError(null);
    try {
      await onChoosePractice(chosen);
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the default practice');
    } finally {
      setSaving(false);
    }
  };

  const welcomeTitle = onboarding
    ? `Welcome, ${userName || 'new user'}`
    : userName
      ? `Welcome back, ${userName}`
      : 'Welcome';
  const welcomeText = onboarding
    ? 'Choose the practice you work on: it opens every time you sign in. You can change it later from your user menu.'
    : userName
      ? 'Your default practice opens at sign-in. You can change it from your user menu.'
      : 'Browse every practice. Sign in to edit.';

  return (
    <div
      className={`fixed inset-0 z-[90] flex select-none overflow-y-auto bg-gradient-to-br from-[#F5F3FF] via-white to-[#EEF2FF] p-4 transition-opacity ease-out sm:p-8 ${
        leaving ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ transitionDuration: `${EXIT_MS}ms` }}
      role="dialog"
      aria-label={onboarding ? 'Welcome to ADM' : 'Introduction to ADM'}
    >
      {/* Soft decorative glows */}
      <div className="pointer-events-none absolute -top-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-purple-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -left-24 h-[30rem] w-[30rem] rounded-full bg-indigo-200/40 blur-3xl" />

      <div
        className="relative m-auto w-full max-w-5xl animate-in fade-in zoom-in-95 duration-700"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg font-extrabold tracking-tight text-slate-900">accenture</span>
          <span className="h-5 w-px bg-slate-300" />
          <span className="text-sm font-medium text-slate-500">Delivery Methods</span>
        </div>

        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          ADM Project{' '}
          <span className="bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent">Blueprint</span>
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">{APP_PURPOSE}</p>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-xl shadow-purple-900/5 backdrop-blur sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-purple-700 to-indigo-600 text-xs font-bold uppercase text-white">
              {userName ? userName.slice(0, 2) : '→'}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900">{welcomeTitle}</div>
              <p className="text-xs leading-relaxed text-slate-500">{welcomeText}</p>
            </div>
          </div>

          {onboarding && (
            <p className="mt-3 rounded-xl bg-purple-50 px-3 py-2 text-[11px] leading-relaxed text-purple-900">
              You are a new user: you have been assigned the <strong>viewer</strong> role. You can add <strong>needs</strong>, but
              not tools or WiPs. To request an editor account, email your reference champion or{' '}
              <a href={`mailto:${CHAMPION_EMAIL}`} className="font-semibold underline underline-offset-2 hover:text-purple-700">
                {CHAMPION_EMAIL}
              </a>
              .
            </p>
          )}
          {error && <p className="mt-3 text-xs font-semibold text-red-600">{error}</p>}

          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_15rem]">
            {practices.length === 0 ? (
              <p className="py-10 text-center text-xs text-slate-500">No practice available yet.</p>
            ) : (
              <PracticePicker
                practices={practices}
                value={highlightedId}
                onChange={setChosen}
                readOnly={!onboarding}
                listClassName="max-h-[22rem]"
              />
            )}

            <aside className="rounded-2xl bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                <Info className="h-4 w-4 text-purple-700" /> What you&apos;ll find
              </div>
              <ul className="space-y-2.5">
                {FINDINGS.map(item => (
                  <li key={item} className="flex items-start gap-2 text-xs leading-relaxed text-slate-600">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-700" />
                    {item}
                  </li>
                ))}
              </ul>
            </aside>
          </div>

          {/* Same strip with or without the welcome: the button and the bar keep their place */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
            <PracticeStats practiceCount={practices.length} practiceId={statsId} />
            <div className="flex items-center gap-3">
              {/* Time left before it closes by itself, with pause; hidden (not removed) during the welcome */}
              <div className={`flex items-center gap-2 ${onboarding ? 'invisible' : ''}`}>
                <div className="h-1 w-24 overflow-hidden rounded-full bg-slate-200">
                  <div ref={barRef} className="h-full origin-left bg-purple-600" style={{ transform: 'scaleX(0)' }} />
                </div>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setPaused(p => !p);
                  }}
                  tabIndex={onboarding ? -1 : 0}
                  aria-label={isPaused ? 'Resume' : 'Pause'}
                  title={isPaused ? 'Resume' : 'Pause: read at your pace'}
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
                >
                  {isPaused ? <Play className="h-3.5 w-3.5 fill-current" /> : <Pause className="h-3.5 w-3.5 fill-current" />}
                </button>
              </div>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  if (onboarding) void choose();
                  else close();
                }}
                disabled={onboarding && (!chosen || saving)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-purple-700 to-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-900/25 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                {onboarding ? (saving ? 'Saving…' : 'Got it') : 'Enter'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
