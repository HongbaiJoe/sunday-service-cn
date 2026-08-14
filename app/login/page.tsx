import { MemberAccessForm } from "../components/member-access-form";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";

export const metadata = { title: "登录" };
export default function LoginPage() { return <main><SiteHeader /><section className="auth-page"><div><h1>欢迎<br />回来</h1></div><MemberAccessForm mode="login" /></section><SiteFooter /></main>; }
