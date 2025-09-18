// src/hooks/useClientes.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listClientes, createCliente, updateCliente, removeCliente } from "../api/clientes";
import type { ClientesQuery, ClienteCreate, ClienteUpdate } from "../types/clientes";

export function useClientes(params?: ClientesQuery) {
  return useQuery({
    queryKey: ["clientes", params],
    queryFn: () => listClientes(params),
    staleTime: 10_000,
    placeholderData: (prev) => prev, // conservar lista previa mientras llega la nueva
  });
}

export function useClientesMutations() {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (payload: ClienteCreate) => createCliente(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clientes"] }),
  });

  const update = useMutation({
    mutationFn: (args: { id: number; payload: ClienteUpdate }) => updateCliente(args.id, args.payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clientes"] }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => removeCliente(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clientes"] }),
  });

  return { create, update, remove };
}
