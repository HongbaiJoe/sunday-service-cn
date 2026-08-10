"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ReviewItem = { id: string; title: string; summary: string; status: string; owner: string; category?: string; reviewerNote?: string };
type ManagedUser = { id: string; displayName: string; username: string; email: string; role: string; status: string; createdAt: string };
type ManagedComment = { id: string; body: string; status: string; author: string; postTitle: string };
type ManagedPost = { id: string; title: string; status: string; author: string; createdAt: string };
type DashboardData = { library: ReviewItem[]; exhibitions: ReviewItem[]; posts: ManagedPost[]; users: ManagedUser[]; comments: ManagedComment[]; error?: string };

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/admin/review", { cache: "no-store" });
    setData((await response.json()) as DashboardData);
  }
  useEffect(() => {
    let active = true;
    void fetch("/api/admin/review", { cache: "no-store" }).then((response) => response.json() as Promise<DashboardData>).then((result) => { if (active) setData(result); });
    return () => { active = false; };
  }, []);

  async function act(entityType: string, entityId: string, action: string) {
    const note = entityType === "library" || entityType === "exhibition" ? window.prompt("审核备注（可留空）") ?? "" : "";
    const response = await fetch("/api/admin/review", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ entityType, entityId, action, note }) });
    const result = await response.json() as { error?: string };
    setMessage(response.ok ? "操作已记录" : result.error ?? "操作失败");
    if (response.ok) await load();
  }

  if (!data) return <div className="system-loading">正在读取后台…</div>;
  if (data.error) return <section className="account-gate"><h2>无法进入后台</h2><p>{data.error}</p><Link className="system-button" href="/account">返回账户</Link></section>;

  return <div className="admin-dashboard">
    <header className="admin-toolbar"><div><p className="eyebrow">CONTROL ROOM · 管理后台</p><h2>{data.library.length + data.exhibitions.length} 项待审核</h2></div><a className="system-button" href="/api/admin/backup">导出数据备份 ↓</a></header>
    {message ? <p className="admin-message" aria-live="polite">{message}</p> : null}
    <AdminReviewSection title="资料库审核" type="library" items={data.library} onAct={act} />
    <AdminReviewSection title="展览审核" type="exhibition" items={data.exhibitions} onAct={act} />
    <section className="admin-section"><div className="admin-section-title"><span>03</span><h3>帖子管理</h3></div><div className="admin-table">{data.posts.map((post) => <article key={post.id}><div><strong>{post.title}</strong><p>{post.author}</p><small>{new Date(post.createdAt).toLocaleDateString("zh-CN")} · {post.status}</small></div><div className="admin-buttons"><button onClick={() => act("post", post.id, "publish")}>公开</button><button onClick={() => act("post", post.id, "hide")}>隐藏</button></div></article>)}</div></section>
    <section className="admin-section"><div className="admin-section-title"><span>04</span><h3>评论管理</h3></div><div className="admin-table">{data.comments.map((comment) => <article key={comment.id}><div><strong>{comment.author}</strong><p>{comment.body}</p><small>{comment.postTitle} · {comment.status}</small></div><div className="admin-buttons"><button onClick={() => act("comment", comment.id, "publish")}>公开</button><button onClick={() => act("comment", comment.id, "hide")}>隐藏</button></div></article>)}</div></section>
    <section className="admin-section"><div className="admin-section-title"><span>05</span><h3>用户管理</h3></div><div className="admin-table">{data.users.map((user) => <article key={user.id}><div><strong>{user.displayName}</strong><p>@{user.username} · {user.email}</p><small>{user.role} · {user.status}</small></div><div className="admin-buttons"><button onClick={() => act("user", user.id, user.status === "active" ? "suspend" : "activate")}>{user.status === "active" ? "暂停" : "恢复"}</button><button onClick={() => act("user", user.id, user.role === "admin" ? "demote" : "promote")}>{user.role === "admin" ? "降为成员" : "设为管理员"}</button></div></article>)}</div></section>
  </div>;
}

function AdminReviewSection({ title, type, items, onAct }: { title: string; type: string; items: ReviewItem[]; onAct: (type: string, id: string, action: string) => void }) {
  return <section className="admin-section"><div className="admin-section-title"><span>{type === "library" ? "01" : "02"}</span><h3>{title}</h3></div>{items.length ? <div className="admin-table">{items.map((item) => <article key={item.id}><div><strong>{item.title}</strong><p>{item.summary}</p><small>{item.owner} · {item.status}{item.category ? ` · ${item.category}` : ""}</small></div><div className="admin-buttons"><button onClick={() => onAct(type, item.id, "approve")}>通过</button><button onClick={() => onAct(type, item.id, "reject")}>退回</button></div></article>)}</div> : <p className="admin-empty">目前没有待处理内容。</p>}</section>;
}
