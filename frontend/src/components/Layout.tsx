import Topbar from "./Topbar";
import Sidebar from "./Sidebar";

export default function Layout({children}:{children:React.ReactNode}){
  return (
    <div className="layout">
      <Sidebar/>
      <Topbar/>
      <main className="content">{children}</main>
    </div>
  );
}
