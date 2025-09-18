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
    const msg =
      // si API devuelve { detail: "..."}
      (error.response?.data as any)?.detail ??
      error.response?.statusText ??
      error.message ??
      "Error de red";
    return Promise.reject(new Error(msg));
  }
);

export default http;
