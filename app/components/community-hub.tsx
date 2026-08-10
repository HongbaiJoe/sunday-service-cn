"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { uploadMedia } from "../lib/client-upload";

type Post = { id: string; title: string; body: string; tags: string; mediaUrl?: string | null; createdAt: string; author: string; username: string; commentCount: number };
type Session = { user: null | { displayName: string } };

export function CommunityHub() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const [postResponse, sessionResponse] = await Promise.all([fetch("/api/posts", { cache: "no-store" }), fetch("/api/session", { cache: "no-store" })]);
    setPosts(((await postResponse.json()) as { posts: Post[] }).posts ?? []);
    setSession((await sessionResponse.json()) as Session);
  }
  useEffect(() => {
    let active = true;
    void Promise.all([fetch("/api/posts", { cache: "no-store" }), fetch("/api/session", { cache: "no-store" })]).then(async ([postResponse, sessionResponse]) => ({ posts: ((await postResponse.json()) as { posts: Post[] }).posts ?? [], session: (await sessionResponse.json()) as Session })).then((result) => { if (active) { setPosts(result.posts); setSession(result.session); } });
    return () => { active = false; };
  }, []);

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    let mediaUrl: string | null = null;
    const file = form.get("file");
    if (file instanceof File && file.size > 0) {
      try { mediaUrl = (await uploadMedia(file)).url ?? null; }
      catch (error) { setMessage(error instanceof Error ? error.message : "媒体上传失败"); setBusy(false); return; }
    }
    const response = await fetch("/api/posts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: form.get("title"), body: form.get("body"), tags: form.get("tags"), mediaUrl }) });
    const data = await response.json() as { error?: string };
    setMessage(response.ok ? "帖子已发布" : data.error ?? "发布失败");
    if (response.ok) { event.currentTarget.reset(); await load(); }
    setBusy(false);
  }

  return (
    <>
      <section className="composer-wrap">
        {session?.user ? <form className="composer real-composer" onSubmit={publish}>
          <label htmlFor="post-title">现在想聊什么？</label>
          <input id="post-title" name="title" placeholder="帖子标题" required maxLength={120} />
          <textarea name="body" placeholder="写下你的看法、评分或创作过程……" rows={5} required maxLength={5000} />
          <div className="composer-fields"><input name="tags" placeholder="标签，用逗号分隔" maxLength={240} /><label className="file-button">＋ 图片 / 视频 / 音频<input name="file" type="file" accept="image/*,video/*,audio/*" /></label></div>
          <button className="system-button inverse" disabled={busy}>{busy ? "正在发布…" : "发布帖子"}</button>
          {message ? <p className="form-message" aria-live="polite">{message}</p> : null}
        </form> : <div className="composer-login"><h2>登录后发表内容</h2><p>帖子会保存到社区数据库，也可以附带图片、视频或音频。</p><Link className="system-button inverse" href="/account">登录 / 注册 ↗</Link></div>}
      </section>

      <section className="live-feed" aria-label="社区帖子">
        {posts.map((post, index) => <article className={`live-post ${index % 3 === 0 ? "live-post-black" : index % 3 === 1 ? "live-post-lime" : "live-post-blue"}`} key={post.id}>
          <div className="feed-number">{String(index + 1).padStart(3, "0")}</div>
          <div className="feed-body"><p className="eyebrow">{post.tags || "社区讨论"}</p><h2>{post.title}</h2><p>{post.body}</p><div className="feed-meta">{post.author} · {post.commentCount} 回复 · {new Date(post.createdAt).toLocaleDateString("zh-CN")}</div><Link className="text-link" href={`/community/post/${post.id}`}>阅读全文 ↗</Link></div>
          {post.mediaUrl ? <MediaPreview url={post.mediaUrl} /> : <div className="post-monogram" aria-hidden="true">{post.author.slice(0, 1)}</div>}
        </article>)}
      </section>
    </>
  );
}

function MediaPreview({ url }: { url: string }) {
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return <video className="live-media" src={url} controls preload="metadata" />;
  if (/\.(mp3|wav|m4a|ogg)(\?|$)/i.test(url)) return <audio className="live-audio" src={url} controls preload="metadata" />;
  return <img className="live-media" src={url} alt="帖子附件" />;
}
