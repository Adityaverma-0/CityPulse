import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authApi, type AuthUser } from "./api";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("ch_token"));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) { setIsLoading(false); return; }
    authApi.me()
      .then(setUser)
      .catch(() => { localStorage.removeItem("ch_token"); setToken(null); })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<AuthUser> => {
    const resp = await authApi.login(email, password);
    localStorage.setItem("ch_token", resp.token);
    setToken(resp.token);
    setUser(resp.user);
    return resp.user;
  };

  const register = async (name: string, email: string, password: string, phone?: string): Promise<AuthUser> => {
    const resp = await authApi.register(name, email, password, phone);
    localStorage.setItem("ch_token", resp.token);
    setToken(resp.token);
    setUser(resp.user);
    return resp.user;
  };

  const logout = () => {
    localStorage.removeItem("ch_token");
    setToken(null);
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
