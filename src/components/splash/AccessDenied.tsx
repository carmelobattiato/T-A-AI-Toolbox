import React from 'react';
import { Lock, ExternalLink, RotateCw } from 'lucide-react';

export const PORTAL_URL = 'https://portale.genai-garage.accenture.com';

// Shown when the portal cookie is there but does not give access (invalid token, unknown or disabled user)
export const AccessDenied: React.FC = () => (
  <div
    role="alertdialog"
    aria-label="Access not authorized"
    className="fixed inset-0 z-[100] flex items-center justify-center p-6 select-none"
    style={{
      background: 'radial-gradient(circle at 20% 15%, #6D28D9 0%, #4C1D95 38%, #1E1B4B 100%)',
    }}
  >
    <div className="max-w-lg text-center text-white">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/25">
        <Lock className="h-8 w-8" />
      </div>
      <div className="text-[11px] font-bold uppercase tracking-[0.35em] text-purple-200">Access not authorized</div>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">ADM Project Blueprint</h1>
      <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-purple-50/90">
        You are not authorized to access this application. Sign in through the Accenture SSO on the portal{' '}
        <a
          href={PORTAL_URL}
          target="_blank"
          rel="noreferrer"
          className="font-semibold underline decoration-purple-300 underline-offset-2 hover:text-purple-100"
        >
          {PORTAL_URL.replace('https://', '')}
        </a>
        , then reload this page.
      </p>
      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <a
          href={PORTAL_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-purple-800 shadow-xl shadow-purple-950/40 transition hover:scale-105"
        >
          Open the portal
          <ExternalLink className="h-4 w-4" />
        </a>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-white/10 cursor-pointer"
        >
          Reload page
          <RotateCw className="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
);
