import { useEffect, useMemo, useState } from "react";
import CatalogScaffold, { Row } from "./_CatalogScaffold";
import { fetchTipoClientes, createTipoCliente, updateTipoCliente, deleteTipoCliente } from "../../services/tipoClientes";
import { TipoCliente } from "../../types/tipoClientes";

type RowExt = Row & { tasa: number };

export default function CatTipoClientes() {
  const [rows, setRows] = useState<RowExt[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  // modal (crear/editar)
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<{ nombre: string; tasa: string }>({ nombre: "", tasa: "" });
  const [saving, setSaving] = useState(false);

  const pageSize = 10;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(count / pageSize)), [count]);

  async function load(p = page, query = q) {
    setLoading(true);
    try {
      const res = await fetchTipoClientes({ page: p, page_size: pageSize, q: query || undefined });
      const mapped: RowExt[] = res.results.map((t: TipoCliente) => ({
        id: t.id_tipo_cliente,
        nombre: t.nombre_tipo_cliente,
        tasa: Number(t.tasa_interes_default),
      }));
      setRows(mapped);
      setCount(res.count);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(1, q); }, []);

  // Abrir modal NUEVO
  function onNewClick() {
    setEditId(null);
    setForm({ nombre: "", tasa: "" });
    setOpen(true);
  }

  // Abrir modal EDITAR
  function onEditClick(row: Row) {
    const r = rows.find(x => x.id === row.id);
    if (!r) return;
    setEditId(r.id);
    setForm({ nombre: r.nombre, tasa: r.tasa.toString() });
    setOpen(true);
  }

  // Eliminar
  async function onDeleteClick(row: Row) {
    const r = rows.find(x => x.id === row.id);
    if (!r) return;
    const ok = confirm(`¿Eliminar el tipo de cliente "${r.nombre}"?`);
    if (!ok) return;
    try {
      setLoading(true);
      await deleteTipoCliente(r.id);
      const nextPage = rows.length === 1 && page > 1 ? page - 1 : page;
      await load(nextPage, q);
    } finally {
      setLoading(false);
    }
  }

  // Guardar (crear/editar)
  async function onSave(e: React.FormEvent) {
    e.preventDefault();

    // Confirmación antes de guardar (como pediste en el paso anterior)
    if (!confirm("¿Desea guardar los cambios?")) return;

    const nombre = form.nombre.trim();
    const tasaNum = Number(form.tasa);
    if (!nombre) { alert("El nombre es obligatorio."); return; }
    if (Number.isNaN(tasaNum) || tasaNum < 0) { alert("La tasa de interés debe ser un número ≥ 0."); return; }

    try {
      setSaving(true);
      if (editId == null) {
        // CREAR
        await createTipoCliente({
          nombre_tipo_cliente: nombre,
          tasa_interes_default: tasaNum,
        });
        // después de crear, siempre cargamos la página 1 para ver el nuevo primero o mantén criterio propio:
        await load(1, q);
      } else {
        // EDITAR
        await updateTipoCliente(editId, {
          nombre_tipo_cliente: nombre,
          tasa_interes_default: tasaNum,
        });
        await load(page, q);
      }
      setOpen(false);
    } catch (err: any) {
      alert(err?.message || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <CatalogScaffold
        titulo="Catálogo: Tipos de cliente"
        placeholderBusqueda="Buscar tipo de cliente..."
        rows={rows}
        totalCount={count}
        page={page}
        pageSize={pageSize}
        loading={loading}
        onSearch={(text) => { setQ(text); load(1, text); }}
        onClear={() => { setQ(""); load(1, ""); }}
        onPageChange={(next) => {
          if (next < 1 || next > totalPages) return;
          load(next, q);
        }}
        onNewClick={onNewClick}
        onEditClick={onEditClick}
        onDeleteClick={onDeleteClick}
        extraColumns={[
          {
            header: "Tasa interés (%)",
            alignRight: true,
            render: (r) => (r as RowExt).tasa.toFixed(2),
          },
        ]}
      />

      {/* Modal NUEVO/EDITAR */}
      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.25)", display: "grid", placeItems: "center", zIndex: 50 }}>
          <form className="card" onSubmit={onSave} style={{ minWidth: 420, width: "min(720px, 95vw)" }}>
            <h3 style={{ marginTop: 0 }}>{editId == null ? "Nuevo tipo de cliente" : "Editar tipo de cliente"}</h3>

            <div style={{ display: "grid", gap: ".8rem", gridTemplateColumns: "1fr 220px" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label>Nombre</label>
                <input
                  className="input"
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                />
              </div>

              <div style={{ maxWidth: 260 }}>
                <label>Tasa interés (%)</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.tasa}
                  onChange={e => setForm(f => ({ ...f, tasa: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: ".6rem", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button type="button" className="secondary" onClick={() => setOpen(false)} disabled={saving}>Cancelar</button>
              <button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
