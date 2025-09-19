import { useEffect, useMemo, useState } from "react";
import CatalogScaffold, { type Row } from "./catalogos/_CatalogScaffold";
import { listProductos, createProducto, updateProducto, deleteProducto } from "../services/productos";
import { listCategoriaProductos } from "../services/categoriaProductos";
import type { Producto } from "../types/productos";
import type { CategoriaProducto } from "../types/categoriaProductos";

type RowExt = Row & { categoria: string; precio: number; costo: number };

export default function Productos() {
  const [rows, setRows] = useState<RowExt[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  // categorías para el combo
  const [categorias, setCategorias] = useState<CategoriaProducto[]>([]);

  // modal (crear/editar)
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<{
    nombre: string;
    precio: string;
    costo: string;
    id_categoria: string;
  }>({ nombre: "", precio: "", costo: "", id_categoria: "" });
  const [saving, setSaving] = useState(false);

  const pageSize = 10;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(count / pageSize)), [count]);

  async function loadCategorias() {
    // Traemos muchas para el combo; ajusta si lo prefieres paginado
    const res = await listCategoriaProductos({ page: 1, page_size: 1000 });
    setCategorias(res.results);
  }

  async function load(p = page, query = q) {
    setLoading(true);
    try {
      const res = await listProductos({
        page: p,
        page_size: pageSize,
        search: query || undefined,
      });
      const mapped: RowExt[] = res.results.map((prod: Producto) => ({
        id: prod.id_producto,
        nombre: prod.nombre_producto,
        categoria: prod.nombre_categoria || "",
        precio: Number(prod.precio_unitario),
        costo: Number(prod.costo_unitario),
      }));
      setRows(mapped);
      setCount(res.count);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategorias();
    load(1, q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // NUEVO
  function onNewClick() {
    setEditId(null);
    setForm({ nombre: "", precio: "", costo: "", id_categoria: "" });
    setOpen(true);
  }

  // EDITAR
  function onEditClick(row: Row) {
    const r = rows.find((x) => x.id === row.id) as RowExt | undefined;
    if (!r) return;
    const cat = categorias.find((c) => c.nombre_categoria === r.categoria);
    setEditId(r.id);
    setForm({
      nombre: r.nombre,
      precio: r.precio.toString(),
      costo: r.costo.toString(),
      id_categoria: (cat?.id_categoria ?? "").toString(),
    });
    setOpen(true);
  }

  // ELIMINAR
  async function onDeleteClick(row: Row) {
    const r = rows.find((x) => x.id === row.id) as RowExt | undefined;
    if (!r) return;
    const ok = confirm(`¿Eliminar el producto "${r.nombre}"?`);
    if (!ok) return;
    try {
      setLoading(true);
      await deleteProducto(r.id);
      const nextPage = rows.length === 1 && page > 1 ? page - 1 : page;
      await load(nextPage, q);
    } finally {
      setLoading(false);
    }
  }

  // GUARDAR (crear/editar)
  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm("¿Desea guardar los cambios?")) return;

    const nombre = form.nombre.trim();
    const precioNum = Number(form.precio);
    const costoNum  = Number(form.costo);
    const catId = Number(form.id_categoria);

    if (!nombre) { alert("El nombre es obligatorio."); return; }
    if (nombre.length > 200) { alert("El nombre no puede exceder 200 caracteres."); return; }
    if (Number.isNaN(precioNum) || precioNum < 0) { alert("El precio debe ser un número ≥ 0."); return; }
    if (Number.isNaN(costoNum) || costoNum < 0) { alert("El costo debe ser un número ≥ 0."); return; }
    if (!catId || Number.isNaN(catId)) { alert("Debe seleccionar la categoría."); return; }

    try {
      setSaving(true);
      if (editId == null) {
        await createProducto({
          nombre_producto: nombre,
          precio_unitario: precioNum,
          costo_unitario: costoNum,
          id_categoria: catId,
        });
        await load(1, q);     // tras crear -> página 1
      } else {
        await updateProducto(editId, {
          nombre_producto: nombre,
          precio_unitario: precioNum,
          costo_unitario: costoNum,
          id_categoria: catId,
        });
        await load(page, q);  // tras editar -> misma página
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
        titulo="Catálogo: Productos"
        placeholderBusqueda="Buscar producto..."
        rows={rows}
        totalCount={count}
        page={page}
        pageSize={pageSize}
        loading={loading}
        onSearch={(text) => { setQ(text); load(1, text); }}
        onClear={() => { setQ(""); load(1, ""); }}
        onPageChange={(next) => { if (next < 1 || next > totalPages) return; load(next, q); }}
        onNewClick={onNewClick}
        onEditClick={onEditClick}
        onDeleteClick={onDeleteClick}
        extraColumns={[
          { header: "Categoría", render: (r) => (r as RowExt).categoria },
          { header: "Precio", alignRight: true, render: (r) => (r as RowExt).precio.toFixed(2) },
          { header: "Costo", alignRight: true, render: (r) => (r as RowExt).costo.toFixed(2) },
        ]}
        // Exportar PDF (confirmación la maneja el Scaffold)
        exportPdf={{
          filename: "productos.pdf",
          headers: ["ID", "Nombre", "Categoría", "Precio", "Costo"],
          mapRow: (r) => {
            const rr = r as RowExt;
            return [rr.id, rr.nombre, rr.categoria, rr.precio.toFixed(2), rr.costo.toFixed(2)];
          },
          footerNote: "Exportado desde Multilazos • Catálogo de productos",
          confirm: true,
          confirmMessage: "¿Desea exportar el PDF de Productos (página visible)?",
        }}
      />

      {/* Modal NUEVO/EDITAR */}
      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.25)", display: "grid", placeItems: "center", zIndex: 50 }}>
          <form className="card" onSubmit={onSave} style={{ minWidth: 520, width: "min(840px, 95vw)" }}>
            <h3 style={{ marginTop: 0 }}>{editId == null ? "Nuevo producto" : "Editar producto"}</h3>

            <div style={{ display: "grid", gap: ".8rem", gridTemplateColumns: "2fr 1fr 1fr 1fr" }}>
              <div style={{ gridColumn: "1 / span 2" }}>
                <label>Nombre</label>
                <input
                  className="input"
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                />
              </div>

              <div>
                <label>Precio</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.precio}
                  onChange={e => setForm(f => ({ ...f, precio: e.target.value }))}
                />
              </div>

              <div>
                <label>Costo</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.costo}
                  onChange={e => setForm(f => ({ ...f, costo: e.target.value }))}
                />
              </div>

              <div style={{ gridColumn: "1 / span 2" }}>
                <label>Categoría</label>
                <select
                  className="input"
                  value={form.id_categoria}
                  onChange={e => setForm(f => ({ ...f, id_categoria: e.target.value }))}
                >
                  <option value="">Seleccione…</option>
                  {categorias.map(c => (
                    <option key={c.id_categoria} value={c.id_categoria}>
                      {c.nombre_categoria}
                    </option>
                  ))}
                </select>
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
