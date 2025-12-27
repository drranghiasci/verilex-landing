import { createContext, useContext } from 'react';
import { useFirmContext, type FirmContextState } from '@/lib/useFirmContext';

type FirmContextValue = {
  state: FirmContextState;
  refresh: () => Promise<void>;
};

const FirmContext = createContext<FirmContextValue | null>(null);

export function FirmProvider({ children }: { children: React.ReactNode }) {
  const { state, refresh } = useFirmContext();
  return (
    <FirmContext.Provider value={{ state, refresh }}>
      {children}
    </FirmContext.Provider>
  );
}

export function useFirm() {
  const ctx = useContext(FirmContext);
  if (!ctx) {
    throw new Error('useFirm must be used within FirmProvider');
  }
  return ctx;
}
