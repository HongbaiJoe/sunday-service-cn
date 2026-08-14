import { MemberAccessForm } from "../components/member-access-form";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { LocalizedText } from "../components/locale-provider";

export const metadata = { title: "登录" };
export default function LoginPage() { return <main><SiteHeader /><section className="auth-page"><div><LocalizedText as="h1" className="localized-lines" zh={"欢迎\n回来"} en={"WELCOME\nBACK"} /></div><MemberAccessForm mode="login" /></section><SiteFooter /></main>; }
