import { AdminDashboard } from "../components/admin-dashboard";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";

export const metadata = { title: "管理后台" };
export default function AdminPage() { return <main><SiteHeader /><section className="admin-hero"><p className="eyebrow">ADMIN · 后台</p><h1>内容<br />控制室</h1></section><AdminDashboard /><SiteFooter /></main>; }
