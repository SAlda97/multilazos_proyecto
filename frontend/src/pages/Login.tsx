// src/pages/Login.tsx
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

export default function Login() {
  const { login, loading } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState<string | null>(null);

  const from = (loc.state as any)?.from || "/";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(form.username.trim(), form.password);
      nav(from, { replace: true });
    } catch (err: any) {
      const msg = err?.message || "No se pudo iniciar sesión";
      setError(msg);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      padding: "1rem"
    }}>
      <form className="card" onSubmit={onSubmit} style={{ width: "min(400px, 95vw)", display:"grid", gap: ".8rem" }}>
        <div style={{textAlign:"center", marginBottom:".2rem"}}>
          <img
            src="/logo_multilazos.jpg"
            alt="Multilazos"
            style={{ width:"120px", height:"auto", objectFit:"contain", marginBottom:".5rem", borderRadius:"8px" }}
          />
          <h2 style={{margin:"0 0 .2rem 0"}}>Iniciar sesión</h2>
          <div style={{opacity:.7, fontSize:".95rem"}}>Bienvenido a Multilazos</div>
        </div>

        <div>
          <label>Usuario</label>
          <input
            className="input"
            value={form.username}
            onChange={e=>setForm({...form, username:e.target.value})}
            autoFocus
            placeholder="Tu usuario"
          />
        </div>

        <div>
          <label>Contraseña</label>
          <input
            className="input"
            type="password"
            value={form.password}
            onChange={e=>setForm({...form, password:e.target.value})}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="badge warn" style={{justifySelf:"start"}}>
            {error}
          </div>
        )}

        <div style={{display:"flex", gap:".6rem", justifyContent:"flex-end", marginTop:".2rem"}}>
          <button type="submit" disabled={loading}>
            {loading ? "Ingresando…" : "Entrar"}
          </button>
        </div>

        <div style={{opacity:.6, fontSize:".85rem", textAlign:"center"}}>
          La sesión se cerrará automáticamente tras 5 minutos de inactividad.
        </div>
      </form>
    </div>
  );
}
