// The only place that calls fetch(). Handles auth header, JSON, and error normalisation.

const TOKEN_KEY = 'ops_token';

// Token persistence (localStorage keeps the user logged in across reloads).
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// Every failure becomes an ApiError, so UI code only needs one catch shape.
// code matches the backend's stable error codes (VERSION_CONFLICT, FORBIDDEN, ...).
export class ApiError extends Error {
  status: number;
  code: string;
  details: unknown;
  requestId?: string;
  constructor(status: number, code: string, message: string, details?: unknown, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

// AuthProvider registers a callback here so any 401 logs the user out centrally.
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn; };

interface Options {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, string | number | undefined>;
}

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  // Build the query string, skipping empty values.
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== '') params.set(k, String(v));
  }
  const qs = params.toString() ? `?${params}` : '';

  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`/api${path}${qs}`, {
      method: opts.method ?? 'GET',
      headers: {
        ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opts.headers,
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    // fetch only throws when the request never reached the server.
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection and retry.');
  }

  const data = await res.json().catch(() => null); // tolerate empty / non-JSON bodies
  if (!res.ok) {
    const e = data?.error;
    // An expired/invalid token anywhere logs the user out (but a bad login is not "expired").
    if (res.status === 401 && path !== '/auth/login') onUnauthorized?.();
    throw new ApiError(res.status, e?.code ?? 'UNKNOWN', e?.message ?? `Request failed (${res.status})`, e?.details, e?.requestId);
  }
  return data as T;
}