import { useQuery } from "@tanstack/react-query";
import  http  from "../api/http";
import type { Paginated } from "../types/clientes"; // o donde lo tengas
import type { TipoCliente } from "../types/tipoClientes";

type TipoClientesQuery = {
  page?: number;
  page_size?: number;
};

export function useTipoClientes(params?: TipoClientesQuery) {
  return useQuery({
    queryKey: ["tipo_clientes", params],
    queryFn: async () => {
      const res = await http.get<Paginated<TipoCliente>>("/tipo_clientes/", { params });
      return res.data;
    },
  });
}
