/**
 * The single place a network call leaves this app.
 *
 * Tokens are short-lived and refreshed once per 401; a second failure sends the
 * user to login rather than looping. The same access token is what carries a
 * student across to the AI platform, so it is never written to localStorage —
 * it lives in memory, with the refresh token in an httpOnly cookie.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Which school this is.
 *
 * In production the server reads it off the host — `mwenge.beyondschools.co.tz`
 * is Mwenge — and this is empty. On a developer's machine there is no
 * subdomain to read, so `VITE_SCHOOL_SUBDOMAIN` names one and the server
 * accepts it from this header instead. It is not a credential: it chooses which
 * school's login page you are looking at, and every row behind it still
 * belongs to whoever the token says you are.
 */
const SUBDOMAIN: string | undefined = import.meta.env.VITE_SCHOOL_SUBDOMAIN;

const schoolHeader = (): Record<string, string> =>
  SUBDOMAIN ? { 'X-School-Subdomain': SUBDOMAIN } : {};

let accessToken: string | null = null;
let refreshing: Promise<boolean> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
    readonly body?: unknown,
  ) {
    super(detail);
    this.name = 'ApiError';
  }
}

async function refresh(): Promise<boolean> {
  refreshing ??= fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: schoolHeader(),
  })
    .then(async (res) => {
      if (!res.ok) return false;
      const data = (await res.json()) as { access_token: string };
      accessToken = data.access_token;
      return true;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/**
 * The message out of a FastAPI error body.
 *
 * `detail` is a sentence for the errors this app raises on purpose, and a list
 * of field objects for a 422 the framework raised. Stringifying the second kind
 * gives "[object Object]" on screen, which is how a bursar ends up ringing the
 * office about an error nobody can reproduce.
 */
function detailOf(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || !('detail' in body)) return null;
  const detail: unknown = body.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item: unknown) =>
        typeof item === 'object' && item !== null && 'msg' in item ? String(item.msg) : null,
      )
      .filter((message): message is string => message !== null);
    if (messages.length > 0) return messages.join('. ');
  }
  return null;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const send = (): Promise<Response> =>
    fetch(`${BASE_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...schoolHeader(),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...init.headers,
      },
    });

  let res = await send();

  if (res.status === 401 && (await refresh())) {
    res = await send();
  }

  if (!res.ok) {
    const body: unknown = await res.json().catch(() => undefined);
    throw new ApiError(res.status, detailOf(body) ?? res.statusText, body);
  }

  // A 204 carries no body, and calling .json() on one throws.
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}
