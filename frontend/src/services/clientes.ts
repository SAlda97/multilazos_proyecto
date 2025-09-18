import { useEffect, useMemo, useState } from "react";
import { useClientes } from "../../hooks/useClientes";
import type { ClienteUI } from "../../services/clientes";

// … deja tus imports y estilos como están …

export default function Clientes() {
  // ===== filtros/paginación UI (igual que tu código) =====
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<"Todos" | "Mayorista" | "Minorista" | "Prueba" | "Desconocido">("Todos");
  const [estado, setEstado] = useState<"Todos" | "Activo" | "Inactivo">("Todos");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // ===== consulta remota =====
  const { list, createM, updateM, deleteM } = useClientes({ q, tipo, estado, page });

  const data: ClienteUI[] = list.data ?? [];
  const filtered = data; // (el backend ya te puede filtrar; si prefieres, aplica filtro aquí)
  const total = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);

  function resetFiltros() { setQ(""); setTipo("Todos"); setEstado("Todos"); setPage(1); }

  // ===== CRUD modal (sin tocar el markup) =====
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ClienteUI>({
    id: 0,
    nombre: "",
    nit: "",
    telefono: "",
    email: "",
    direccion: "",
    tipo: "Mayorista",
    estado: "Activo",
    limiteCredito: 0,
    saldoCredito: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validar(f: ClienteUI) {
    const e: Record<string, string> = {};
    if (!f.nombre.trim()) e.nombre = "Nombre requerido";
    if (f.email && !/.+@.+\..+/.test(f.email)) e.email = "Email inválido";
    if (f.telefono && f.telefono.length < 6) e.telefono = "Teléfono muy corto";
    if (f.limiteCredito < 0) e.limiteCredito = "No puede ser negativo";
    if (f.saldoCredito < 0) e.saldoCredito = "No puede ser negativo";
    return e;
  }

  function onNew() {
    setEditId(null);
    setForm({
      id: 0,
      nombre: "",
      nit: "",
      telefono: "",
      email: "",
      direccion: "",
      tipo: "Mayorista",
      estado: "Activo",
      limiteCredito: 0,
      saldoCredito: 0,
    });
    setErrors({});
    setOpen(true);
  }
  function onEdit(id: number) {
    const c = data.find(x => x.id === id); if (!c) return;
    setEditId(id);
    setForm({ ...c });
    setErrors({});
    setOpen(true);
  }
  async function onDelete(id: number) {
    if (!confirm("¿Eliminar cliente?")) return;
    await deleteM.mutateAsync(id);
  }
  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const v = validar(form); setErrors(v);
    if (Object.keys(v).length) return;
    if (editId == null) {
      await createM.mutateAsync(form);
    } else {
      await updateM.mutateAsync({ id: editId, data: form });
    }
    setOpen(false);
  }

  // ===== TODO lo demás (markup) se queda IGUAL =====
  // Copia/pega aquí **tu mismo JSX** de filtros + cards + tabla + modal.
  // Únicamente asegúrate que:
  // - La tabla se alimente de pageData (ya viene del server).
  // - onEdit / onDelete / onSave apunten a las funciones de arriba.
  // - “Aún no hay clientes” se muestre cuando pageData.length === 0.

  return (
    // 👉 pega aquí tu JSX original tal cual (filtros, tabla, modal)
    // usando pageData, onNew, onEdit, onDelete, onSave, form/setForm, errors, etc.
    // (Por brevedad no repito todo tu JSX, pero no cambies clases ni estilos.)
    <></>
  );
}
