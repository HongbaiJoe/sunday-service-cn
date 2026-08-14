import { MemberAccessForm } from "../components/member-access-form";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { LocalizedText } from "../components/locale-provider";

export const metadata = { title: "注册" };
export default function RegisterPage() { return <main><SiteHeader /><section className="auth-page auth-register"><div><LocalizedText as="h1" className="localized-lines" zh={"加入\n社区"} en={"JOIN THE\nCOMMUNITY"} /></div><MemberAccessForm mode="register" /></section><SiteFooter /></main>; }
