import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { API_BASE, setAuthToken, queryClient, setOnUnauthorized } from "@/lib/queryClient";

interface AuthUser {
  id: number;
  username: string;
  name: string;
  role: string;
}

const AuthContext = createContext<{
  user: AuthUser | null;
  loading: boolean;
  login: (user: AuthUser) => void;
  logout: () => Promise<void>;
}>({ user: null, loading: true, login: () => {}, logout: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, check if we have a valid session
  useEffect(() => {
    fetch(`${API_BASE}/api/auth/me`, { credentials: "include" })
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        // C-B2 fix: offload-admin is the admin portal. Vendors/drivers have their own
        // dashboards inside the main customer SPA. Restrict to admin + manager only.
        const allowed = ["admin", "manager"];
        if (data?.user?.id && allowed.includes(data.user.role)) setUser(data.user);
        else if (data?.id && allowed.includes(data.role)) setUser(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { method: "POST", credentials: "include" });
    } catch {}
    setAuthToken(null);
    setUser(null);
    try { queryClient.clear(); } catch {}
  };

  // Global 401 interceptor: server-issued 401 on an authenticated request
  // wipes local state and redirects to login.
  useEffect(() => {
    setOnUnauthorized(() => {
      try {
        setAuthToken(null);
        setUser(null);
        queryClient.clear();
      } finally {
        if (typeof window !== "undefined") {
          const path = window.location.pathname;
          if (path !== "/login" && path !== "/") {
            window.location.href = "/login";
          }
        }
      }
    });
    return () => setOnUnauthorized(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login: (u) => setUser(u),
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
