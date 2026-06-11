'use client';

import type { FunnelEventType } from '@/types/database';

const SESSION_KEY = 'esx_session_id';

// Lazily generated, sessionStorage-scoped UUID. Survives across pages
// in the same tab; resets when the tab closes. (Use localStorage if you
// want persistence across days — sessionStorage matches the "funnel per
// visit" mental model better.)
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    // Private mode / storage blocked — fall back to a per-call ID so
    // we don't crash. The same session will appear as multiple sessions
    // in the dashboard, which is OK.
    return `nostorage_${Date.now().toString(36)}`;
  }
}

export type FunnelEvent = {
  event_type: FunnelEventType;
  service_slug?: string | null;
  step?: number | null;
  payload?: Record<string, unknown>;
};

// Fire-and-forget. Never throws. Uses keepalive so events survive a
// page navigation (e.g. booking_submitted right before the success
// redirect).
export function recordFunnelEvent(event: FunnelEvent): void {
  if (typeof window === 'undefined') return;
  const session_id = getSessionId();
  if (!session_id) return;

  try {
    void fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...event, session_id }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* swallow */
  }
}
