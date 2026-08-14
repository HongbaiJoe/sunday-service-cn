"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { uploadMedia } from "../lib/client-upload";
import { useLocale } from "./locale-provider";
import { COMMUNITY_ENABLED } from "../lib/features";

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
  const { t } = useLocale();
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

  async function signOutSession() {
    await fetch("/api/auth/logout", { method: "POST" });
    await load();
  }

  if (!session) return <div className="system-loading">{t("正在读取账户…", "Loading account…")}</div>;
  if (!session.user) return (
    <section className="account-gate">
      <p className="eyebrow">MEMBER ACCESS · {t("用户系统", "ACCOUNT")}</p>
      <h2>{t("登录后参与讨论、提交资料与申请展览。", "Sign in to join discussions, submit archive entries and propose exhibitions.")}</h2>
      <div className="account-entry-buttons"><Link className="system-button" href="/login">{t("邮箱登录", "Email sign in")}</Link><Link className="system-button secondary" href="/register">{t("注册成员", "Join")}</Link></div>
      {!session.developmentPreview ? <a className="text-link" href={session.signInPath}>{t("使用平台账户安全登录", "Secure platform sign in")} ↗</a> : null}
      {session.developmentPreview ? <div className="dev-preview"><p>{t("本地快速测试入口", "Local preview access")}</p><button onClick={() => preview("member")}>{t("默认成员", "Member")}</button><button onClick={() => preview("admin")}>{t("管理员", "Admin")}</button></div> : null}
    </section>
  );

  return <ProfileEditor key={`${session.user.email}-${session.user.avatarUrl}`} user={session.user} developmentPreview={session.developmentPreview} onSaved={load} onPreviewSignOut={signOutPreview} onSessionSignOut={signOutSession} />;
}

function ProfileEditor({ user, developmentPreview, onSaved, onPreviewSignOut, onSessionSignOut }: { user: User; developmentPreview: boolean; onSaved: () => Promise<void>; onPreviewSignOut: () => Promise<void>; onSessionSignOut: () => Promise<void> }) {
  const { t, translateMessage } = useLocale();
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    // 用户名即显示名称：只提交 displayName，后端会同步 username
    const payload = { displayName: form.get("displayName"), bio: form.get("bio"), avatarUrl };
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
        <p className="eyebrow">SIGNED IN · {t("已登录", "MEMBER")}</p>
        <div className="profile-heading">
          <div className="profile-avatar">{avatarUrl ? <img src={avatarUrl} alt={`${user.displayName} 的头像`} /> : <span>{user.displayName.slice(0, 1)}</span>}</div>
          <div><h2>{user.displayName}</h2><p>{user.role === "admin" ? t("管理员", "Administrator") : t("社区成员", "Community member")}</p></div>
        </div>
        <form className="system-form" onSubmit={save}>
          <label className="avatar-upload">{t("头像", "Avatar")}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={chooseAvatar} disabled={uploading} /><span>{uploading ? t("上传中…", "Uploading…") : t("选择图片", "Choose image")}</span></label>
          <label>{t("用户名（社区中展示的名字）", "Username (public community name)")}<input name="displayName" defaultValue={user.displayName} required maxLength={24} /></label>
          <label>{t("登录邮箱", "Sign-in email")}<input value={user.email} readOnly aria-readonly="true" /></label>
          <label>{t("个人简介", "Bio")}<textarea name="bio" defaultValue={user.bio} rows={4} maxLength={280} /></label>
          <button type="submit" disabled={uploading}>{t("保存个人资料", "Save profile")}</button>
          {message ? <p className="form-message" aria-live="polite">{translateMessage(message)}</p> : null}
        </form>
      </section>
      <aside className="account-actions">
        <p className="eyebrow">QUICK ACTIONS</p>
        {COMMUNITY_ENABLED ? <Link href="/community">{t("发布社区帖子", "Publish a community post")} ↗</Link> : null}
        <Link href="/submit/library">{t("提交资料库内容", "Submit an archive entry")} ↗</Link>
        <Link href="/submit/exhibition">{t("申请线上展览", "Propose an online exhibition")} ↗</Link>
        {user.role === "admin" ? <Link href="/admin">{t("进入管理员后台", "Open admin dashboard")} ↗</Link> : null}
        {developmentPreview ? <button className="sign-out-button" onClick={onPreviewSignOut}>{t("退出本地预览身份", "Exit preview session")}</button> : <button className="sign-out-button" onClick={onSessionSignOut}>{t("退出登录", "Sign out")}</button>}
      </aside>
    </div>
  );
}
