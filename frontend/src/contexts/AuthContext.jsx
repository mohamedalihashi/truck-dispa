import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, clearSession, loadSession, saveSession } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const existing = loadSession();
  const [user, setUser] = useState(existing?.user || null);
  const [token, setToken] = useState(existing?.token || null);
  const [booting, setBooting] = useState(Boolean(existing?.token));

  useEffect(() => {
    if (!token) {
      setBooting(false);
      return;
    }
    api
      .me()
      .then((res) => setUser(res.user))
      .catch(() => {
        clearSession();
        setUser(null);
        setToken(null);
      })
      .finally(() => setBooting(false));
  }, [token]);

  const value = useMemo(
    () => ({
      user,
      token,
      booting,
      isAuthenticated: Boolean(user && token),
      async login(payload) {
        const result = await api.login(payload);
        saveSession(result);
        setUser(result.user);
        setToken(result.token);
        return result;
      },
      async register(payload) {
        const result = await api.register(payload);
        saveSession(result);
        setUser(result.user);
        setToken(result.token);
        return result;
      },
      logout() {
        clearSession();
        setUser(null);
        setToken(null);
      },
      async refreshUser() {
        const result = await api.me();
        const session = loadSession();
        if (session?.token) {
          saveSession({ token: session.token, user: result.user });
        }
        setUser(result.user);
        return result.user;
      }
    }),
    [user, token, booting]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
