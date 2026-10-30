// Calls to the server routes that talk to the portal (see server/portalCatalog.ts)

// Messages for the codes the server sends
const PORTAL_ERROR_TEXT: Record<string, string> = {
  portal_session_expired: 'Your portal session has expired. Sign in to the portal again, then reload this page.',
  portal_session_missing: 'Sign in to the portal, then reload this page to load its catalog.',
  portal_unreachable: 'The portal is not reachable. Check its address in Settings > Portal.',
  portal_error: 'The portal returned an error. Try again later.',
};

// Parses the answer; a failed request throws an Error whose message is ready to show to the user
export async function portalRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(PORTAL_ERROR_TEXT[data.code ?? ''] ?? data.error ?? `Request failed (HTTP ${res.status})`);
  }
  return data as T;
}

// Body of a JSON request
export function jsonBody(method: 'POST' | 'PATCH', body: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
