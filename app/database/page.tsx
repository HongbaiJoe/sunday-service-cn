import { DatabaseHub } from "../components/database-hub";
import { PageIntro } from "../components/page-intro";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";

export const metadata = { title: "资料库" };
export default function DatabasePage() { return <main><SiteHeader /><PageIntro index="02" title="资料库" description="歌曲、人物、流派、课程与社区原创的可检索档案。" variant="database" /><DatabaseHub /><SiteFooter /></main>; }
