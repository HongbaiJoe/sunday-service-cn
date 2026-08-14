import { CommunityHub } from "../components/community-hub";
import { PageIntro } from "../components/page-intro";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { notFound } from "next/navigation";
import { COMMUNITY_ENABLED } from "../lib/features";

export const metadata = { title: "社区" };
export default function CommunityPage() { if (!COMMUNITY_ENABLED) notFound(); return <main><SiteHeader /><PageIntro title="社区" titleEn="COMMUNITY" description="讨论音乐、分享作品，也分享一次完整的聆听。" descriptionEn="Discuss music, share work and document a complete listening experience." variant="community" /><CommunityHub /><SiteFooter /></main>; }
