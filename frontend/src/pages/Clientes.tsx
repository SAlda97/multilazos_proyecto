import { useEffect, useMemo, useState } from "react";
import CatalogScaffold, { type Row } from "./catalogos/_CatalogScaffold";
import { listClientes, createCliente, updateCliente, deleteCliente } from "../services/clientes";
import { fetchTipoClientes } from "../services/tipoClientes"; // ya lo tienes
import type { Cliente } from "../types/clientes";
import type { TipoCliente } from "../types/tipoClientes";

type RowExt = Row & { apellido: string; tipo: string };

export default function Clientes() {
  const [rows, setRows] = useState<RowExt[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  // tipos de cliente para el combo
  const [tipos, setTipos] = useState<TipoCliente[]>([]);

  // modal (crear/editar)
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<{ nombre: string; apellido: string; id_tipo_cliente: string }>({
    nombre: "",
    apellido: "",
    id_tipo_cliente: "",
  });
  const [saving, setSaving] = useState(false);

  const pageSize = 10;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(count / pageSize)), [count]);

  async function loadTipos() {
    // traemos un batch grande para el combo; ajusta si prefieres
    const res = await fetchTipoClientes({ page: 1, page_size: 1000 });
    setTipos(res.results);
  }

  async function load(p = page, query = q) {
    setLoading(true);
    try {
      const res = await listClientes({ page: p, page_size: pageSize, search: query || undefined });
      const mapped: RowExt[] = res.results.map((c: Cliente) => ({
        id: c.id_cliente,
        nombre: c.nombre_cliente,
        apellido: c.apellido_cliente,
        tipo: c.nombre_tipo_cliente || "",
      }));
      setRows(mapped);
      setCount(res.count);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTipos();
    load(1, q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // NUEVO
  function onNewClick() {
    setEditId(null);
    setForm({ nombre: "", apellido: "", id_tipo_cliente: "" });
    setOpen(true);
  }

  // EDITAR
  function onEditClick(row: Row) {
    const r = rows.find(x => x.id === row.id) as RowExt | undefined;
    if (!r) return;
    const tc = tipos.find(t => t.nombre_tipo_cliente === r.tipo);
    setEditId(r.id);
    setForm({
      nombre: r.nombre,
      apellido: r.apellido,
      id_tipo_cliente: (tc?.id_tipo_cliente ?? "").toString(),
    });
    setOpen(true);
  }

  // ELIMINAR
  async function onDeleteClick(row: Row) {
    const r = rows.find(x => x.id === row.id) as RowExt | undefined;
    if (!r) return;
    const ok = confirm(`¿Eliminar al cliente "${r.nombre} ${r.apellido}"?`);
    if (!ok) return;
    try {
      setLoading(true);
      await deleteCliente(r.id);
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
    const apellido = form.apellido.trim();
    const tipoId = Number(form.id_tipo_cliente);

    if (!nombre) { alert("El nombre es obligatorio."); return; }
    if (!apellido) { alert("El apellido es obligatorio."); return; }
    if (!tipoId || Number.isNaN(tipoId)) { alert("Debe seleccionar el tipo de cliente."); return; }

    try {
      setSaving(true);
      if (editId == null) {
        await createCliente({
          nombre_cliente: nombre,
          apellido_cliente: apellido,
          id_tipo_cliente: tipoId,
        });
        await load(1, q);     // tras crear, volvemos a la página 1
      } else {
        await updateCliente(editId, {
          nombre_cliente: nombre,
          apellido_cliente: apellido,
          id_tipo_cliente: tipoId,
        });
        await load(page, q);  // tras editar, recargamos la misma página
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
        titulo="Catálogo: Clientes"
        placeholderBusqueda="Buscar cliente (nombre o apellido)..."
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
          { header: "Apellido", render: (r) => (r as RowExt).apellido },
          { header: "Tipo", render: (r) => (r as RowExt).tipo },
        ]}
        exportPdf={{
          filename: "clientes.pdf",
          headers: ["ID", "Nombre", "Apellido", "Tipo"],
          mapRow: (r) => {
            const rr = r as RowExt;
            return [rr.id, rr.nombre, rr.apellido, rr.tipo];
          },
          footerNote: "Exportado desde Multilazos • Catálogo de clientes",
          confirm: true,
          confirmMessage: "¿Desea exportar el PDF de Clientes (página visible)?",
        }}
      />

      {/* Modal NUEVO/EDITAR */}
      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.25)", display: "grid", placeItems: "center", zIndex: 50 }}>
          <form className="card" onSubmit={onSave} style={{ minWidth: 520, width: "min(800px, 95vw)" }}>
            <h3 style={{ marginTop: 0 }}>{editId == null ? "Nuevo cliente" : "Editar cliente"}</h3>

            <div style={{ display: "grid", gap: ".8rem", gridTemplateColumns: "1fr 1fr 280px" }}>
              <div>
                <label>Nombre</label>
                <input
                  className="input"
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                />
              </div>
              <div>
                <label>Apellido</label>
                <input
                  className="input"
                  value={form.apellido}
                  onChange={e => setForm(f => ({ ...f, apellido: e.target.value }))}
                />
              </div>
              <div>
                <label>Tipo de cliente</label>
                <select
                  className="input"
                  value={form.id_tipo_cliente}
                  onChange={e => setForm(f => ({ ...f, id_tipo_cliente: e.target.value }))}
                >
                  <option value="">Seleccione…</option>
                  {tipos.map(t => (
                    <option key={t.id_tipo_cliente} value={t.id_tipo_cliente}>
                      {t.nombre_tipo_cliente}
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
