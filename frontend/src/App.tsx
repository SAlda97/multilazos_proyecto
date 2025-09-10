import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Ventas from "./pages/Ventas";

export default function App(){
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace/>}/>
        <Route path="/dashboard" element={<Dashboard/>}/>
        <Route path="/ventas" element={<Ventas/>}/>
        <Route path="*" element={<div className="card">404</div>} />
      </Routes>
    </Layout>
  );
}
