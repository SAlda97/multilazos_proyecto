import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { BRAND } from "../config/branding";

type Item = { to: string; label: string };
type Section = { id: string; title: string; items: Item[] };

const SECTIONS: Section[] = [
  {
    id: "analisis",
    title: "Análisis",
    items: [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/rentabilidades", label: "Rentabilidades" },
    ],
  },
  {
    id: "operacion",
    title: "Operación",
    items: [
      { to: "/ventas", label: "Ventas" },
      { to: "/ventas/detalle", label: "Ventas • Detalle" },
      { to: "/clientes", label: "Clientes" },
      { to: "/productos", label: "Productos" },
      { to: "/gastos", label: "Gastos" },
    ],
  },
  {
    id: "cartera",
    title: "Cartera",
    items: [
      { to: "/pagos", label: "Pagos de clientes" },
      { to: "/cuotas", label: "Cuotas de crédito" },
      { to: "/estado-cuotas", label: "Estado de cuotas" },
    ],
  },
  {
    id: "catalogos",
    title: "Catálogos",
    items: [
      { to: "/catalogos/tipo-clientes", label: "Tipos de cliente" },
      { to: "/catalogos/categoria-productos", label: "Categorías de producto" },
      { to: "/catalogos/tipo-transacciones", label: "Tipos de transacción" },
      { to: "/catalogos/categoria-gastos", label: "Categorías de gastos" },
    ],
  },
  {
    id: "seguridad",
    title: "Seguridad",
    items: [
      { to: "/seguridad/usuarios", label: "Usuarios" },
      { to: "/seguridad/roles", label: "Roles" },
      { to: "/seguridad/permisos", label: "Permisos" },
    ],
  },
  {
    id: "auditoria",
    title: "Auditoría",
    items: [{ to: "/bitacora-ventas", label: "Bitácora de ventas" }],
  },
];

export default function Sidebar() {
  // estado de secciones abiertas (persistido)
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const raw = localStorage.getItem("sidebar.open");
    if (raw) setOpen(JSON.parse(raw));
    else {
      // por defecto, abre "Análisis" y "Operación"
      setOpen({ analisis: true, operacion: true });
    }
  }, []);

  useEffect(() => {
    if (Object.keys(open).length) {
      localStorage.setItem("sidebar.open", JSON.stringify(open));
    }
  }, [open]);

  const toggle = (id: string) => setOpen((s) => ({ ...s, [id]: !s[id] }));

  return (
    <div className="sidebar" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Logo */}
      <div
        style={{
          padding: "1rem",
          borderBottom: "1px solid var(--grey-200)",
          display: "flex",
          alignItems: "center",
          gap: ".75rem",
        }}
      >
        <img
          src={BRAND.LOGO_URL}
          alt={BRAND.LOGO_ALT}
          height={10}
          style={{ display: "block", height: 220, width: "auto", objectFit: "contain" }}
          onError={(e) => {
            (e.currentTarget.style.display = "none");
            const sibling = e.currentTarget.nextElementSibling as HTMLElement | null;
            if (sibling) sibling.style.display = "block";
          }}
        />
        <div style={{ display: "none" }}>
          <div className="brand">{BRAND.LOGO_ALT}</div>
          <div style={{ fontSize: ".85rem", color: "var(--grey-600)" }}>{BRAND.TAGLINE}</div>
        </div>
      </div>

      {/* Navegación */}
      <nav style={{ paddingTop: ".5rem" }}>
        {SECTIONS.map((sec) => (
          <div key={sec.id} style={{ marginBottom: ".25rem" }}>
            <button
              type="button"
              onClick={() => toggle(sec.id)}
              className="ghost section-title"
              style={{
                width: "100%",
                textAlign: "left",
                fontWeight: 600,
                padding: ".5rem 1rem",
              }}
            >
              {open[sec.id] ? "▾" : "▸"} {sec.title}
            </button>


            {open[sec.id] && (
              <div style={{ padding: "0 .5rem .25rem .75rem" }}>
                {sec.items.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                    style={{ display: "block" }}
                  >
                    ▸ {l.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div style={{ marginTop: "auto", padding: "1rem" }}>
        <button className="ghost" style={{ width: "100%" }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
