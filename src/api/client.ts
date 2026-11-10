/* The one way the app talks to consult-api. Adds the staff token, sends and reads
   JSON, unwraps `{ success, data }`, and turns any error reply into an ApiError
   carrying the server's message and code. */

import { useSession } from "@/store/session-store";

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "http://localhost:3003";

export class ApiError extends Error {
  readonly status: number;
  /** The server's machine-readable reason, e.g. ACCOUNT_LOCKED, TOKEN_REVOKED, PASSWORD_CHANGE_REQUIRED. */
  readonly code?: string;
  readonly extended?: Record<string, unknown>;

  constructor(status: number, message: string, code?: string, extended?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.extended = extended;
  }

  /** The session is no longer good: signed out, deactivated, role changed or password reset elsewhere. */
  get endsSession() {
    return this.status === 401 || this.code === "ACCOUNT_INACTIVE";
  }
}

type Method = "GET" | "POST" | "PATCH";

export async function api<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const token = useSession.getState().staffToken;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }

  const json = (await res.json().catch(() => null)) as
    | { success: true; data: T }
    | { error?: string; message?: string; info?: string; extended?: Record<string, unknown> }
    | null;

  if (!res.ok || !json || !("success" in json)) {
    const err = (json ?? {}) as { error?: string; message?: string; info?: string; extended?: Record<string, unknown> };
    const code = typeof err.extended?.code === "string" ? err.extended.code : err.error;
    throw new ApiError(res.status, err.info || err.message || `Request failed (${res.status})`, code, err.extended);
  }
  return json.data;
}
