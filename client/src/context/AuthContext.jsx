import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/api.js';
import { tokenStore } from '../api/http.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  // Restore the session after a reload
  useEffect(() => {
    if (!tokenStore.get()) return;
    api.me().then(setUser).catch(() => tokenStore.clear()).finally(() => setLoading(false));
  }, []);

  const finish = useCallback(({ token, user: u }) => { tokenStore.set(token); setUser(u); return u; }, []);
  const login = useCallback(async (role, body) => finish(await api.login(role, body)), [finish]);
  const register = useCallback(async (role, body) => finish(await api.register(role, body)), [finish]);
  const logout = useCallback(() => { tokenStore.clear(); setUser(null); }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
