import { createContext, useContext, useState, type ReactNode } from "react";

interface AuthUser {
  id: number;
  username: string;
  name: string;
  role: string;
}

const AuthContext = createContext<{
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
}>({ user: null, login: () => {}, logout: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        login: (u) => setUser(u),
        logout: () => setUser(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
