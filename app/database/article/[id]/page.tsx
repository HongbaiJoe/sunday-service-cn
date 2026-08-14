import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../lib/auth";
import { ensureDatabase, getD1 } from "../../../../db/runtime";
import { SiteFooter } from "../../../components/site-footer";
import { SiteHeader } from "../../../components/site-header";
import { LocalizedText } from "../../../components/locale-provider";
import { LibraryArticle, type LibraryArticleEntry } from "../../../components/library-article";

export const metadata = { title: "资料文章" };
export const dynamic = "force-dynamic";

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // 登录保护：未登录自动跳转登录页，登录后返回当前文章
  const user = await getCurrentUser();
  if (!user || user.status !== "active") {
    redirect(`/login?returnTo=${encodeURIComponent(`/database/article/${id}`)}`);
  }

  await ensureDatabase();
  const entry = await getD1().prepare(
    `SELECT library_entries.id, category, category_en AS categoryEn, title, title_en AS titleEn, summary, summary_en AS summaryEn, body, body_en AS bodyEn, source_url AS sourceUrl, media_url AS mediaUrl, blocks, library_entries.created_at AS createdAt, library_entries.updated_at AS updatedAt, users.display_name AS author
     FROM library_entries JOIN users ON users.id = library_entries.owner_id
     WHERE library_entries.id = ? AND library_entries.status = 'approved'`,
  ).bind(id).first<Record<string, string>>() as LibraryArticleEntry | null;

  if (!entry) {
    return <main><SiteHeader /><section className="system-hero"><p className="eyebrow">NOT FOUND · <LocalizedText zh="未找到" en="MISSING" /></p><LocalizedText as="h1" zh={'文章\n不存在'} en={'Article\nnot found'} /><LocalizedText as="p" zh="这篇文章不存在或未通过审核。" en="This article does not exist or has not been approved." /><p style={{ marginTop: 24 }}><Link className="system-button" href="/database"><LocalizedText zh="返回资料库" en="Back to archive" /></Link></p></section><SiteFooter /></main>;
  }

  return <main><SiteHeader /><LibraryArticle entry={entry} /><SiteFooter /></main>;
}
