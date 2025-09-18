// src/api/clientes.ts
import  http  from "../api/http";
import type { Paginated, Cliente, ClienteCreate, ClienteUpdate } from "../types/clientes";

export type ClientesQuery = {
  q?: string;
  page?: number;
  page_size?: number;
  id_tipo_cliente?: number | "Todos";
};

export async function listClientes(params: ClientesQuery = {}) {
  // Normalizamos "Todos" -> undefined
  const { id_tipo_cliente, ...rest } = params;
  const p = { ...rest, id_tipo_cliente: id_tipo_cliente === "Todos" ? undefined : id_tipo_cliente };
  const res = await http.get<Paginated<Cliente>>("/clientes/", { params: p });
  return res.data;
}

export async function createCliente(payload: ClienteCreate) {
  const res = await http.post<Cliente>("/clientes/", payload);
  return res.data;
}

export async function updateCliente(id: number, payload: ClienteUpdate) {
  const res = await http.put<Cliente>(`/clientes/${id}/`, payload);
  return res.data;
}

export async function removeCliente(id: number) {
  await http.delete(`/clientes/${id}/`);
}
