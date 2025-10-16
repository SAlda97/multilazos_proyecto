// src/context/AuthContext.tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { loginApi, logoutApi, type AuthUser } from "../services/auth";

type AuthCtx = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx>({
  user: null,
  isAuthenticated: false,
  loading: false,
  login: async () => {},
  logout: async () => {},
});

const LS_KEY = "auth_user";
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<number | null>(null);

  const isAuthenticated = !!user;

  const clearTimer = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = window.setTimeout(async () => {
      await logout();
      alert("Sesión cerrada por inactividad.");
    }, INACTIVITY_TIMEOUT_MS);
  }, []);

  const activityHandler = useCallback(() => {
    if (!isAuthenticated) return;
    startTimer();
  }, [isAuthenticated, startTimer]);

  useEffect(() => {
    // Restaurar sesión de localStorage si existe
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      try {
        const u = JSON.parse(raw) as AuthUser;
        setUser(u);
      } catch {}
    }
  }, []);

  useEffect(() => {
    // evento de actividad para resetear el timer
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach(ev => window.addEventListener(ev, activityHandler));
    return () => { events.forEach(ev => window.removeEventListener(ev, activityHandler)); };
  }, [activityHandler]);

  useEffect(() => {
    // iniciar/limpiar timer al cambiar el estado de autenticación
    if (isAuthenticated) startTimer();
    else clearTimer();
    return () => clearTimer();
  }, [isAuthenticated, startTimer]);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    try {
      const data = await loginApi({ username, password });
      setUser(data);
      localStorage.setItem(LS_KEY, JSON.stringify(data));
      startTimer();
    } catch (err: any) {
      // Mensajes esperados desde backend: "Usuario inactivo", "Credenciales inválidas"
      const msg =
        err?.response?.data || err?.response?.data?.error || err?.message || "No se pudo iniciar sesión";
      throw new Error(typeof msg === "string" ? msg : "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  }, [startTimer]);

  const logout = useCallback(async () => {
    try { await logoutApi(); } catch {}
    setUser(null);
    localStorage.removeItem(LS_KEY);
    clearTimer();
  }, []);

  const value = useMemo(() => ({ user, isAuthenticated, loading, login, logout }), [user, isAuthenticated, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
