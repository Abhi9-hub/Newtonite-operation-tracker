// Holds the logged-in user's profile (including per-team roles) for the whole app.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, setUnauthorizedHandler, tokenStore } from '../api/client';
import type { Profile, Role } from '../api/types';

interface AuthState {
  profile: Profile | null;
  loading: boolean; // true while restoring a session on page load
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  roleIn: (teamId: string) => Role | null; // UI hint only; the server enforces permissions
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(!!tokenStore.get());

  // Logging out also wipes the query cache so the next user never sees the previous user's data.
  const logout = useCallback(() => {
    tokenStore.clear();
    setProfile(null);
    qc.clear();
  }, [qc]);

  // Any 401 from the API (expired token, deactivated user) logs out centrally.
  useEffect(() => { setUnauthorizedHandler(logout); }, [logout]);

  // Restore the session on page load if a token exists.
  useEffect(() => {
    if (!tokenStore.get()) return;
    api<Profile>('/auth/me')
      .then(setProfile)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{ token: string }>('/auth/login', { method: 'POST', body: { email, password } });
    tokenStore.set(res.token);
    setProfile(await api<Profile>('/auth/me'));
  }, []);

  const value = useMemo<AuthState>(() => ({
    profile,
    loading,
    login,
    logout,
    roleIn: (teamId) => profile?.memberships.find((m) => m.teamId === teamId)?.role ?? null,
  }), [profile, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const c = useContext(AuthContext);
  if (!c) throw new Error('useAuth must be used inside AuthProvider');
  return c;
}