"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useLocale } from "./locale-provider";

type Post = { id: string; title: string; body: string; tags: string; titleEn?: string | null; bodyEn?: string | null; tagsEn?: string | null; author: string; createdAt: string; mediaUrl?: string | null };
type Comment = { id: string; body: string; bodyEn?: string | null; author: string; createdAt: string };

export function PostThread({ id }: { id: string }) {
  const router = useRouter();
  const { locale, t, dateLocale, translateMessage } = useLocale();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [message, setMessage] = useState("");
  const [body, setBody] = useState("");
  const [showTranslation, setShowTranslation] = useState(false);
  const [translatedComments, setTranslatedComments] = useState<Record<string, boolean>>({});

  const draftKey = `sscn_draft_reply_${id}`;

  async function load() {
    const [postsResponse, commentsResponse, sessionResponse] = await Promise.all([fetch("/api/posts", { cache: "no-store" }), fetch(`/api/comments?postId=${encodeURIComponent(id)}`, { cache: "no-store" }), fetch("/api/session", { cache: "no-store" })]);
    const all = (await postsResponse.json()) as { posts: Post[] };
    setPost(all.posts.find((item) => item.id === id) ?? null);
    setComments(((await commentsResponse.json()) as { comments: Comment[] }).comments ?? []);
    setSignedIn(Boolean(((await sessionResponse.json()) as { user: unknown }).user));
  }
  useEffect(() => {
    let active = true;
    void Promise.all([fetch("/api/posts", { cache: "no-store" }), fetch(`/api/comments?postId=${encodeURIComponent(id)}`, { cache: "no-store" }), fetch("/api/session", { cache: "no-store" })]).then(async ([postsResponse, commentsResponse, sessionResponse]) => ({ posts: (await postsResponse.json()) as { posts: Post[] }, comments: (await commentsResponse.json()) as { comments: Comment[] }, session: (await sessionResponse.json()) as { user: unknown } })).then((result) => { if (active) { setPost(result.posts.posts.find((item) => item.id === id) ?? null); setComments(result.comments.comments ?? []); setSignedIn(Boolean(result.session.user)); } });
    return () => { active = false; };
  }, [id]);

  // 恢复未发布的回复草稿（登录回跳后）；无草稿时清空
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore a browser-only draft after hydration
      setBody(raw ?? "");
    } catch { setBody(""); }
  }, [draftKey]);

  async function reply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signedIn) {
      // 未登录：保存草稿后去登录，登录后回到本页继续
      localStorage.setItem(draftKey, body);
      router.push(`/login?returnTo=${encodeURIComponent(`/community/post/${id}`)}`);
      return;
    }
    const response = await fetch("/api/comments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ postId: id, body }) });
    const data = await response.json() as { error?: string };
    setMessage(response.ok ? "回复已发布" : data.error ?? "回复失败");
    if (response.ok) { setBody(""); localStorage.removeItem(draftKey); await load(); }
  }

  if (!post) return <section className="post-detail"><Link className="back-link" href="/community">← {t("返回社区", "Back to community")}</Link><h1>{t("正在读取帖子…", "Loading post…")}</h1></section>;
  const builtIn = post.id.startsWith("seed-");
  const hasEnglish = Boolean(post.titleEn && post.bodyEn);
  const showEnglish = hasEnglish && (builtIn ? locale === "en" : showTranslation);
  return <>
    <article className="post-detail"><Link className="back-link" href="/community">← {t("返回社区", "Back to community")}</Link><p className="eyebrow">{showEnglish ? post.tagsEn : post.tags}</p><h1>{showEnglish ? post.titleEn : post.title}</h1><div className="post-byline">{builtIn && locale === "en" ? "SS/CN Editorial" : post.author} · {new Date(post.createdAt).toLocaleString(dateLocale)}</div>{!builtIn && hasEnglish ? <button className="translation-toggle" type="button" onClick={() => setShowTranslation((value) => !value)}>{showTranslation ? t("显示原文", "Show original") : t("查看英文翻译", "View English translation")}</button> : null}{post.mediaUrl ? <img src={post.mediaUrl} alt="" /> : null}<div className="post-copy"><p>{showEnglish ? post.bodyEn : post.body}</p></div></article>
    <section className="reply-section"><h2>{comments.length} {t("条回复", comments.length === 1 ? "reply" : "replies")}</h2>{comments.map((comment) => <article className="reply" key={comment.id}><strong>{comment.author}</strong><p>{translatedComments[comment.id] && comment.bodyEn ? comment.bodyEn : comment.body}</p>{comment.bodyEn ? <button className="translation-toggle" type="button" onClick={() => setTranslatedComments((current) => ({ ...current, [comment.id]: !current[comment.id] }))}>{translatedComments[comment.id] ? t("显示原文", "Show original") : t("查看英文翻译", "View English translation")}</button> : null}</article>)}<form onSubmit={reply}><textarea name="body" value={body} onChange={(event) => setBody(event.target.value)} rows={4} required maxLength={1200} placeholder={t("写下你的回复", "Write a reply")} /><button>{signedIn ? t("发布回复", "Publish reply") : t("登录后回复", "Log in to reply")}</button>{message ? <p aria-live="polite">{translateMessage(message)}</p> : null}</form></section>
  </>;
}
