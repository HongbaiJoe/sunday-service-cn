"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useState } from "react";
import { SITE_ASSET_KEYS, SITE_ASSET_LABELS, SITE_ASSET_LABELS_EN, type SiteAsset } from "../lib/site-assets-meta";
import { useLocale } from "./locale-provider";

type ReviewItem = { id: string; title: string; summary: string; body?: string; titleEn?: string; summaryEn?: string; bodyEn?: string; category?: string; categoryEn?: string; status: string; owner: string; reviewerNote?: string };
type ManagedUser = { id: string; displayName: string; username: string; email: string; role: string; status: string; createdAt: string };
type ManagedComment = { id: string; body: string; bodyEn?: string; status: string; author: string; postId: string; postTitle: string; postTitleEn?: string };
type ManagedPost = { id: string; title: string; body: string; titleEn?: string; bodyEn?: string; status: string; author: string; createdAt: string };
type DashboardData = { library: ReviewItem[]; exhibitions: ReviewItem[]; posts: ManagedPost[]; users: ManagedUser[]; comments: ManagedComment[]; error?: string };

export function AdminDashboard() {
  const { locale, t, dateLocale, translateMessage } = useLocale();
  const [data, setData] = useState<DashboardData | null>(null);
  const [message, setMessage] = useState("");
  const [assets, setAssets] = useState<Record<string, SiteAsset> | null>(null);
  const [assetMessage, setAssetMessage] = useState("");

  async function load() {
    const response = await fetch("/api/admin/review", { cache: "no-store" });
    setData((await response.json()) as DashboardData);
  }
  useEffect(() => {
    let active = true;
    void fetch("/api/admin/review", { cache: "no-store" }).then((response) => response.json() as Promise<DashboardData>).then((result) => { if (active) setData(result); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    void fetch("/api/assets", { cache: "no-store" }).then((response) => response.json() as Promise<{ assets: Record<string, SiteAsset> }>).then((result) => { if (active) setAssets(result.assets); });
    return () => { active = false; };
  }, []);

  async function uploadAsset(key: string, file: File) {
    const form = new FormData();
    form.append("key", key);
    form.append("file", file);
    const response = await fetch("/api/assets", { method: "PUT", body: form });
    const result = await response.json() as { error?: string };
    setAssetMessage(response.ok ? "素材已更新" : result.error ?? "上传失败");
    if (response.ok) {
      const reload = await fetch("/api/assets", { cache: "no-store" });
      setAssets(((await reload.json()) as { assets: Record<string, SiteAsset> }).assets);
    }
  }

  async function act(entityType: string, entityId: string, action: string) {
    const note = entityType === "library" || entityType === "exhibition" ? window.prompt(t("审核备注（可留空）", "Review note (optional)")) ?? "" : "";
    const translation: Record<string, string> = {};
    if (action === "approve" || action === "publish") {
      if (entityType === "library" || entityType === "exhibition") {
        const item = (entityType === "library" ? data?.library : data?.exhibitions)?.find((candidate) => candidate.id === entityId);
        if (item) {
          if (entityType === "library") translation.categoryEn = window.prompt(t("英文分类", "English category"), item.categoryEn ?? "") ?? item.categoryEn ?? "";
          translation.titleEn = window.prompt(t("英文标题（用于翻译按钮）", "English title"), item.titleEn ?? "") ?? item.titleEn ?? "";
          translation.summaryEn = window.prompt(t("英文简介", "English summary"), item.summaryEn ?? "") ?? item.summaryEn ?? "";
          translation.bodyEn = window.prompt(t("英文正文或策展说明", "English body or curatorial statement"), item.bodyEn ?? "") ?? item.bodyEn ?? "";
        }
      } else if (entityType === "post") {
        const item = data?.posts.find((candidate) => candidate.id === entityId);
        if (item) { translation.titleEn = window.prompt(t("英文标题", "English title"), item.titleEn ?? "") ?? item.titleEn ?? ""; translation.bodyEn = window.prompt(t("英文正文", "English body"), item.bodyEn ?? "") ?? item.bodyEn ?? ""; }
      } else if (entityType === "comment") {
        const item = data?.comments.find((candidate) => candidate.id === entityId);
        if (item) translation.bodyEn = window.prompt(t("英文回复", "English reply"), item.bodyEn ?? "") ?? item.bodyEn ?? "";
      }
    }
    const response = await fetch("/api/admin/review", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ entityType, entityId, action, note, ...translation }) });
    const result = await response.json() as { error?: string };
    setMessage(response.ok ? "操作已记录" : result.error ?? "操作失败");
    if (response.ok) await load();
  }

  if (!data) return <div className="system-loading">{t("正在读取后台…", "Loading admin dashboard…")}</div>;
  if (data.error) return <section className="account-gate"><h2>{t("无法进入后台", "Admin access unavailable")}</h2><p>{data.error}</p><Link className="system-button" href="/account">{t("返回账户", "Back to account")}</Link></section>;

  return <div className="admin-dashboard">
    <header className="admin-toolbar"><div><p className="eyebrow">CONTROL ROOM · {t("管理后台", "ADMIN")}</p><h2>{data.library.length + data.exhibitions.length} {t("项待审核", "items awaiting review")}</h2></div><a className="system-button" href="/api/admin/backup">{t("导出数据备份", "Export data backup")} ↓</a></header>
    {message ? <p className="admin-message" aria-live="polite">{translateMessage(message)}</p> : null}
    <AdminReviewSection title={t("资料库审核", "Archive review")} type="library" items={data.library} onAct={act} />
    <AdminReviewSection title={t("展览审核", "Exhibition review")} type="exhibition" items={data.exhibitions} onAct={act} />
    <section className="admin-section"><div className="admin-section-title"><h3>{t("帖子管理", "Post management")}</h3></div><div className="admin-table">{data.posts.map((post) => { const builtIn = post.id.startsWith("seed-"); return <article key={post.id}><div><strong>{builtIn && locale === "en" ? post.titleEn || post.title : post.title}</strong><p>{builtIn && locale === "en" ? "SS/CN Editorial" : post.author}</p><small>{new Date(post.createdAt).toLocaleDateString(dateLocale)} · {post.status}</small></div><div className="admin-buttons"><button onClick={() => act("post", post.id, "publish")}>{t("公开", "Publish")}</button><button onClick={() => act("post", post.id, "hide")}>{t("隐藏", "Hide")}</button></div></article>; })}</div></section>
    <section className="admin-section"><div className="admin-section-title"><h3>{t("评论管理", "Comment management")}</h3></div><div className="admin-table">{data.comments.map((comment) => <article key={comment.id}><div><strong>{comment.author}</strong><p>{comment.body}</p><small>{comment.postId.startsWith("seed-") && locale === "en" ? comment.postTitleEn || comment.postTitle : comment.postTitle} · {comment.status}</small></div><div className="admin-buttons"><button onClick={() => act("comment", comment.id, "publish")}>{t("公开", "Publish")}</button><button onClick={() => act("comment", comment.id, "hide")}>{t("隐藏", "Hide")}</button></div></article>)}</div></section>
    <section className="admin-section"><div className="admin-section-title"><h3>{t("用户管理", "User management")}</h3></div><div className="admin-table">{data.users.map((user) => <article key={user.id}><div><strong>{user.displayName}</strong><p>@{user.username} · {user.email}</p><small>{user.role} · {user.status}</small></div><div className="admin-buttons"><button onClick={() => act("user", user.id, user.status === "active" ? "suspend" : "activate")}>{user.status === "active" ? t("暂停", "Suspend") : t("恢复", "Restore")}</button><button onClick={() => act("user", user.id, user.role === "admin" ? "demote" : "promote")}>{user.role === "admin" ? t("降为成员", "Make member") : t("设为管理员", "Make admin")}</button></div></article>)}</div></section>
    <section className="admin-section"><div className="admin-section-title"><h3>{t("素材管理", "Asset management")}</h3></div>{assetMessage ? <p className="admin-message" aria-live="polite">{translateMessage(assetMessage)}</p> : null}<div className="admin-table">{SITE_ASSET_KEYS.map((key) => { const asset = assets?.[key]; const label = t(SITE_ASSET_LABELS[key], SITE_ASSET_LABELS_EN[key]); return <article key={key}><div><strong>{label}</strong><p>{asset ? <img src={asset.url} alt={label} style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8 }} /> : t("使用默认图", "Using default image")}</p></div><div className="admin-buttons"><label className="system-button" style={{ cursor: "pointer" }}>{t("上传替换", "Upload replacement")}<input type="file" accept="image/*" style={{ display: "none" }} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAsset(key, file); event.target.value = ""; }} /></label></div></article>; })}</div></section>
  </div>;
}

function AdminReviewSection({ title, type, items, onAct }: { title: string; type: string; items: ReviewItem[]; onAct: (type: string, id: string, action: string) => void }) {
  const { t } = useLocale();
  return <section className="admin-section"><div className="admin-section-title"><h3>{title}</h3></div>{items.length ? <div className="admin-table">{items.map((item) => <article key={item.id}><div><strong>{item.title}</strong><p>{item.summary}</p><small>{item.owner} · {item.status}{item.category ? ` · ${item.category}` : ""}</small></div><div className="admin-buttons"><button onClick={() => onAct(type, item.id, "approve")}>{t("通过", "Approve")}</button><button onClick={() => onAct(type, item.id, "reject")}>{t("退回", "Return")}</button></div></article>)}</div> : <p className="admin-empty">{t("目前没有待处理内容。", "Nothing is awaiting review.")}</p>}</section>;
}
