import { createContext, useContext, useState, ReactNode } from "react";

type AppContextType = {
  hasVault: boolean;
  setHasVault: (v: boolean) => void;
  refresh: () => void;
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [hasVault, setHasVault] = useState(false);

  const refresh = () => {
    // just trigger re-check manually later
    setHasVault((v) => v); // no-op trigger
  };

  return (
    <AppContext.Provider value={{ hasVault, setHasVault, refresh }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("AppContext missing");
  return ctx;
}
