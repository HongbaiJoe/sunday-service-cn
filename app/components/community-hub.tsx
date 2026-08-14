"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { uploadMedia } from "../lib/client-upload";
import { useLocale } from "./locale-provider";

type Post = { id: string; title: string; body: string; tags: string; titleEn?: string | null; bodyEn?: string | null; tagsEn?: string | null; mediaUrl?: string | null; createdAt: string; author: string; username: string; commentCount: number };
type Session = { user: null | { displayName: string } };

const DRAFT_KEY = "sscn_draft_community_post";

export function CommunityHub() {
  const router = useRouter();
  const { locale, t, dateLocale, translateMessage } = useLocale();
  const [posts, setPosts] = useState<Post[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [translated, setTranslated] = useState<Record<string, boolean>>({});
  const fileRef = useRef<HTMLInputElement>(null);

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

  // 恢复未发布的文字草稿（登录回跳后）
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as { title?: string; body?: string; tags?: string };
        // eslint-disable-next-line react-hooks/set-state-in-effect -- restore a browser-only draft after hydration
        if (draft.title) setTitle(draft.title);
        if (draft.body) setBody(draft.body);
        if (draft.tags) setTags(draft.tags);
      }
    } catch { /* 忽略损坏的草稿 */ }
  }, []);

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("");
    if (!session?.user) {
      // 未登录：先保存文字草稿再去登录，登录后回到本页继续
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, body, tags }));
      setBusy(false);
      router.push("/login?returnTo=/community");
      return;
    }
    let mediaUrl: string | null = null;
    if (file && file.size > 0) {
      try { mediaUrl = (await uploadMedia(file)).url ?? null; }
      catch (error) { setMessage(error instanceof Error ? error.message : "媒体上传失败"); setBusy(false); return; }
    }
    const response = await fetch("/api/posts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, body, tags, mediaUrl }) });
    const data = await response.json() as { error?: string };
    setMessage(response.ok ? "帖子已发布" : data.error ?? "发布失败");
    if (response.ok) {
      setTitle(""); setBody(""); setTags(""); setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      localStorage.removeItem(DRAFT_KEY);
      await load();
    }
    setBusy(false);
  }

  return (
    <>
      <section className="composer-wrap">
        <form className="composer real-composer" onSubmit={publish}>
          <label htmlFor="post-title">{t("现在想聊什么？", "What do you want to talk about?")}</label>
          <input id="post-title" name="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t("帖子标题", "Post title")} required maxLength={120} />
          <textarea name="body" value={body} onChange={(event) => setBody(event.target.value)} placeholder={t("写下你的看法、评分或创作过程……", "Share a thought, rating or work in progress…")} rows={5} required maxLength={5000} />
          <div className="composer-fields"><input name="tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder={t("标签，用逗号分隔", "Tags, separated by commas")} maxLength={240} />{session?.user ? <label className="file-button">＋ {t("图片 / 视频 / 音频", "Image / Video / Audio")}<input ref={fileRef} name="file" type="file" accept="image/*,video/*,audio/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label> : null}</div>
          <button className="system-button inverse" disabled={busy}>{busy ? t("正在发布…", "Publishing…") : session?.user ? t("发布帖子", "Publish post") : t("登录后发布", "Log in to publish")}</button>
          {!session?.user ? <p className="form-hint">{t("可以先写内容，发布时会带你登录，文字草稿不会丢失。", "Start writing now. You will be asked to log in when publishing, and your draft will be kept.")}</p> : null}
          {message ? <p className="form-message" aria-live="polite">{translateMessage(message)}</p> : null}
        </form>
      </section>

      <section className="live-feed" aria-label={t("社区帖子", "Community posts")}>
        {posts.map((post, index) => { const builtIn = post.id.startsWith("seed-"); const hasEnglish = Boolean(post.titleEn && post.bodyEn); const showEnglish = hasEnglish && (builtIn ? locale === "en" : translated[post.id]); return <article className={`live-post ${index % 3 === 0 ? "live-post-black" : index % 3 === 1 ? "live-post-lime" : "live-post-blue"}`} key={post.id}>
          <div className="feed-number">{String(index + 1).padStart(3, "0")}</div>
          <div className="feed-body"><p className="eyebrow">{showEnglish ? post.tagsEn : post.tags || t("社区讨论", "COMMUNITY")}</p><h2>{showEnglish ? post.titleEn : post.title}</h2><p>{showEnglish ? post.bodyEn : post.body}</p><div className="feed-meta">{builtIn && locale === "en" ? "SS/CN Editorial" : post.author} · {post.commentCount} {t("回复", "replies")} · {new Date(post.createdAt).toLocaleDateString(dateLocale)}</div><Link className="text-link" href={`/community/post/${post.id}`}>{t("阅读全文", "Read more")} ↗</Link>{!builtIn && hasEnglish ? <button className="translation-toggle" type="button" onClick={() => setTranslated((current) => ({ ...current, [post.id]: !current[post.id] }))}>{translated[post.id] ? t("显示原文", "Show original") : t("查看英文翻译", "View English translation")}</button> : null}</div>
          {post.mediaUrl ? <MediaPreview url={post.mediaUrl} /> : <div className="post-monogram" aria-hidden="true">{post.author.slice(0, 1)}</div>}
        </article>; })}
      </section>
    </>
  );
}

function MediaPreview({ url }: { url: string }) {
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return <video className="live-media" src={url} controls preload="metadata" />;
  if (/\.(mp3|wav|m4a|ogg)(\?|$)/i.test(url)) return <audio className="live-audio" src={url} controls preload="metadata" />;
  return <img className="live-media" src={url} alt="" />;
}
