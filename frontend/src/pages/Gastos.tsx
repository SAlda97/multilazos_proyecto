import { useMemo, useState } from "react";
import EmptyState from "../components/EmptyState";

/** Modelos alineados al script:
 *  - gastos: id_gasto, nombre_gasto, monto_gasto, id_fecha, id_categoria_gastos
 *  - categoria_gastos: id_categoria_gastos, nombre_categoria
 *  - dim_fecha: usaremos date ISO para la UI; backend mapeará a id_fecha
 */

type TGasto = {
  id: number;
  nombre: string;
  monto: number;           // Q
  fecha: string;           // ISO yyyy-mm-dd (UI)
  idCategoria: number;
  categoria: string;       // denormalizado para UI
};

type TFiltroRango = { desde: string; hasta: string };

function validar(g: Omit<TGasto, "id" | "categoria">) {
  const e: Record<string, string> = {};
  if (!g.nombre.trim()) e.nombre = "Nombre obligatorio.";
  if (g.monto <= 0) e.monto = "El monto debe ser > 0.";
  if (!g.fecha) e.fecha = "Fecha obligatoria.";
  if (!g.idCategoria) e.idCategoria = "Seleccione la categoría.";
  return e;
}

export default function Gastos() {
  // Estado de datos (solo UI)
  const [data, setData] = useState<TGasto[]>([]);
  const [categorias, setCategorias] = useState<{ id: number; nombre: string }[]>(
    [] // cuando haya backend vendrán de /api/categoria_gastos
  );

  // Filtros
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<number | 0>(0);
  const [rango, setRango] = useState<TFiltroRango>({ desde: "", hasta: "" });

  // Modal CRUD
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<TGasto, "id" | "categoria">>({
    nombre: "",
    monto: 0,
    fecha: "",
    idCategoria: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const catIndex = useMemo(() => {
    const idx = new Map<number, string>();
    categorias.forEach((c) => idx.set(c.id, c.nombre));
    return idx;
  }, [categorias]);

  const filtered = useMemo(() => {
    return data.filter((g) => {
      const t = [g.nombre, g.categoria, g.fecha, `Q${g.monto.toFixed(2)}`]
        .join(" ")
        .toLowerCase();
      const okTexto = t.includes(q.toLowerCase());
      const okCat = !cat || g.idCategoria === cat;
      const okDesde = !rango.desde || g.fecha >= rango.desde;
      const okHasta = !rango.hasta || g.fecha <= rango.hasta;
      return okTexto && okCat && okDesde && okHasta;
    });
  }, [data, q, cat, rango]);

  // Totales por la selección visible
  const totalVisible = filtered.reduce((acc, g) => acc + g.monto, 0);

  // Paginación simple
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = useMemo(() => {
    const i = (page - 1) * pageSize;
    return filtered.slice(i, i + pageSize);
  }, [filtered, page]);

  function limpiar() {
    setQ("");
    setCat(0);
    setRango({ desde: "", hasta: "" });
    setPage(1);
  }

  // CRUD (UI)
  function onNew() {
    setEditId(null);
    setForm({ nombre: "", monto: 0, fecha: "", idCategoria: 0 });
    setErrors({});
    setOpen(true);
  }
  function onEdit(id: number) {
    const g = data.find((x) => x.id === id);
    if (!g) return;
    setEditId(id);
    setForm({
      nombre: g.nombre,
      monto: g.monto,
      fecha: g.fecha,
      idCategoria: g.idCategoria,
    });
    setErrors({});
    setOpen(true);
  }
  function onDelete(id: number) {
    if (confirm("¿Eliminar gasto? (UI)")) setData((d) => d.filter((x) => x.id !== id));
  }
  function onSave(e: React.FormEvent) {
    e.preventDefault();
    const v = validar(form);
    setErrors(v);
    if (Object.keys(v).length) return;

    const nomCat = catIndex.get(form.idCategoria) || "Sin categoría";
    if (editId == null) {
      const next = Math.max(0, ...data.map((x) => x.id)) + 1;
      setData((d) => [...d, { id: next, categoria: nomCat, ...form }]);
    } else {
      setData((d) =>
        d.map((x) => (x.id === editId ? { id: editId, categoria: nomCat, ...form } : x))
      );
    }
    setOpen(false);
  }

  // Para evidencia UI: seed pequeño de categorías si está vacío
  function seedCategoriasUI() {
    if (categorias.length) return;
    setCategorias([
      { id: 1, nombre: "Logística" },
      { id: 2, nombre: "Servicios" },
      { id: 3, nombre: "Operación" },
      { id: 4, nombre: "Marketing" },
    ]);
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {/* Filtros */}
      <div
        className="card"
        style={{ display: "grid", gap: ".7rem", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr" }}
      >
        <input
          className="input"
          placeholder="Buscar por nombre, categoría…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="select"
          value={cat}
          onChange={(e) => setCat(Number(e.target.value))}
          onFocus={seedCategoriasUI}
        >
          <option value={0}>Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
        <input
          className="input"
          type="date"
          value={rango.desde}
          onChange={(e) => setRango((r) => ({ ...r, desde: e.target.value }))}
        />
        <input
          className="input"
          type="date"
          value={rango.hasta}
          onChange={(e) => setRango((r) => ({ ...r, hasta: e.target.value }))}
        />
        <div style={{ display: "flex", gap: ".5rem" }}>
          <button className="secondary" onClick={limpiar} style={{ width: "100%" }}>
            Limpiar
          </button>
          <button onClick={onNew} style={{ width: "100%" }}>
            + Nuevo Gasto
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="card" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <div style={{ fontWeight: 600 }}>Gastos visibles:</div>
        <div>
          <span>Total:</span>{" "}
          <span style={{ fontWeight: 700 }}>Q {totalVisible.toFixed(2)}</span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: ".5rem" }}>
          <button className="secondary">Exportar CSV (UI)</button>
          <button className="secondary">Imprimir (UI)</button>
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th style={{ textAlign: "right" }}>Monto (Q)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((g) => (
              <tr key={g.id}>
                <td>{g.fecha}</td>
                <td>{g.nombre}</td>
                <td>{g.categoria}</td>
                <td style={{ textAlign: "right" }}>Q {g.monto.toFixed(2)}</td>
                <td style={{ display: "flex", gap: ".4rem" }}>
                  <button className="secondary" onClick={() => onEdit(g.id)}>
                    Editar
                  </button>
                  <button className="warn" onClick={() => onDelete(g.id)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {pageData.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    title="Aún no hay gastos"
                    subtitle="Registra tu primer gasto para verlo aquí. Al conectar el backend, se listarán desde SQL Server."
                    actionLabel="+ Nuevo Gasto"
                    onAction={onNew}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Paginación */}
        <div style={{ display: "flex", gap: ".5rem", justifyContent: "flex-end", marginTop: ".8rem" }}>
          <button className="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </button>
          <div style={{ alignSelf: "center" }}>Página {page} / {totalPages}</div>
          <button className="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Siguiente
          </button>
        </div>
      </div>

      {/* Modal CRUD */}
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.25)",
            display: "grid",
            placeItems: "center",
            zIndex: 50,
          }}
        >
          <form className="card" onSubmit={onSave} style={{ minWidth: 360, width: "min(560px,95vw)" }}>
            <h3 style={{ marginTop: 0 }}>{editId == null ? "Nuevo Gasto" : "Editar Gasto"}</h3>
            <div style={{ display: "grid", gap: ".6rem", gridTemplateColumns: "1fr 1fr" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label>Nombre*</label>
                <input
                  className="input"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
                {errors.nombre && <div style={{ color: "crimson", fontSize: ".85rem" }}>{errors.nombre}</div>}
              </div>
              <div>
                <label>Monto (Q)*</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.monto}
                  onChange={(e) => setForm({ ...form, monto: Number(e.target.value) })}
                />
                {errors.monto && <div style={{ color: "crimson", fontSize: ".85rem" }}>{errors.monto}</div>}
              </div>
              <div>
                <label>Fecha*</label>
                <input
                  className="input"
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                />
                {errors.fecha && <div style={{ color: "crimson", fontSize: ".85rem" }}>{errors.fecha}</div>}
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label>Categoría*</label>
                <select
                  className="select"
                  value={form.idCategoria}
                  onChange={(e) => setForm({ ...form, idCategoria: Number(e.target.value) })}
                  onFocus={seedCategoriasUI}
                >
                  <option value={0}>Seleccione…</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
                {errors.idCategoria && (
                  <div style={{ color: "crimson", fontSize: ".85rem" }}>{errors.idCategoria}</div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: ".6rem", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button type="button" className="secondary" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button type="submit">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
