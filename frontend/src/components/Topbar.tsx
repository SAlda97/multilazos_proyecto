export default function Topbar(){
  return (
    <div className="topbar" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 .9rem"}}>
      <div className="brand">multilazos · Panel</div>
      <div style={{display:"flex",gap:".6rem",alignItems:"center"}}>
        <input className="input" placeholder="Buscar… (UI)" style={{width:260}}/>
        <button className="secondary">Perfil</button>
      </div>
    </div>
  );
}
