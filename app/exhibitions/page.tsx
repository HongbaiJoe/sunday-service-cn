import { ExhibitionHub } from "../components/exhibition-hub";
import { PageIntro } from "../components/page-intro";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";

export const metadata = { title: "展厅" };
export default function ExhibitionsPage() { return <main><SiteHeader /><PageIntro title="展厅" titleEn="EXHIBITIONS" description="这里是独立线上展览的入口。每个展览在自己的空间里发生。" descriptionEn="Entrances to independent online exhibitions, each unfolding in its own space." variant="exhibitions" /><ExhibitionHub /><SiteFooter /></main>; }
