"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { uploadMedia } from "../lib/client-upload";

export function SubmissionForm({ type }: { type: "library" | "exhibition" }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { void fetch("/api/session", { cache: "no-store" }).then((response) => response.json() as Promise<{ user: unknown }>).then((data) => setSignedIn(Boolean(data.user))); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    let mediaUrl: string | null = null;
    const file = form.get("file");
    if (file instanceof File && file.size > 0) {
      try { mediaUrl = (await uploadMedia(file)).url ?? null; }
      catch (error) { setMessage(error instanceof Error ? error.message : "上传失败"); setBusy(false); return; }
    }
    const payload = type === "library" ? { category: form.get("category"), title: form.get("title"), summary: form.get("summary"), body: form.get("body"), sourceUrl: form.get("sourceUrl"), mediaUrl } : { title: form.get("title"), summary: form.get("summary"), curatorialStatement: form.get("body"), externalUrl: form.get("externalUrl"), coverUrl: mediaUrl };
    const response = await fetch(type === "library" ? "/api/library" : "/api/exhibitions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json() as { error?: string };
    setMessage(response.ok ? "提交成功，管理员审核后会公开展示。" : result.error ?? "提交失败");
    if (response.ok) event.currentTarget.reset();
    setBusy(false);
  }

  if (signedIn === null) return <div className="system-loading">正在确认成员身份…</div>;
  if (!signedIn) return <section className="account-gate"><h2>登录后才能提交</h2><p>提交内容会进入管理员审核队列。</p><Link className="system-button" href="/account">登录 / 注册 ↗</Link></section>;
  return <form className="submission-form system-form" onSubmit={submit}>
    {type === "library" ? <label>资料分类<select name="category" required defaultValue=""><option value="" disabled>选择分类</option><option>歌曲</option><option>人物</option><option>档案</option><option>流派</option><option>课程</option><option>原创</option></select></label> : null}
    <label>{type === "library" ? "资料标题" : "展览标题"}<input name="title" required maxLength={140} /></label>
    <label>简短介绍<textarea name="summary" required rows={3} maxLength={320} /></label>
    <label>{type === "library" ? "正文与资料说明" : "策展说明"}<textarea name="body" required rows={10} maxLength={12000} /></label>
    {type === "library" ? <label>资料来源链接<input name="sourceUrl" type="url" placeholder="https://" /></label> : <label>独立展厅网址<input name="externalUrl" type="url" placeholder="https://" /></label>}
    <label>{type === "library" ? "图片、音频或视频" : "展览封面"}<input name="file" type="file" accept={type === "library" ? "image/*,video/*,audio/*" : "image/*"} /></label>
    <p className="form-hint">单个文件不超过 25MB。提交后不会立刻公开。</p>
    <button type="submit" disabled={busy}>{busy ? "正在提交…" : "提交审核"}</button>
    {message ? <p className="form-message" aria-live="polite">{message}</p> : null}
  </form>;
}
