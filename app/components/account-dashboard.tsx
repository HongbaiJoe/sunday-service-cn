"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { uploadMedia } from "../lib/client-upload";

type User = {
  displayName: string;
  username: string;
  email: string;
  phone: string;
  phoneVerified: boolean;
  bio: string;
  avatarUrl: string;
  role: "member" | "admin";
};
type Session = {
  user: User | null;
  developmentPreview: boolean;
  signInPath: string;
  signOutPath: string;
};

export function AccountDashboard() {
  const [session, setSession] = useState<Session | null>(null);

  async function load() {
    const response = await fetch("/api/session", { cache: "no-store" });
    setSession((await response.json()) as Session);
  }
  useEffect(() => {
    let active = true;
    void fetch("/api/session", { cache: "no-store" }).then((response) => response.json() as Promise<Session>).then((data) => { if (active) setSession(data); });
    return () => { active = false; };
  }, []);

  async function preview(role: "member" | "admin") {
    await fetch("/api/dev-session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ role }) });
    await load();
  }

  async function signOutPreview() {
    await fetch("/api/dev-session", { method: "DELETE" });
    await load();
  }

  if (!session) return <div className="system-loading">正在读取账户…</div>;
  if (!session.user) return (
    <section className="account-gate">
      <p className="eyebrow">MEMBER ACCESS · 用户系统</p>
      <h2>登录后参与讨论、提交资料与申请展览。</h2>
      <div className="account-entry-buttons"><Link className="system-button" href="/login">邮箱或手机号登录</Link><Link className="system-button secondary" href="/register">注册成员</Link></div>
      {!session.developmentPreview ? <a className="text-link" href={session.signInPath}>使用平台账户安全登录 ↗</a> : null}
      {session.developmentPreview ? <div className="dev-preview"><p>本地快速测试入口</p><button onClick={() => preview("member")}>默认成员</button><button onClick={() => preview("admin")}>管理员</button></div> : null}
    </section>
  );

  return <ProfileEditor key={`${session.user.email}-${session.user.avatarUrl}`} user={session.user} developmentPreview={session.developmentPreview} signOutPath={session.signOutPath} onSaved={load} onPreviewSignOut={signOutPreview} />;
}

function ProfileEditor({ user, developmentPreview, signOutPath, onSaved, onPreviewSignOut }: { user: User; developmentPreview: boolean; signOutPath: string; onSaved: () => Promise<void>; onPreviewSignOut: () => Promise<void> }) {
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = { ...Object.fromEntries(form), avatarUrl };
    const response = await fetch("/api/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json() as { error?: string };
    setMessage(response.ok ? "资料已保存" : result.error ?? "保存失败");
    if (response.ok) await onSaved();
  }

  async function chooseAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setMessage("头像必须是图片文件"); return; }
    setUploading(true);
    setMessage("正在上传头像…");
    try {
      const result = await uploadMedia(file);
      setAvatarUrl(result.url ?? "");
      setMessage("头像已上传，请保存个人资料");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "头像上传失败");
    } finally { setUploading(false); }
  }

  return (
    <div className="account-layout">
      <section className="account-card">
        <p className="eyebrow">SIGNED IN · 已登录</p>
        <div className="profile-heading">
          <div className="profile-avatar">{avatarUrl ? <img src={avatarUrl} alt={`${user.displayName} 的头像`} /> : <span>{user.displayName.slice(0, 1)}</span>}</div>
          <div><h2>{user.displayName}</h2><p>@{user.username} · {user.role === "admin" ? "管理员" : "社区成员"}</p></div>
        </div>
        <form className="system-form" onSubmit={save}>
          <label className="avatar-upload">头像<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={chooseAvatar} disabled={uploading} /><span>{uploading ? "上传中…" : "选择图片"}</span></label>
          <label>显示名称<input name="displayName" defaultValue={user.displayName} required maxLength={50} /></label>
          <label>用户名<input name="username" defaultValue={user.username} required maxLength={32} /></label>
          <label>登录邮箱<input value={user.email} readOnly aria-readonly="true" /></label>
          <label>手机号<input name="phone" defaultValue={user.phone} inputMode="tel" placeholder="例如 +86 138 0000 0000" /><small>{user.phoneVerified ? "手机号已验证" : "保存后仍需通过短信验证才能用于正式登录"}</small></label>
          <label>个人简介<textarea name="bio" defaultValue={user.bio} rows={4} maxLength={280} /></label>
          <button type="submit" disabled={uploading}>保存个人资料</button>
          {message ? <p className="form-message" aria-live="polite">{message}</p> : null}
        </form>
      </section>
      <aside className="account-actions">
        <p className="eyebrow">QUICK ACTIONS</p>
        <Link href="/community">发布社区帖子 ↗</Link>
        <Link href="/submit/library">提交资料库内容 ↗</Link>
        <Link href="/submit/exhibition">申请线上展览 ↗</Link>
        {user.role === "admin" ? <Link href="/admin">进入管理员后台 ↗</Link> : null}
        {developmentPreview ? <button onClick={onPreviewSignOut}>退出本地预览身份</button> : <a href={signOutPath}>退出登录</a>}
      </aside>
    </div>
  );
}
