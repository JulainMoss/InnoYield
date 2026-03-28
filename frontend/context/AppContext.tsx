"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { User } from "@/lib/types";
import { mockApi, MOCK_USER } from "@/lib/mockApi";

interface AppContextValue {
  user: User;
  refreshUser: () => void;
  placeBet: (ideaId: string, position: "YES" | "NO", amount: number) => { success: boolean; message: string };
  buyItem: (itemId: string) => { success: boolean; message: string };
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(MOCK_USER);

  const refreshUser = useCallback(() => {
    setUser(mockApi.getUser());
  }, []);

  const placeBet = useCallback(
    (ideaId: string, position: "YES" | "NO", amount: number) => {
      const result = mockApi.placeBet(ideaId, position, amount);
      if (result.success) {
        setUser(mockApi.getUser());
      }
      return result;
    },
    []
  );

  const buyItem = useCallback((itemId: string) => {
    const result = mockApi.buyItem(itemId);
    if (result.success) {
      setUser(mockApi.getUser());
    }
    return result;
  }, []);

  return (
    <AppContext.Provider value={{ user, refreshUser, placeBet, buyItem }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
