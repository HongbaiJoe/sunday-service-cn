import { ExhibitionHub } from "../components/exhibition-hub";
import { PageIntro } from "../components/page-intro";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";

export const metadata = { title: "展厅" };
export default function ExhibitionsPage() { return <main><SiteHeader /><PageIntro index="03" title="展厅" description="这里是独立线上展览的入口。每个展览在自己的空间里发生。" variant="exhibitions" /><ExhibitionHub /><SiteFooter /></main>; }
