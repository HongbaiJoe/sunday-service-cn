"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { uploadMedia } from "../lib/client-upload";
import { RichEditor, EditorToolbar, EditorCanvas } from "./rich-editor";
import { DEFAULT_ARTICLE_BACKGROUND, htmlToText, type ArticleContent } from "../lib/blocks";

const LIBRARY_CATEGORIES = ["歌曲", "人物", "档案", "流派", "课程", "原创"];

const EMPTY_CONTENT: ArticleContent = { version: 3, html: "", background: DEFAULT_ARTICLE_BACKGROUND, floats: [] };

export function SubmissionForm({ type }: { type: "library" | "exhibition" }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState("");
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState<ArticleContent>(EMPTY_CONTENT);
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const draftKey = `sscn_draft_submit_${type}`;

  // 展览封面图本地预览（选择文件后生成临时 URL，更换/卸载时释放）
  useEffect(() => {
    if (!file) { setCoverPreviewUrl(null); return; }
    const objectUrl = URL.createObjectURL(file);
    setCoverPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  useEffect(() => { void fetch("/api/session", { cache: "no-store" }).then((response) => response.json() as Promise<{ user: unknown }>).then((data) => setSignedIn(Boolean(data.user))); }, []);

  // 恢复未提交的草稿（登录回跳后）
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw) as { category?: string; title?: string; summary?: string; content?: ArticleContent; url?: string };
        if (draft.category) setCategory(draft.category);
        if (draft.title) setTitle(draft.title);
        if (draft.summary) setSummary(draft.summary);
        if (draft.content) setContent(draft.content);
        if (draft.url) setUrl(draft.url);
      }
    } catch { /* 忽略损坏的草稿 */ }
  }, [draftKey]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    if (!signedIn) {
      localStorage.setItem(draftKey, JSON.stringify({ category, title, summary, content, url }));
      setBusy(false);
      window.location.assign(`/login?returnTo=/submit/${type}`);
      return;
    }
    if (type === "library" && !category) { setMessage("请先选择资料分类"); setBusy(false); return; }
    const plainText = htmlToText(content.html);
    if (!plainText.trim()) { setMessage("请填写正文内容"); setBusy(false); return; }
    let coverUrl: string | null = null;
    if (file && file.size > 0) {
      try { coverUrl = (await uploadMedia(file)).url ?? null; }
      catch (error) { setMessage(error instanceof Error ? error.message : "上传失败"); setBusy(false); return; }
    }
    const blocks = JSON.stringify(content);
    const payload = type === "library"
      ? { category, title, summary, body: plainText, sourceUrl: url, mediaUrl: coverUrl, blocks }
      : { title, summary, curatorialStatement: plainText, externalUrl: url, coverUrl, blocks };
    const response = await fetch(type === "library" ? "/api/library" : "/api/exhibitions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json() as { error?: string };
    setMessage(response.ok ? "提交成功，管理员审核后会公开展示。" : result.error ?? "提交失败");
    if (response.ok) {
      setCategory(""); setTitle(""); setSummary(""); setContent(EMPTY_CONTENT); setUrl(""); setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      localStorage.removeItem(draftKey);
    }
    setBusy(false);
  }

  if (signedIn === null) return <div className="system-loading">正在确认成员身份…</div>;

  return (
    <form className="submission-form system-form" onSubmit={submit}>
      {/* 隐藏文件输入放在表单根部（不放右侧面板内），避免移动端面板 display:none 导致程序化点击失效；用裁剪法隐藏而非 display:none，兼容 iOS */}
      <input ref={fileRef} type="file" accept="image/*" className="cover-file-input" tabIndex={-1} aria-hidden="true" onChange={(event) => { setFile(event.target.files?.[0] ?? null); event.target.value = ""; }} />
      <RichEditor value={content} onChange={setContent}>
        <div className="submission-workspace">
          <aside className="workspace-tools">
            <EditorToolbar />
          </aside>

          <div className="workspace-canvas">
            {type === "library" ? (
              <div className="category-toggle-wrap">
                <button type="button" className={`category-toggle${category ? " has-value" : ""}`} onClick={() => setCategoriesOpen((open) => !open)} aria-expanded={categoriesOpen}>
                  {category || "选择分类"} <span aria-hidden="true">▾</span>
                </button>
                {categoriesOpen ? (
                  <div className="category-popover">
                    {LIBRARY_CATEGORIES.map((item) => (
                      <button type="button" key={item} className={category === item ? "active" : ""} onClick={() => { setCategory(item); setCategoriesOpen(false); }}>{item}</button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <label>{type === "library" ? "标题" : "展览标题"}<input name="title" value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={140} placeholder={type === "library" ? "给这份资料起个标题" : "展览名称"} /></label>
            <label>简短介绍<textarea name="summary" value={summary} onChange={(event) => setSummary(event.target.value)} required rows={3} maxLength={320} placeholder="一句话说明这是什么" /></label>

            <div className="body-field">
              <span className="body-field-label">正文</span>
              <EditorCanvas />
            </div>

            {/* 移动端右侧面板隐藏，此处保留封面上传入口（桌面端入口在封面预览下方） */}
            <div className="cover-upload-mobile">
              <button type="button" className="cover-upload-button" onClick={() => fileRef.current?.click()}>{file ? "更换封面" : "上传封面"}</button>
              {file ? <span className="cover-upload-name">{file.name}</span> : null}
            </div>
            <label>{type === "library" ? "资料来源链接" : "独立展厅网址"}<input name="sourceUrl" value={url} onChange={(event) => setUrl(event.target.value)} type="url" placeholder="https://" /></label>

            <button type="submit" disabled={busy}>{busy ? "正在提交…" : signedIn ? "提交审核" : "登录后提交"}</button>
            {!signedIn ? <p className="form-hint">可以先填写内容，提交时会带你登录，文字内容不会丢失。</p> : null}
            {message ? <p className={`form-message${message.includes("成功") ? " success" : ""}`} aria-live="polite">{message}</p> : null}
          </div>

          <div className="workspace-side">
            <div className="cover-preview">
              <p className="cover-preview-label">封面预览</p>
              {type === "library" ? (
                <article className="library-card cover-preview-card">
                  <div className="cover-preview-art" style={coverPreviewUrl ? undefined : { background: content.background }}>
                    {coverPreviewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="cover-preview-art-img" src={coverPreviewUrl} alt="封面预览" />
                    ) : null}
                    <div className="cover-preview-scrim" aria-hidden="true" />
                  </div>
                  <div className="card-top"><span>预览</span><span>{category || "未选分类"}</span></div>
                  <h2>{title.trim() || "标题将显示在这里"}</h2>
                  <p className={summary.trim() ? "" : "empty"}>{summary.trim() || "简短介绍将显示在这里"}</p>
                  <small>你 · 审核通过后展示</small>
                </article>
              ) : (
                <article className="cover-preview-card cover-preview-exhibition">
                  <div className="cover-preview-art">
                    {coverPreviewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="cover-preview-art-img" src={coverPreviewUrl} alt="展览封面预览" />
                    ) : <span className="cover-preview-empty-hint">选择封面后在此预览</span>}
                    {coverPreviewUrl ? <div className="cover-preview-scrim" aria-hidden="true" /> : null}
                  </div>
                  <p className="eyebrow">EXHIBITION · 展览</p>
                  <h2>{title.trim() || "展览标题将显示在这里"}</h2>
                  <p className={summary.trim() ? "" : "empty"}>{summary.trim() || "一句话说明将显示在这里"}</p>
                  <small>你 · 审核通过后展示</small>
                </article>
              )}
              <div className="cover-preview-upload">
                <button type="button" className="cover-upload-button" onClick={() => fileRef.current?.click()}>{file ? "更换封面" : "上传封面"}</button>
                <span className="cover-upload-name">{file ? file.name : "图片格式，选填"}</span>
              </div>
              <p className="cover-preview-hint">{type === "library" ? "封面是卡片底层，标题与简介叠在上方；未上传封面时使用画布背景色。审核通过后，这份资料会以这张卡片出现在资料库中。" : "封面是卡片底层，标题与简介叠在上方。审核通过后，展览会以这张封面出现在展厅列表中。"}</p>
            </div>
          </div>
        </div>
      </RichEditor>
    </form>
  );
}
