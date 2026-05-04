import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getSession, clearSession, AuthSession } from '../services/authService';

interface AuthContextValue {
  session: AuthSession | null;
  isLoading: boolean;
  setSession: (session: AuthSession | null) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  isLoading: true,
  setSession: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getSession().then(s => {
      setSessionState(s);
      setIsLoading(false);
    });
  }, []);

  const setSession = (s: AuthSession | null) => setSessionState(s);

  const signOut = async () => {
    await clearSession();
    setSessionState(null);
  };

  return (
    <AuthContext.Provider value={{ session, isLoading, setSession, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
