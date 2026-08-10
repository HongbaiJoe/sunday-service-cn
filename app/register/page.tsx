import { MemberAccessForm } from "../components/member-access-form";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";

export const metadata = { title: "注册" };
export default function RegisterPage() { return <main><SiteHeader /><section className="auth-page auth-register"><div><p className="eyebrow">REGISTER · 注册</p><h1>加入<br />社区</h1><p>创建成员身份后，可以自由分享意见、作品、资料与独立线上展览。</p></div><MemberAccessForm mode="register" /></section><SiteFooter /></main>; }
