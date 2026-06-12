// Cross-origin POST guard for /api — pure logic shared by middleware.ts
// and the self-test. Edge-safe: no node imports, no env.

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Server-to-server callers that can never satisfy a same-origin check.
 * Razorpay webhooks carry no Origin header (and must keep working even
 * if one ever appears) — they authenticate with an HMAC signature
 * instead (X-Razorpay-Signature, verified in the route).
 */
export const CSRF_EXEMPT_API_PATHS = ['/api/payments/webhook'] as const;

export function isCsrfExempt(pathname: string): boolean {
  return (CSRF_EXEMPT_API_PATHS as readonly string[]).includes(pathname);
}

/**
 * True when the request must be rejected (403). Browsers always attach
 * an Origin header to cross-origin POSTs — reject mutating requests
 * whose Origin matches neither the request host nor the Host header.
 * Requests without an Origin (curl, webhooks, server-to-server,
 * same-origin GET) pass through; routes still do their own auth.
 */
export function isCrossOriginForbidden(req: {
  method: string;
  pathname: string;
  origin: string | null;
  requestHost: string;
  hostHeader: string | null;
}): boolean {
  if (!req.pathname.startsWith('/api')) return false;
  if (SAFE_METHODS.has(req.method)) return false;
  if (isCsrfExempt(req.pathname)) return false;
  if (!req.origin) return false;

  let originHost: string | null = null;
  try {
    originHost = new URL(req.origin).host;
  } catch {
    // malformed Origin → treat as mismatch
  }
  return originHost !== req.requestHost && originHost !== req.hostHeader;
}
