import { AdminDashboard } from "../components/admin-dashboard";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { LocalizedText } from "../components/locale-provider";

export const metadata = { title: "管理后台" };
export default function AdminPage() { return <main><SiteHeader /><section className="admin-hero"><LocalizedText as="p" className="eyebrow" zh="ADMIN · 后台" en="ADMIN · BACK OFFICE" /><LocalizedText as="h1" className="localized-lines" zh={"内容\n控制室"} en={"CONTENT\nCONTROL"} /></section><AdminDashboard /><SiteFooter /></main>; }
