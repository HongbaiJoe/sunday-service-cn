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

  async function reply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const response = await fetch("/api/comments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ postId: id, body: form.get("body") }) });
    const data = await response.json() as { error?: string };
    setMessage(response.ok ? "回复已发布" : data.error ?? "回复失败");
    if (response.ok) { event.currentTarget.reset(); await load(); }
  }

  if (!post) return <section className="post-detail"><Link className="back-link" href="/community">← 返回社区</Link><h1>正在读取帖子…</h1></section>;
  return <>
    <article className="post-detail"><Link className="back-link" href="/community">← 返回社区</Link><p className="eyebrow">{post.tags}</p><h1>{post.title}</h1><div className="post-byline">{post.author} · {new Date(post.createdAt).toLocaleString("zh-CN")}</div>{post.mediaUrl ? <img src={post.mediaUrl} alt="帖子附件" /> : null}<div className="post-copy"><p>{post.body}</p></div></article>
    <section className="reply-section"><h2>{comments.length} 条回复</h2>{comments.map((comment) => <article className="reply" key={comment.id}><strong>{comment.author}</strong><p>{comment.body}</p></article>)}{signedIn ? <form onSubmit={reply}><textarea name="body" rows={4} required maxLength={1200} placeholder="写下你的回复" /><button>发布回复</button>{message ? <p aria-live="polite">{message}</p> : null}</form> : <Link className="system-button" href="/account">登录后回复</Link>}</section>
  </>;
}
