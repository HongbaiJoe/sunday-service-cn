"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useRef, useState } from "react";

type AccessSession = { developmentPreview: boolean; signInPath: string; user: unknown };

const RESEND_COOLDOWN = 60;
type AuthMode = "password" | "code";
type Channel = "phone" | "email";

/** 手机号短信通道开关：当前未配置腾讯云短信，先隐藏；开通后可改为 true 恢复手机号入口。 */
const PHONE_CHANNEL_ENABLED = false;
const ACTIVE_CHANNELS: Channel[] = PHONE_CHANNEL_ENABLED ? ["phone", "email"] : ["email"];

/** 校验 returnTo 只允许站内相对路径，防止开放重定向。 */
function safeReturnTo(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export function MemberAccessForm({ mode }: { mode: "login" | "register" }) {
  return <Suspense fallback={<div className="system-loading">正在准备登录入口…</div>}><AccessFormInner mode={mode} /></Suspense>;
}

function AccessFormInner({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("returnTo"));
  const [session, setSession] = useState<AccessSession | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [channel, setChannel] = useState<Channel>("email");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"account" | "code">("account");
  const [authMode, setAuthMode] = useState<AuthMode>("code");
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isLogin = mode === "login";

  useEffect(() => {
    let active = true;
    void fetch("/api/session", { cache: "no-store" }).then((response) => response.json() as Promise<AccessSession>).then((data) => { if (active) setSession(data); });
    return () => { active = false; };
  }, []);

  // 已登录用户访问登录/注册页时，直接跳回目标页（默认首页）
  useEffect(() => {
    if (session?.user) {
      router.replace(returnTo);
    }
  }, [session, router, returnTo]);

  useEffect(() => {
    if (countdown <= 0) { if (timerRef.current) clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [countdown > 0]);

  const accountValid = channel === "phone" ? phone.trim().length >= 6 : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // 保留 returnTo 的跨页面链接：登录<->注册
  const registerHref = returnTo !== "/" ? `/register?returnTo=${encodeURIComponent(returnTo)}` : "/register";
  const loginHref = returnTo !== "/" ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/login";

  function switchChannel(next: Channel) {
    setChannel(next);
    setStep("account");
    setCode("");
    setPassword("");
    setDisplayName("");
    setMessage("");
  }

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(channel === "phone" ? { channel: "phone", phone } : { channel: "email", email }),
      });
      const result = await response.json() as { error?: string; message?: string };
      if (response.ok) {
        setStep("code");
        setCountdown(RESEND_COOLDOWN);
        setMessage(result.message ?? "验证码已发送，请查收");
      } else {
        setMessage(result.error ?? "发送失败，请稍后再试");
      }
    } catch {
      setMessage("网络异常，请稍后再试");
    } finally { setBusy(false); }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channel,
          ...(channel === "phone" ? { phone } : { email }),
          code,
          password,
          ...(isLogin ? {} : { displayName }),
        }),
      });
      const result = await response.json() as { error?: string; user?: { displayName?: string } };
      if (response.ok) {
        // 登录/注册成功：均已签发会话，直接整页跳转到目标页（默认首页）
        window.location.assign(returnTo);
      } else {
        setMessage(result.error ?? "验证失败，请重试");
        setBusy(false);
      }
    } catch {
      setMessage("网络异常，请稍后再试");
      setBusy(false);
    }
  }

  async function loginWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channel,
          ...(channel === "phone" ? { phone } : { email }),
          password,
        }),
      });
      const result = await response.json() as { error?: string; user?: { displayName?: string } };
      if (response.ok) {
        // 登录成功：立即整页跳转到目标页（默认首页），确保会话 Cookie 生效
        window.location.assign(returnTo);
      } else {
        setMessage(result.error ?? "登录失败，请重试");
      }
    } catch {
      setMessage("网络异常，请稍后再试");
    } finally { setBusy(false); }
  }

  if (!session) return <div className="system-loading">正在准备登录入口…</div>;

  // 开发环境保留快速入口
  if (session.developmentPreview) return <DevPreviewForm mode={mode} returnTo={returnTo} />;

  return (
    <div className="member-access-form">
      {isLogin ? (
        <div className="auth-mode-tabs" role="tablist">
          <button type="button" className={authMode === "code" ? "active" : ""} onClick={() => { setAuthMode("code"); setMessage(""); }} role="tab" aria-selected={authMode === "code"}>验证码登录</button>
          <button type="button" className={authMode === "password" ? "active" : ""} onClick={() => { setAuthMode("password"); setMessage(""); }} role="tab" aria-selected={authMode === "password"}>密码登录</button>
        </div>
      ) : null}

      {isLogin && authMode === "password" ? (
        <form onSubmit={loginWithPassword}>
          {channel === "phone" ? (
            <label>手机号<input name="phone" value={phone} onChange={(event) => setPhone(event.target.value)} required inputMode="tel" autoComplete="tel" placeholder="+86 138 0000 0000" maxLength={20} /></label>
          ) : (
            <label>邮箱<input name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" placeholder="name@example.com" maxLength={120} /></label>
          )}
          <label>密码<input name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" placeholder="请输入密码" maxLength={72} /></label>
          <button className="system-button inverse" type="submit" disabled={busy || !accountValid || !password}>{busy ? "正在登录…" : "登录"}</button>
          {message ? <p className={`form-message${message.includes("成功") ? " success" : ""}`} aria-live="polite">{message}</p> : null}
          <p className="access-legal-note">还没有账号？<Link className="text-link" href={registerHref}>验证码注册</Link></p>
        </form>
      ) : step === "account" ? (
        <form onSubmit={sendCode}>
          {channel === "phone" ? (
            <label>手机号<input name="phone" value={phone} onChange={(event) => setPhone(event.target.value)} required inputMode="tel" autoComplete="tel" placeholder="+86 138 0000 0000" maxLength={20} /></label>
          ) : (
            <label>邮箱<input name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" placeholder="name@example.com" maxLength={120} /></label>
          )}
          <button className="system-button inverse" type="submit" disabled={busy || !accountValid}>{busy ? "正在发送…" : "获取验证码"}</button>
          {message ? <p className={`form-message${message.includes("成功") ? " success" : ""}`} aria-live="polite">{message}</p> : null}
          {isLogin ? <p className="access-legal-note">还没有账号？<Link className="text-link" href={registerHref}>验证码注册</Link></p> : null}
        </form>
      ) : (
        <form onSubmit={verify}>
          <label>{channel === "phone" ? "手机号" : "邮箱"}<input value={channel === "phone" ? phone : email} readOnly aria-readonly="true" /></label>
          {!isLogin ? <label>用户名<small className="field-hint">（必填）社区中展示的名字，即你的用户名</small><input name="displayName" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required maxLength={24} minLength={1} placeholder="例如：Moonlight 听友" autoComplete="nickname" /></label> : null}
          <label>验证码<input name="code" value={code} onChange={(event) => setCode(event.target.value)} required inputMode="numeric" autoComplete="one-time-code" placeholder="6 位数字验证码" maxLength={6} pattern="[0-9]*" /></label>
          <label>设置密码{isLogin ? <small className="field-hint">（可选）设置后可用密码登录</small> : <small className="field-hint">（必填）用于以后密码登录</small>}<input name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required={!isLogin} autoComplete="new-password" placeholder="8-72 位，建议字母+数字" maxLength={72} minLength={isLogin ? undefined : 8} /></label>
          <button className="system-button inverse" type="submit" disabled={busy || code.length !== 6 || (!isLogin && password.length < 8) || (!isLogin && !displayName.trim())}>{busy ? "正在登录…" : isLogin ? "登录" : "注册并登录"}</button>
          {message ? <p className={`form-message${message.includes("成功") ? " success" : ""}`} aria-live="polite">{message}</p> : null}
          <button className="text-button" type="button" onClick={() => { setStep("account"); setCode(""); setPassword(""); setDisplayName(""); }} disabled={countdown > 0}>{countdown > 0 ? `${countdown} 秒后可重新发送` : "重新发送验证码"}</button>
        </form>
      )}
      {!isLogin ? (
        <footer className="access-legal">
          <p className="access-legal-note">未注册的{channel === "phone" ? "手机号" : "邮箱"}验证后将自动创建账号，请设置密码用于以后登录。登录即表示同意社区规范。</p>
          <p className="access-legal-note">已有账号？<Link className="text-link" href={loginHref}>去登录</Link></p>
        </footer>
      ) : null}
    </div>
  );
}

/** 开发环境：本地快速测试身份（不发送真实验证码）。 */
function DevPreviewForm({ mode, returnTo }: { mode: "login" | "register"; returnTo: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/dev-session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "member", identifier: form.get("identifier"), displayName: form.get("displayName") }),
    });
    const result = await response.json() as { error?: string };
    if (response.ok) router.push(returnTo);
    else { setMessage(result.error ?? "登录失败"); setBusy(false); }
  }

  return (
    <form className="member-access-form" onSubmit={submit}>
      {mode === "register" ? <label>用户名<input name="displayName" required maxLength={50} placeholder="你希望在社区中使用的名字" /></label> : <input type="hidden" name="displayName" value="本地成员" />}
      <label>邮箱或手机号<input name="identifier" required inputMode="email" autoComplete="username" placeholder="name@example.com / +86 138…" /></label>
      <button className="system-button inverse" type="submit" disabled={busy}>{busy ? "正在进入…" : mode === "register" ? "创建测试成员" : "进入社区"}</button>
      {message ? <p className="form-message" aria-live="polite">{message}</p> : null}
    </form>
  );
}
