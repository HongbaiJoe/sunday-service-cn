import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../lib/auth";
import { ensureDatabase, getD1 } from "../../../../db/runtime";
import { SiteFooter } from "../../../components/site-footer";
import { SiteHeader } from "../../../components/site-header";
import { RichContentRenderer } from "../../../components/block-renderer";
import { parseContent } from "../../../lib/blocks";

export const metadata = { title: "资料文章" };
export const dynamic = "force-dynamic";

type Entry = { id: string; category: string; title: string; summary: string; body: string; sourceUrl?: string | null; mediaUrl?: string | null; blocks?: string | null; author: string; createdAt: string; updatedAt: string };

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // 登录保护：未登录自动跳转登录页，登录后返回当前文章
  const user = await getCurrentUser();
  if (!user || user.status !== "active") {
    redirect(`/login?returnTo=${encodeURIComponent(`/database/article/${id}`)}`);
  }

  await ensureDatabase();
  const entry = await getD1().prepare(
    `SELECT library_entries.id, category, title, summary, body, source_url AS sourceUrl, media_url AS mediaUrl, blocks, library_entries.created_at AS createdAt, library_entries.updated_at AS updatedAt, users.display_name AS author
     FROM library_entries JOIN users ON users.id = library_entries.owner_id
     WHERE library_entries.id = ? AND library_entries.status = 'approved'`,
  ).bind(id).first<Record<string, string>>() as Entry | null;

  if (!entry) {
    return <main><SiteHeader /><section className="system-hero"><p className="eyebrow">NOT FOUND · 未找到</p><h1>文章<br />不存在</h1><p>这篇文章不存在或未通过审核。</p><p style={{ marginTop: 24 }}><Link className="system-button" href="/database">返回资料库</Link></p></section><SiteFooter /></main>;
  }

  const content = parseContent(entry.blocks);

  return <main><SiteHeader /><article className="library-article"><Link className="back-link" href="/database">← 返回资料库</Link><p className="eyebrow">{entry.category}</p><h1>{entry.title}</h1><div className="post-byline">{entry.author} · {new Date(entry.updatedAt).toLocaleDateString("zh-CN")}</div><p className="library-article-summary">{entry.summary}</p>{content ? <RichContentRenderer content={content} /> : <>{entry.mediaUrl ? <LibraryMedia url={entry.mediaUrl} /> : null}<div className="library-article-body"><p>{entry.body}</p></div></>}{entry.sourceUrl ? <a className="text-link" href={entry.sourceUrl} target="_blank" rel="noreferrer">查看来源 ↗</a> : null}</article><SiteFooter /></main>;
}

function LibraryMedia({ url }: { url: string }) {
  const path = url.split("?")[0].toLowerCase();
  if (/\.(mp4|webm|mov)$/.test(path)) return <video src={url} controls preload="metadata" />;
  if (/\.(mp3|wav|m4a|ogg)$/.test(path)) return <audio src={url} controls preload="metadata" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="资料附件" />;
}
