import axios, { AxiosError, AxiosResponse } from "axios";
import { API_BASE_URL } from "../config/env";

const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  timeout: 15000,
});

http.interceptors.response.use(
  (res: AxiosResponse) => res,
  (error: AxiosError) => {
    const data = error.response?.data as any;
    const msg =
      data?.error ??                  // ← captura mensajes tipo { "error": "Usuario inactivo o inexistente" }
      data?.message ??
      (typeof data === "string" ? data : "") ??
      error.response?.statusText ??
      error.message ??
      "Error de red";
    const e = new Error(msg);
    (e as any).response = error.response;
    return Promise.reject(e);
  }
);

export default http;
