// frontend/src/pages/Gastos.tsx
import { useEffect, useMemo, useState } from "react";
import CatalogScaffold, { type Row } from "./catalogos/_CatalogScaffold";
import { listGastos, createGasto, updateGasto, deleteGasto } from "../services/gastos";
import { listCategoriaGastos } from "../services/categoriaGastos";
import { getIdFechaByDate, getFechaById } from "../services/dimFecha";
import type { Gasto } from "../types/gastos";
import type { CategoriaGasto } from "../types/categoriaGastos";

type RowExt = Row & {
  monto: number;
  fecha: string;         // YYYY-MM-DD
  categoria: string;
  idFechaNum: number;    // respaldo por si necesitamos resolver fecha
};

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function Gastos() {
  const [rows, setRows] = useState<RowExt[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  // categorías
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([]);

  // modal (crear/editar)
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<{
    nombre: string;
    monto: string;
    fecha: string;                // YYYY-MM-DD visible
    id_categoria_gastos: string;
  }>({ nombre: "", monto: "", fecha: todayISO(), id_categoria_gastos: "" });
  const [saving, setSaving] = useState(false);

  const pageSize = 10;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(count / pageSize)), [count]);

  async function loadCategorias() {
    const res = await listCategoriaGastos({ page: 1, page_size: 1000 });
    setCategorias(res.results);
  }

  // Resuelve fechas faltantes consultando /dim-fecha/<id>
  async function hydrateMissingDates(list: RowExt[]) {
    const missing = list.filter(r => !r.fecha && r.idFechaNum);
    if (missing.length === 0) return list;

    const uniqueIds = Array.from(new Set(missing.map(m => m.idFechaNum)));
    const pairs = await Promise.all(
      uniqueIds.map(async id => {
        try {
          const df = await getFechaById(id);
          return [id, df.fecha] as const;
        } catch {
          return [id, ""] as const;
        }
      })
    );
    const map = new Map<number, string>(pairs);

    return list.map(r => (r.fecha ? r : { ...r, fecha: map.get(r.idFechaNum) || "" }));
  }

  async function load(p = page, query = q) {
    setLoading(true);
    try {
      const res = await listGastos({ page: p, page_size: pageSize, search: query || undefined });
      const mapped: RowExt[] = res.results.map((g: Gasto) => ({
        id: g.id_gasto,
        nombre: g.nombre_gasto,
        monto: Number(g.monto_gasto),
        idFechaNum: g.id_fecha,
        fecha: (g as any).fecha || "", // si el backend ya envía 'fecha', se usa; si no, se hidrata abajo
        categoria: g.nombre_categoria_gasto || "",
      }));

      const withDates = await hydrateMissingDates(mapped);
      setRows(withDates);
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
    setForm({ nombre: "", monto: "", fecha: todayISO(), id_categoria_gastos: "" });
    setOpen(true);
  }

  // EDITAR
  async function onEditClick(row: Row) {
    const r = rows.find((x) => x.id === row.id);
    if (!r) return;

    let fechaISO = r.fecha;
    if (!fechaISO && r.idFechaNum) {
      try {
        const df = await getFechaById(r.idFechaNum);
        fechaISO = df.fecha;
      } catch { /* noop */ }
    }

    const cat = categorias.find((c) => c.nombre_categoria === r.categoria);
    setEditId(r.id);
    setForm({
      nombre: r.nombre,
      monto: r.monto.toString(),
      fecha: fechaISO || todayISO(),
      id_categoria_gastos: (cat?.id_categoria_gastos ?? "").toString(),
    });
    setOpen(true);
  }

  // ELIMINAR
  async function onDeleteClick(row: Row) {
    const r = rows.find((x) => x.id === row.id);
    if (!r) return;
    const ok = confirm(`¿Eliminar el gasto "${r.nombre}"?`);
    if (!ok) return;
    try {
      setLoading(true);
      await deleteGasto(r.id);
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
    const montoNum = Number(form.monto);
    const catId = Number(form.id_categoria_gastos);
    const fechaISO = form.fecha; // YYYY-MM-DD

    if (!nombre) { alert("El nombre es obligatorio."); return; }
    if (nombre.length > 100) { alert("El nombre no puede exceder 100 caracteres."); return; }
    if (Number.isNaN(montoNum) || montoNum < 0) { alert("El monto debe ser un número ≥ 0."); return; }
    if (!fechaISO) { alert("Debe seleccionar la fecha."); return; }
    if (!catId || Number.isNaN(catId)) { alert("Debe seleccionar la categoría de gasto."); return; }

    try {
      setSaving(true);
      // 1) Convertimos fecha → id_fecha
      const { id_fecha } = await getIdFechaByDate(fechaISO);

      if (editId == null) {
        await createGasto({
          nombre_gasto: nombre,
          monto_gasto: montoNum,
          id_fecha,
          id_categoria_gastos: catId,
        });
        await load(1, q);
      } else {
        await updateGasto(editId, {
          nombre_gasto: nombre,
          monto_gasto: montoNum,
          id_fecha,
          id_categoria_gastos: catId,
        });
        await load(page, q);
      }
      setOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || "Error al guardar.";
      alert(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <CatalogScaffold
        titulo="Catálogo: Gastos"
        placeholderBusqueda="Buscar gasto..."
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
          { header: "Monto", alignRight: true, render: (r) => (r as RowExt).monto.toFixed(2) },
          { header: "Fecha", render: (r) => (r as RowExt).fecha || "—" },
          { header: "Categoría", render: (r) => (r as RowExt).categoria },
        ]}
        exportPdf={{
          filename: "gastos.pdf",
          headers: ["ID", "Nombre", "Monto", "Fecha", "Categoría"],
          mapRow: (r) => {
            const rr = r as RowExt;
            return [rr.id, rr.nombre, rr.monto.toFixed(2), rr.fecha || "", rr.categoria];
          },
          footerNote: "Exportado desde Multilazos • Catálogo de gastos",
          confirm: true,
          confirmMessage: "¿Desea exportar el PDF de Gastos (página visible)?",
        }}
      />

      {/* Modal NUEVO/EDITAR */}
      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.25)", display: "grid", placeItems: "center", zIndex: 50 }}>
          <form className="card" onSubmit={onSave} style={{ minWidth: 560, width: "min(860px, 95vw)" }}>
            <h3 style={{ marginTop: 0 }}>{editId == null ? "Nuevo gasto" : "Editar gasto"}</h3>

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
                <label>Monto</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.monto}
                  onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                />
              </div>

              <div>
                <label>Fecha</label>
                <input
                  className="input"
                  type="date"
                  value={form.fecha}
                  onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                />
              </div>

              <div style={{ gridColumn: "1 / span 2" }}>
                <label>Categoría de gasto</label>
                <select
                  className="input"
                  value={form.id_categoria_gastos}
                  onChange={e => setForm(f => ({ ...f, id_categoria_gastos: e.target.value }))}
                >
                  <option value="">Seleccione…</option>
                  {categorias.map(c => (
                    <option key={c.id_categoria_gastos ?? c.id_categoria_gastos} value={c.id_categoria_gastos ?? c.id_categoria_gastos}>
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
