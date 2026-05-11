import { QueryClient, QueryFunction } from "@tanstack/react-query";

export const API_BASE = "https://api.offloadusa.com";
let _authToken: string | null = null;

export function setAuthToken(token: string | null) { _authToken = token; }
export function getAuthToken() { return _authToken; }

// Global 401 interceptor for admin SPA. Auth provider registers a handler
// that clears token, clears query cache, and redirects to /login.
type UnauthorizedHandler = () => void;
let _onUnauthorized: UnauthorizedHandler | null = null;

export function setOnUnauthorized(handler: UnauthorizedHandler | null) {
  _onUnauthorized = handler;
}

const UNAUTHORIZED_BYPASS_PATHS = [
  "/api/auth/me",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
];

function shouldBypassUnauthorized(path: string): boolean {
  return UNAUTHORIZED_BYPASS_PATHS.some((p) => path.startsWith(p));
}

function handleUnauthorizedResponse(path: string, status: number) {
  if (status !== 401) return;
  if (shouldBypassUnauthorized(path)) return;
  if (_onUnauthorized) {
    try { _onUnauthorized(); } catch (_) { /* swallow */ }
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  if (_authToken) headers.Authorization = `Bearer ${_authToken}`;
  const res = await fetch(`${API_BASE}${url}`, {
    method,
    credentials: "include",
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (res.status === 401) {
    handleUnauthorizedResponse(url, res.status);
  }
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};
    if (_authToken) headers.Authorization = `Bearer ${_authToken}`;
    const path = queryKey.join("/") as string;
    const res = await fetch(`${API_BASE}${path}`, { credentials: "include", headers });

    if (res.status === 401) {
      if (unauthorizedBehavior === "throw") {
        handleUnauthorizedResponse(path, res.status);
      } else {
        return null;
      }
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
