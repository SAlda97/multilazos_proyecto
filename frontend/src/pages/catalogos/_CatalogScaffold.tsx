import { useMemo, useState } from "react";

type Row = { id: number; nombre: string; descripcion?: string };

export type CatalogProps = {
  titulo: string;
  placeholderBusqueda?: string;
  // datos semilla (UI)
  initialData?: Row[];
  // columnas extra (opcional)
  extraColumns?: Array<{
    header: string;
    render: (row: Row) => React.ReactNode;
    alignRight?: boolean;
  }>;
};

export default function CatalogScaffold(props: CatalogProps) {
  const { titulo, placeholderBusqueda = "Buscar...", initialData = [], extraColumns = [] } = props;

  // estado UI
  const [q, setQ] = useState("");
  const [data, setData] = useState<Row[]>(initialData);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<{ nombre: string; descripcion: string }>({ nombre: "", descripcion: "" });

  // filtro texto
  const filtered = useMemo(() => {
    const t = q.toLowerCase().trim();
    if (!t) return data;
    return data.filter(d =>
      [String(d.id), d.nombre, d.descripcion ?? ""].join(" ").toLowerCase().includes(t)
    );
  }, [q, data]);

  // totales visibles
  const totales = useMemo(() => ({ registros: filtered.length }), [filtered]);

  // paginación simple
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);

  function limpiar() { setQ(""); setPage(1); }

  // CRUD sin validaciones (UI)
  function onNew() {
    setEditId(null);
    setForm({ nombre: "", descripcion: "" });
    setOpen(true);
  }
  function onEdit(id: number) {
    const r = data.find(x => x.id === id); if (!r) return;
    setEditId(id);
    setForm({ nombre: r.nombre, descripcion: r.descripcion ?? "" });
    setOpen(true);
  }
  function onDelete(id: number) {
    if (confirm("¿Eliminar registro? (UI)")) setData(arr => arr.filter(x => x.id !== id));
  }
  function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (editId == null) {
      const nextId = Math.max(0, ...data.map(d => d.id)) + 1;
      setData(arr => [...arr, { id: nextId, nombre: form.nombre, descripcion: form.descripcion || undefined }]);
    } else {
      setData(arr => arr.map(d => (d.id === editId ? { ...d, nombre: form.nombre, descripcion: form.descripcion || undefined } : d)));
    }
    setOpen(false);
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {/* Filtros */}
      <div className="card" style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: ".6rem" }}>
        <input className="input" placeholder={placeholderBusqueda} value={q} onChange={e => setQ(e.target.value)} />
        <button className="secondary" onClick={limpiar}>Limpiar</button>
        <button onClick={onNew}>+ Nuevo</button>
      </div>

      {/* Totales */}
      <div className="card" style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <b>{titulo}</b>
        <span style={{ opacity: .7 }}>Registros visibles: <b>{totales.registros}</b></span>
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
              <th style={{ width: 80 }}>ID</th>
              <th>Nombre</th>
              <th>Descripción</th>
              {extraColumns.map((c, i) => <th key={i} style={{ textAlign: c.alignRight ? "right" : undefined }}>{c.header}</th>)}
              <th style={{ width: 220 }}></th>
            </tr>
          </thead>
          <tbody>
            {pageData.map(r => (
              <tr key={r.id}>
                <td>#{r.id}</td>
                <td>{r.nombre}</td>
                <td>{r.descripcion ?? "-"}</td>
                {extraColumns.map((c, i) => <td key={i} style={{ textAlign: c.alignRight ? "right" : undefined }}>{c.render(r)}</td>)}
                <td style={{ display: "flex", gap: ".4rem" }}>
                  <button className="secondary" onClick={() => onEdit(r.id)}>Editar</button>
                  <button className="warn" onClick={() => onDelete(r.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {pageData.length === 0 && (
              <tr><td colSpan={4 + extraColumns.length} style={{ padding: "1rem" }}>Sin registros (UI).</td></tr>
            )}
          </tbody>
        </table>

        {/* Paginación */}
        <div style={{ display: "flex", gap: ".5rem", justifyContent: "flex-end", marginTop: ".8rem" }}>
          <button className="secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
          <div style={{ alignSelf: "center" }}>Página {page} / {totalPages}</div>
          <button className="secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</button>
        </div>
      </div>

      {/* Modal CRUD */}
      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.25)", display: "grid", placeItems: "center", zIndex: 50 }}>
          <form className="card" onSubmit={onSave} style={{ minWidth: 380, width: "min(720px, 95vw)" }}>
            <h3 style={{ marginTop: 0 }}>{editId == null ? "Nuevo registro" : "Editar registro"}</h3>
            <div style={{ display: "grid", gap: ".6rem", gridTemplateColumns: "1fr" }}>
              <div>
                <label>Nombre</label>
                <input className="input" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div>
                <label>Descripción (opcional)</label>
                <input className="input" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: "flex", gap: ".6rem", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button type="button" className="secondary" onClick={() => setOpen(false)}>Cancelar</button>
              <button type="submit">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
