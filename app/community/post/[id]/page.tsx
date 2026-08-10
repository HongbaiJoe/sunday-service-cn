import { PostThread } from "../../../components/post-thread";
import { SiteFooter } from "../../../components/site-footer";
import { SiteHeader } from "../../../components/site-header";

export const metadata = { title: "社区帖子" };
export default async function PostPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <main><SiteHeader /><PostThread id={id} /><SiteFooter /></main>; }
