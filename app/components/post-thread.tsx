"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type Post = { id: string; title: string; body: string; tags: string; author: string; createdAt: string; mediaUrl?: string | null };
type Comment = { id: string; body: string; author: string; createdAt: string };

export function PostThread({ id }: { id: string }) {
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [message, setMessage] = useState("");
  const [body, setBody] = useState("");

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
      setBody(raw ?? "");
    } catch { setBody(""); }
  }, [draftKey]);

  async function reply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signedIn) {
      // 未登录：保存草稿后去登录，登录后回到本页继续
      localStorage.setItem(draftKey, body);
      window.location.assign(`/login?returnTo=${encodeURIComponent(`/community/post/${id}`)}`);
      return;
    }
    const response = await fetch("/api/comments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ postId: id, body }) });
    const data = await response.json() as { error?: string };
    setMessage(response.ok ? "回复已发布" : data.error ?? "回复失败");
    if (response.ok) { setBody(""); localStorage.removeItem(draftKey); await load(); }
  }

  if (!post) return <section className="post-detail"><Link className="back-link" href="/community">← 返回社区</Link><h1>正在读取帖子…</h1></section>;
  return <>
    <article className="post-detail"><Link className="back-link" href="/community">← 返回社区</Link><p className="eyebrow">{post.tags}</p><h1>{post.title}</h1><div className="post-byline">{post.author} · {new Date(post.createdAt).toLocaleString("zh-CN")}</div>{post.mediaUrl ? <img src={post.mediaUrl} alt="帖子附件" /> : null}<div className="post-copy"><p>{post.body}</p></div></article>
    <section className="reply-section"><h2>{comments.length} 条回复</h2>{comments.map((comment) => <article className="reply" key={comment.id}><strong>{comment.author}</strong><p>{comment.body}</p></article>)}<form onSubmit={reply}><textarea name="body" value={body} onChange={(event) => setBody(event.target.value)} rows={4} required maxLength={1200} placeholder="写下你的回复" /><button>{signedIn ? "发布回复" : "登录后回复"}</button>{message ? <p aria-live="polite">{message}</p> : null}</form></section>
  </>;
}
