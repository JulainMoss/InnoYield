"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { User } from "@/lib/types";
import * as api from "@/lib/api";

interface AppContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  placeBet: (ideaId: string, position: "YES" | "NO", amount: number) => Promise<{ success: boolean; message: string }>;
  buyItem: (itemId: string) => Promise<{ success: boolean; message: string }>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const stored = localStorage.getItem("innoyield_token");
    if (stored) {
      setToken(stored);
      api.getMe()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem("innoyield_token");
          setToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const saveToken = (t: string) => {
    localStorage.setItem("innoyield_token", t);
    setToken(t);
  };

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    saveToken(res.access_token);
    const me = await api.getMe();
    setUser(me);
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    const res = await api.register(username, email, password);
    saveToken(res.access_token);
    const me = await api.getMe();
    setUser(me);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("innoyield_token");
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    const me = await api.getMe();
    setUser(me);
  }, [token]);

  const placeBet = useCallback(
    async (ideaId: string, position: "YES" | "NO", amount: number) => {
      try {
        await api.placeBet(ideaId, position, amount);
        const me = await api.getMe();
        setUser(me);
        return { success: true, message: "Zakład postawiony!" };
      } catch (err: unknown) {
        return { success: false, message: err instanceof Error ? err.message : "Błąd" };
      }
    },
    []
  );

  const buyItem = useCallback(async (itemId: string) => {
    try {
      await api.buyItem(itemId);
      const me = await api.getMe();
      setUser(me);
      return { success: true, message: "Zakupiono!" };
    } catch (err: unknown) {
      return { success: false, message: err instanceof Error ? err.message : "Błąd" };
    }
  }, []);

  return (
    <AppContext.Provider value={{ user, token, isLoading, login, register, logout, refreshUser, placeBet, buyItem }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
