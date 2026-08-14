import { Suspense } from "react";
import { DatabaseHub } from "../components/database-hub";
import { PageIntro } from "../components/page-intro";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";

export const metadata = { title: "资料库" };
export default function DatabasePage() { return <main><SiteHeader /><Suspense fallback={<div className="system-loading">正在加载资料库…</div>}><PageIntro title="资料库" variant="database" /><DatabaseHub /></Suspense><SiteFooter /></main>; }
