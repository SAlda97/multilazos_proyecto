import { useMemo, useState } from "react";

export type Row = { id: number; nombre: string };

export type CatalogProps = {
  titulo: string;
  placeholderBusqueda?: string;

  // === MODO LOCAL (UI) ===
  initialData?: Row[];

  // === MODO CONTROLADO (servidor) ===
  rows?: Row[];                   // si se provee => modo controlado
  totalCount?: number;            // total de registros (servidor)
  page?: number;                  // página actual (servidor)
  pageSize?: number;              // tamaño de página (servidor)
  loading?: boolean;              // loader externo
  onSearch?: (text: string) => void;
  onClear?: () => void;
  onPageChange?: (nextPage: number) => void;
  onEditClick?: (row: Row) => void;     // NUEVO
  onDeleteClick?: (row: Row) => void; 
  onNewClick?: () => void; 

  // columnas extra (opcional)
  extraColumns?: Array<{
    header: string;
    render: (row: Row) => React.ReactNode;
    alignRight?: boolean;
  }>;
};

export default function CatalogScaffold(props: CatalogProps) {
  const {
    titulo,
    placeholderBusqueda = "Buscar...",
    initialData = [],
    rows,
    totalCount,
    page: pageProp,
    pageSize: pageSizeProp = 10,
    loading = false,
    onSearch,
    onClear,
    onPageChange,
    extraColumns = [],
    onEditClick,
    onDeleteClick,
    onNewClick,     
  } = props;

  // detecta modo controlado si vienen rows
  const controlled = Array.isArray(rows);

  // estado (solo para modo local/UI)
  const [q, setQ] = useState("");
  const [data, setData] = useState<Row[]>(initialData);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<{ nombre: string }>({ nombre: "" });

  // filtro texto (solo modo local)
  const filtered = useMemo(() => {
    if (controlled) return rows ?? [];
    const t = q.toLowerCase().trim();
    if (!t) return data;
    return data.filter(d => [String(d.id), d.nombre].join(" ").toLowerCase().includes(t));
  }, [controlled, rows, q, data]);

  // totales
  const registrosVisibles = controlled ? (rows?.length ?? 0) : filtered.length;
  const total = controlled ? (totalCount ?? registrosVisibles) : registrosVisibles;

  // paginación
  const [pageLocal, setPageLocal] = useState(1);
  const page = controlled ? (pageProp ?? 1) : pageLocal;
  const pageSize = pageSizeProp;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const pageData = useMemo(() => {
    // en modo controlado, rows ya es el slice del servidor
    if (controlled) return rows ?? [];
    return filtered.slice((page - 1) * pageSize, page * pageSize);
  }, [controlled, rows, filtered, page, pageSize]);

  function limpiar() {
    if (controlled) onClear?.();
    else {
      setQ("");
      setPageLocal(1);
    }
  }

  // CRUD (solo UI, se reemplazará por backend en pasos siguientes)
  function onNew() {
    setEditId(null);
    setForm({ nombre: "" });
    setOpen(true);
  }
  function onEdit(id: number) {
    const r = (controlled ? rows ?? [] : data).find(x => x.id === id);
    if (!r) return;
    setEditId(id);
    setForm({ nombre: r.nombre });
    setOpen(true);
  }
  function onDelete(id: number) {
    if (confirm("¿Eliminar registro? (UI)")) {
      if (!controlled) setData(arr => arr.filter(x => x.id !== id));
    }
  }
  function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!controlled) {
      if (editId == null) {
        const nextId = Math.max(0, ...data.map(d => d.id)) + 1;
        setData(arr => [...arr, { id: nextId, nombre: form.nombre }]);
      } else {
        setData(arr => arr.map(d => (d.id === editId ? { ...d, nombre: form.nombre } : d)));
      }
    }
    setOpen(false);
  }

  // submit búsqueda
  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (controlled) onSearch?.((e.target as HTMLFormElement).q?.value ?? "");
  }

  const baseColspan = 2 /* ID + Nombre */ + extraColumns.length + 1 /* acciones */;

  function handleEdit(row: Row) {
    if (onEditClick) return onEditClick(row);
    // modo UI local
    onEdit(row.id);
  }
  function handleDelete(row: Row) {
    if (onDeleteClick) return onDeleteClick(row);
    // modo UI local
    onDelete(row.id);
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {/* Filtros */}
      <form
        onSubmit={submitSearch}
        className="card"
        style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: ".6rem" }}
      >
        <input
          name="q"
          className="input"
          placeholder={placeholderBusqueda}
          value={controlled ? undefined : q}
          onChange={controlled ? undefined : e => setQ(e.target.value)}
        />
        <button type="button" className="secondary" onClick={limpiar}>Limpiar</button>
        <button type="submit">Buscar</button>
        <button onClick={() => onNewClick ? onNewClick() : onNew()} style={{ gridColumn: "span 3" }}>
          + Nuevo
        </button>
      </form>
        

      {/* Totales */}
      <div className="card" style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <b>{titulo}</b>
        <span style={{ opacity: .7 }}>
          Registros visibles: <b>{registrosVisibles}</b> / <b>{total}</b>
        </span>
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
              {extraColumns.map((c, i) => (
                <th key={i} style={{ textAlign: c.alignRight ? "right" : undefined }}>{c.header}</th>
              ))}
              <th style={{ width: 220 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={baseColspan} style={{ padding: "1rem" }}>Cargando...</td>
              </tr>
            )}
            {!loading && pageData.map(r => (
              <tr key={r.id}>
                <td>#{r.id}</td>
                <td>{r.nombre}</td>
                {extraColumns.map((c, i) => (
                  <td key={i} style={{ textAlign: c.alignRight ? "right" : undefined }}>{c.render(r)}</td>
                ))}
                <td style={{ display: "flex", gap: ".4rem" }}>
                  <button className="secondary" onClick={() => handleEdit(r)}>Editar</button>
                  <button className="warn" onClick={() => handleDelete(r)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {!loading && pageData.length === 0 && (
              <tr>
                <td colSpan={baseColspan} style={{ padding: "1rem" }}>Sin registros.</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Paginación */}
        <div style={{ display: "flex", gap: ".5rem", justifyContent: "flex-end", marginTop: ".8rem" }}>
          <button
            className="secondary"
            disabled={page <= 1 || loading}
            onClick={() => controlled ? onPageChange?.(page - 1) : setPageLocal(p => Math.max(1, p - 1))}
          >
            Anterior
          </button>
          <div style={{ alignSelf: "center" }}>Página {page} / {totalPages}</div>
          <button
            className="secondary"
            disabled={page >= totalPages || loading}
            onClick={() => controlled ? onPageChange?.(page + 1) : setPageLocal(p => Math.min(totalPages, p + 1))}
          >
            Siguiente
          </button>
        </div>
      </div>

      {/* Modal CRUD (solo UI) */}
      {open && !controlled && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.25)", display: "grid", placeItems: "center", zIndex: 50 }}>
          <form className="card" onSubmit={onSave} style={{ minWidth: 380, width: "min(720px, 95vw)" }}>
            <h3 style={{ marginTop: 0 }}>{editId == null ? "Nuevo registro" : "Editar registro"}</h3>
            <div style={{ display: "grid", gap: ".6rem", gridTemplateColumns: "1fr" }}>
              <div>
                <label>Nombre</label>
                <input className="input" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
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
