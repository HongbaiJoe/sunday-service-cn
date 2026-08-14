import { AccountDashboard } from "../components/account-dashboard";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";

export const metadata = { title: "账户" };

export default function AccountPage() {
  return <main><SiteHeader /><div className="account-page-content"><AccountDashboard /></div><SiteFooter /></main>;
}
