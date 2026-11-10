/* The consult-api client: one fetch wrapper for every call. It adds the signed-in
   user's token, renews an expired patient token once with the refresh token
   (the API rotates it on every refresh), and turns the API's error body into an
   ApiError the screens can read.

   USE_API: the screens call the API only when VITE_API_URL is set (.env). Without
   it the app runs the local demo store as before — kept until both sides of the
   app (patient and doctor) are connected, then the demo paths are removed. */

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") ?? "";
export const USE_API = API_URL !== "";

/** An error the API answered with: status, its error code, the message for people and any details. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly extended?: Record<string, unknown>;
  constructor(status: number, code: string, message: string, extended?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.extended = extended;
  }
}

/* ── Tokens (per tab, like the rest of the session) ─────────────────────── */

export interface PatientTokens {
  access_token: string;
  refresh_token: string;
}
type Stored = { kind: "patient"; access: string; refresh: string } | { kind: "staff"; access: string };

const TOKEN_KEY = "dc-api-tokens";
const read = (): Stored | null => {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
};
const write = (s: Stored | null) => {
  try {
    if (s) sessionStorage.setItem(TOKEN_KEY, JSON.stringify(s));
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage blocked: the session lasts until the tab reloads */
  }
};

export const tokens = {
  setPatient: (t: PatientTokens) => write({ kind: "patient", access: t.access_token, refresh: t.refresh_token }),
  setStaff: (access: string) => write({ kind: "staff", access }),
  refreshToken: () => {
    const s = read();
    return s?.kind === "patient" ? s.refresh : null;
  },
  clear: () => write(null),
};

/** Called when the session can't be renewed (signed out elsewhere, or expired): the app goes to sign-in. */
let onSignedOut: () => void = () => {};
export const setSignedOutHandler = (fn: () => void) => {
  onSignedOut = fn;
};

/* ── Requests ────────────────────────────────────────────────────────────── */

type Query = Record<string, string | number | string[] | undefined | null>;

function url(path: string, query?: Query) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length)) continue;
    qs.set(k, Array.isArray(v) ? v.join(",") : String(v));
  }
  const s = qs.toString();
  return `${API_URL}${path}${s ? `?${s}` : ""}`;
}

async function toError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as { error?: string; info?: string; message?: string; extended?: Record<string, unknown> } | null;
  return new ApiError(res.status, body?.error ?? "ERROR", body?.info || body?.message || `Request failed (${res.status})`, body?.extended);
}

/** One refresh at a time, shared by every request that hit an expired token at once. */
let refreshing: Promise<boolean> | null = null;
function renew(): Promise<boolean> {
  refreshing ??= (async () => {
    const refresh = tokens.refreshToken();
    if (!refresh) return false;
    const res = await fetch(url("/api/patient/auth/refresh"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: refresh }) });
    if (!res.ok) return false;
    const { data } = (await res.json()) as { data: PatientTokens };
    tokens.setPatient(data);
    return true;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export async function api<T>(method: "GET" | "POST" | "PUT", path: string, opts: { body?: unknown; query?: Query; auth?: boolean } = {}): Promise<T> {
  const send = () => {
    const headers: Record<string, string> = {};
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";
    const access = opts.auth === false ? null : read()?.access;
    if (access) headers.Authorization = `Bearer ${access}`;
    return fetch(url(path, opts.query), { method, headers, ...(opts.body === undefined ? {} : { body: JSON.stringify(opts.body) }) });
  };

  let res = await send();
  if (res.status === 401 && opts.auth !== false && read()) {
    if (await renew()) res = await send();
    if (res.status === 401) {
      tokens.clear();
      onSignedOut();
    }
  }
  if (!res.ok) throw await toError(res);
  return ((await res.json()) as { data: T }).data;
}
