import { AccountDashboard } from "../components/account-dashboard";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";

export const metadata = { title: "账户" };

export default function AccountPage() {
  return <main><SiteHeader /><section className="system-hero"><p className="eyebrow">ACCOUNT · 账户</p><h1>你的<br />社区身份</h1></section><AccountDashboard /><SiteFooter /></main>;
}
