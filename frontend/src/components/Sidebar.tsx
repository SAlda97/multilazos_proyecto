import { NavLink } from "react-router-dom";
import { BRAND } from "../config/branding";

export default function Sidebar(){
  const links = [
    {to:"/dashboard", label:"Dashboard"},
    {to:"/ventas", label:"Ventas"},
  ];

  return (
    <div className="sidebar" style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{padding:"1rem", borderBottom:"1px solid var(--grey-200)", display:"flex", alignItems:"center", gap:".75rem"}}>
        <img
          src={BRAND.LOGO_URL}
          alt={BRAND.LOGO_ALT}
          height={10}
          style={{ display:"block", height:220, width:"auto", objectFit:"contain" }}
          onError={(e)=>{
            // si falla, muestra el texto como fallback
            (e.currentTarget.style.display = "none");
            const sibling = e.currentTarget.nextElementSibling as HTMLElement | null;
            if (sibling) sibling.style.display = "block";
          }}
        />
        <div style={{display:"none"}}>
          <div className="brand">{BRAND.LOGO_ALT}</div>
          <div style={{fontSize:".85rem",color:"var(--grey-600)"}}>{BRAND.TAGLINE}</div>
        </div>
      </div>

      <nav style={{paddingTop:".5rem"}}>
        {links.map(l => (
          <NavLink key={l.to} to={l.to} className={({isActive}) => `nav-link ${isActive ? "active":""}`}>
            ▸ {l.label}
          </NavLink>
        ))}
      </nav>

      <div style={{marginTop:"auto", padding:"1rem"}}>
        <button className="ghost" style={{width:"100%"}}>Cerrar sesión</button>
      </div>
    </div>
  );
}
