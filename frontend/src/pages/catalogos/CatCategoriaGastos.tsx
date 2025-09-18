import { useEffect, useMemo, useState } from "react";
import CatalogScaffold, { type Row } from "./_CatalogScaffold";
import {
  listCategoriaGastos,
  createCategoriaGasto,
  updateCategoriaGasto,
  deleteCategoriaGasto,
} from "../../services/categoriaGastos";
import type { CategoriaGasto } from "../../types/categoriaGastos";

export default function CatCategoriaGastos() {
  const [rows, setRows] = useState<Row[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  // modal (crear/editar)
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<{ nombre: string }>({ nombre: "" });
  const [saving, setSaving] = useState(false);

  const pageSize = 10;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(count / pageSize)), [count]);

  async function load(p = page, query = q) {
    setLoading(true);
    try {
      const res = await listCategoriaGastos({ page: p, page_size: pageSize, search: query || undefined });
      const mapped: Row[] = res.results.map((g: CategoriaGasto) => ({
        id: g.id_categoria_gastos,
        nombre: g.nombre_categoria,
      }));
      setRows(mapped);
      setCount(res.count);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1, q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // NUEVO
  function onNewClick() {
    setEditId(null);
    setForm({ nombre: "" });
    setOpen(true);
  }

  // EDITAR
  function onEditClick(row: Row) {
    const r = rows.find((x) => x.id === row.id);
    if (!r) return;
    setEditId(r.id);
    setForm({ nombre: r.nombre });
    setOpen(true);
  }

  // ELIMINAR
  async function onDeleteClick(row: Row) {
    const r = rows.find((x) => x.id === row.id);
    if (!r) return;
    const ok = confirm(`¿Eliminar la categoría de gasto "${r.nombre}"?`);
    if (!ok) return;
    try {
      setLoading(true);
      await deleteCategoriaGasto(r.id);
      const nextPage = rows.length === 1 && page > 1 ? page - 1 : page;
      await load(nextPage, q);
    } finally {
      setLoading(false);
    }
  }

  // GUARDAR
  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm("¿Desea guardar los cambios?")) return;

    const nombre = form.nombre.trim();
    if (!nombre) {
      alert("El nombre es obligatorio.");
      return;
    }
    if (nombre.length > 100) {
      alert("El nombre no puede exceder 100 caracteres.");
      return;
    }

    try {
      setSaving(true);
      if (editId == null) {
        await createCategoriaGasto(nombre);
        await load(1, q);   // tras crear, volver a página 1
      } else {
        await updateCategoriaGasto(editId, nombre);
        await load(page, q); // tras editar, recargar misma página
      }
      setOpen(false);
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <CatalogScaffold
        titulo="Catálogo: Categorías de gasto"
        placeholderBusqueda="Buscar categoría de gasto..."
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
        extraColumns={[]}
        // Exportar PDF (confirmación ya la maneja el Scaffold)
        exportPdf={{
          filename: "categorias-de-gasto.pdf",
          headers: ["ID", "Nombre"],
          mapRow: (r) => [r.id, r.nombre],
          footerNote: "Exportado desde Multilazos • Catálogo de categorías de gasto",
          confirm: true,
          confirmMessage: "¿Desea exportar el PDF de Categorías de gasto (página visible)?",
        }}
      />

      {/* Modal NUEVO/EDITAR */}
      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.25)", display: "grid", placeItems: "center", zIndex: 50 }}>
          <form className="card" onSubmit={onSave} style={{ minWidth: 420, width: "min(720px, 95vw)" }}>
            <h3 style={{ marginTop: 0 }}>{editId == null ? "Nueva categoría de gasto" : "Editar categoría de gasto"}</h3>

            <div style={{ display: "grid", gap: ".8rem", gridTemplateColumns: "1fr" }}>
              <div>
                <label>Nombre</label>
                <input
                  className="input"
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
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
