import { CommunityHub } from "../components/community-hub";
import { PageIntro } from "../components/page-intro";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";

export const metadata = { title: "社区" };
export default function CommunityPage() { return <main><SiteHeader /><PageIntro title="社区" description="讨论音乐、分享作品，也分享一次完整的聆听。" variant="community" /><CommunityHub /><SiteFooter /></main>; }
