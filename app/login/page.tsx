import { MemberAccessForm } from "../components/member-access-form";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";

export const metadata = { title: "登录" };
export default function LoginPage() { return <main><SiteHeader /><section className="auth-page"><div><p className="eyebrow">LOGIN · 登录</p><h1>欢迎<br />回来</h1><p>使用邮箱或手机号进入社区，继续发帖、回复和管理自己的提交。</p></div><MemberAccessForm mode="login" /></section><SiteFooter /></main>; }
