"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type AccessSession = { developmentPreview: boolean; signInPath: string; user: unknown };

export function MemberAccessForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [session, setSession] = useState<AccessSession | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void fetch("/api/session", { cache: "no-store" }).then((response) => response.json() as Promise<AccessSession>).then((data) => { if (active) setSession(data); });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.developmentPreview) return;
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/dev-session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "member", identifier: form.get("identifier"), displayName: form.get("displayName") }),
    });
    const result = await response.json() as { error?: string };
    if (response.ok) router.push("/account");
    else { setMessage(result.error ?? "登录失败"); setBusy(false); }
  }

  if (!session) return <div className="system-loading">正在准备成员入口…</div>;
  if (!session.developmentPreview) return (
    <div className="access-provider-note">
      <p>正式站点当前由托管平台完成安全登录。邮箱验证码和手机短信验证码需要在部署前接入认证服务。</p>
      <a className="system-button inverse" href={session.signInPath}>继续安全登录 ↗</a>
      <Link className="text-link" href="/account">返回账户</Link>
    </div>
  );

  return (
    <form className="member-access-form" onSubmit={submit}>
      {mode === "register" ? <label>显示名称<input name="displayName" required maxLength={50} placeholder="你希望在社区中使用的名字" /></label> : <input type="hidden" name="displayName" value="本地成员" />}
      <label>邮箱或手机号<input name="identifier" required inputMode="email" autoComplete="username" placeholder="name@example.com / +86 138…" /></label>
      <p>本地原型会直接建立测试身份，不会发送验证码。正式上线必须接入邮件和短信验证服务。</p>
      <button className="system-button inverse" type="submit" disabled={busy}>{busy ? "正在进入…" : mode === "register" ? "创建测试成员" : "进入社区"}</button>
      {message ? <p className="form-message" aria-live="polite">{message}</p> : null}
    </form>
  );
}
