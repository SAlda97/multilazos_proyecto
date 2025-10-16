// frontend/src/auth/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";

type User = {
  id_usuario: number;
  username: string;
  nombre_completo: string;
  activo: boolean;
};

type AuthContextType = {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  //  Tiempo de expiración: 5 minutos
  const SESSION_TIMEOUT = 5 * 60 * 1000;
  let logoutTimer: ReturnType<typeof setTimeout> | null = null;

  const startLogoutTimer = () => {
    if (logoutTimer) clearTimeout(logoutTimer);
    logoutTimer = setTimeout(() => {
      alert("La sesión ha expirado por inactividad.");
      logout();
    }, SESSION_TIMEOUT);
  };

  //  Restaurar sesión desde localStorage si existe
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));

    startLogoutTimer();

    // reiniciar contador si hay actividad
    const resetTimer = () => startLogoutTimer();
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);

    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      if (logoutTimer) clearTimeout(logoutTimer);
    };
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    startLogoutTimer();
    navigate("/rentabilidades", { replace: true });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    if (logoutTimer) clearTimeout(logoutTimer);
    navigate("/login", { replace: true });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
