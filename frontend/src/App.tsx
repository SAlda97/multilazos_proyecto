import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Ventas from "./pages/Ventas";
import Clientes from "./pages/Clientes";
import Productos from "./pages/Productos"; 
import Pagos from "./pages/Pagos";
import Gastos from "./pages/Gastos";
import Cuotas from "./pages/Cuotas";
import Rentabilidades from "./pages/Rentabilidades"; 
import CatTipoClientes from "./pages/catalogos/CatTipoClientes";
import CatCategoriaProductos from "./pages/catalogos/CatCategoriaProductos";
import CatTipoTransacciones from "./pages/catalogos/CatTipoTransacciones";
import CatCategoriaGastos from "./pages/catalogos/CatCategoriaGastos";
import Usuarios from "./pages/seguridad/Usuarios";
import Roles from "./pages/seguridad/Roles";
import Permisos from "./pages/seguridad/Permisos";
import DetalleVentas from "./pages/DetalleVentas";
import EstadoCuotas from "./pages/EstadoCuotas";
import BitacoraVentas from "./pages/BitacoraVentas"; 

export default function App(){
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace/>}/>
        <Route path="/dashboard" element={<Dashboard/>}/>
        <Route path="/ventas" element={<Ventas/>}/>
        <Route path="/ventas/:id/detalle" element={<DetalleVentas/>} />
        <Route path="/clientes" element={<Clientes/>}/> 
        <Route path="/productos" element={<Productos/>}/> 
        <Route path="/pagos" element={<Pagos/>}/>
        <Route path="/gastos" element={<Gastos/>}/>
        <Route path="/cuotas" element={<Cuotas/>}/>
        <Route path="/rentabilidades" element={<Rentabilidades/>}/>
        <Route path="/catalogos/tipo-clientes" element={<CatTipoClientes />} />
        <Route path="/catalogos/categoria-productos" element={<CatCategoriaProductos />} />
        <Route path="/catalogos/tipo-transacciones" element={<CatTipoTransacciones />} />
        <Route path="/catalogos/categoria-gastos" element={<CatCategoriaGastos />} />
        <Route path="/seguridad/usuarios" element={<Usuarios />} />
        <Route path="/seguridad/roles" element={<Roles />} />
        <Route path="/seguridad/permisos" element={<Permisos />} />

        <Route path="/estado-cuotas" element={<EstadoCuotas />} />
        <Route path="/bitacora-ventas" element={<BitacoraVentas />} />
        <Route path="*" element={<div className="card">404</div>} />
      </Routes>
    </Layout>
  );
}
