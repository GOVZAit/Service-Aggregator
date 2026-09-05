import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { PublicUser, UserRole } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

interface AuthContextValue {
  user: PublicUser | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<PublicUser>;
  register: (name: string, identifier: string, password: string, role: UserRole) => Promise<PublicUser>;
  updateProfile: (name: string) => Promise<PublicUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (identifier: string, password: string): Promise<PublicUser> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Ошибка входа");
    await queryClient.cancelQueries();
    queryClient.removeQueries();
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (name: string, identifier: string, password: string, role: UserRole): Promise<PublicUser> => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, identifier, password, role }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Ошибка регистрации");
    await queryClient.cancelQueries();
    queryClient.removeQueries();
    setUser(data.user);
    return data.user;
  }, []);

  const updateProfile = useCallback(async (name: string) => {
    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Не удалось сохранить");
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    await queryClient.cancelQueries();
    queryClient.removeQueries();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
