import { PostThread } from "../../../components/post-thread";
import { SiteFooter } from "../../../components/site-footer";
import { SiteHeader } from "../../../components/site-header";
import { notFound } from "next/navigation";
import { COMMUNITY_ENABLED } from "../../../lib/features";

export const metadata = { title: "社区帖子" };
export default async function PostPage({ params }: { params: Promise<{ id: string }> }) { if (!COMMUNITY_ENABLED) notFound(); const { id } = await params; return <main><SiteHeader /><PostThread id={id} /><SiteFooter /></main>; }
