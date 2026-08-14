import { MemberAccessForm } from "../components/member-access-form";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";

export const metadata = { title: "注册" };
export default function RegisterPage() { return <main><SiteHeader /><section className="auth-page auth-register"><div><h1>加入<br />社区</h1></div><MemberAccessForm mode="register" /></section><SiteFooter /></main>; }
