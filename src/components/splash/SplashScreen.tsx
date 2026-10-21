import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { ADM_DEFINITION } from '../../utils/adm.ts';

export const SPLASH_STORAGE_KEY = 'adm.splash.seen';
const AUTO_CLOSE_MS = 9000;
const EXIT_MS = 500;

interface SplashScreenProps {
  onDone: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onDone }) => {
  const [leaving, setLeaving] = useState(false);

  const close = () => setLeaving(true);

  // Fade out, then tell the app the splash is gone
  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(onDone, EXIT_MS);
    return () => clearTimeout(timer);
  }, [leaving, onDone]);

  useEffect(() => {
    const auto = setTimeout(close, AUTO_CLOSE_MS);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(auto);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div
      onClick={close}
      className={`fixed inset-0 z-[90] flex items-center justify-center p-6 cursor-pointer select-none transition-opacity ease-out ${
        leaving ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        transitionDuration: `${EXIT_MS}ms`,
        background: 'radial-gradient(circle at 20% 15%, #6D28D9 0%, #4C1D95 38%, #1E1B4B 100%)',
      }}
      role="dialog"
      aria-label="Introduction to ADM"
    >
      {/* Soft decorative glows */}
      <div className="pointer-events-none absolute -top-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -left-24 h-[30rem] w-[30rem] rounded-full bg-indigo-400/20 blur-3xl" />

      <div className="relative max-w-2xl text-center animate-in fade-in zoom-in-95 duration-700">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/25 backdrop-blur">
          <svg className="h-9 w-9 fill-white" viewBox="0 0 24 24">
            <path d="M5.59 7.41L10.18 12l-4.59 4.59L7 18l6-6-6-6zM16 6h2v12h-2z" />
          </svg>
        </div>

        <div className="text-[11px] font-bold uppercase tracking-[0.35em] text-purple-200">Accenture Delivery Methods</div>
        <h1 className="mt-3 text-5xl font-extrabold tracking-tight text-white sm:text-6xl">ADM Project Blueprint</h1>
        <div className="mx-auto mt-6 h-px w-24 bg-gradient-to-r from-transparent via-purple-300 to-transparent" />

        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-purple-50/90 sm:text-lg">{ADM_DEFINITION}</p>

        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            close();
          }}
          className="mt-9 inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-purple-800 shadow-xl shadow-purple-950/40 transition hover:scale-105 cursor-pointer"
        >
          Enter
          <ArrowRight className="h-4 w-4" />
        </button>

        {/* Time left before it closes by itself */}
        <div className="mx-auto mt-8 h-0.5 w-40 overflow-hidden rounded-full bg-white/15">
          <div className="h-full origin-left bg-white/70" style={{ animation: `splash-progress ${AUTO_CLOSE_MS}ms linear forwards` }} />
        </div>
      </div>

      <style>{`@keyframes splash-progress { from { transform: scaleX(0); } to { transform: scaleX(1); } }`}</style>
    </div>
  );
};
