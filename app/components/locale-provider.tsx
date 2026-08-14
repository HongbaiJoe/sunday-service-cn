"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export type Locale = "zh" | "en";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (zh: string, en: string) => string;
  dateLocale: "zh-CN" | "en-US";
  translateMessage: (message: string) => string;
};

const STORAGE_KEY = "sscn_locale";
const LocaleContext = createContext<LocaleContextValue | null>(null);
const ZH_TITLES: Record<string, string> = { "/": "Sunday Service CN", "/about": "关于", "/account": "账户", "/admin": "管理后台", "/community": "社区", "/database": "资料库", "/events": "活动", "/exhibitions": "展厅", "/login": "成员登录", "/register": "加入社区", "/submit/library": "提交资料", "/submit/exhibition": "提交展览" };
const EN_TITLES: Record<string, string> = { "/": "Sunday Service CN", "/about": "About", "/account": "Account", "/admin": "Admin", "/community": "Community", "/database": "Archive", "/events": "Events", "/exhibitions": "Exhibitions", "/login": "Sign in", "/register": "Join", "/submit/library": "Submit archive entry", "/submit/exhibition": "Propose exhibition" };
const EN_MESSAGES: Record<string, string> = {
  "素材已更新": "Asset updated", "上传失败": "Upload failed", "操作已记录": "Action recorded", "操作失败": "Action failed",
  "资料已保存": "Profile saved", "保存失败": "Save failed", "头像必须是图片文件": "The avatar must be an image", "正在上传头像…": "Uploading avatar…", "头像已上传，请保存个人资料": "Avatar uploaded. Save your profile to apply it.", "头像上传失败": "Avatar upload failed",
  "帖子已发布": "Post published", "发布失败": "Publish failed", "媒体上传失败": "Media upload failed", "回复已发布": "Reply published", "回复失败": "Reply failed",
  "请先选择资料分类": "Choose an archive category first", "请填写正文内容": "Add body content", "提交成功，管理员审核后会公开展示。": "Submitted. It will appear publicly after review.", "提交失败": "Submission failed",
  "验证码已发送，请查收": "Verification code sent", "发送失败，请稍后再试": "Could not send the code. Try again later.", "网络异常，请稍后再试": "Network error. Try again later.", "验证失败，请重试": "Verification failed. Try again.", "登录失败，请重试": "Sign-in failed. Try again.", "登录失败": "Sign-in failed",
};

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [locale, setLocale] = useState<Locale>("zh");
  const mounted = useRef(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const initial = saved === "en" || saved === "zh" ? saved : "zh";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser preference is only available after hydration
    setLocale(initial);
    document.documentElement.lang = initial === "zh" ? "zh-CN" : "en";
    document.documentElement.dataset.locale = initial;
  }, []);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    document.documentElement.dataset.locale = locale;
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  useEffect(() => {
    const key = Object.keys(EN_TITLES).find((route) => route !== "/" && pathname.startsWith(route)) ?? "/";
    const title = locale === "en" ? EN_TITLES[key] : ZH_TITLES[key];
    document.title = key === "/" ? title : `${title} — Sunday Service CN`;
    document.querySelector('meta[name="description"]')?.setAttribute("content", locale === "en" ? "China's largest Western music community" : "中国最大的欧美音乐社群");
  }, [locale, pathname]);

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale,
    toggleLocale: () => setLocale((current) => current === "zh" ? "en" : "zh"),
    t: (zh, en) => locale === "zh" ? zh : en,
    dateLocale: locale === "zh" ? "zh-CN" : "en-US",
    translateMessage: (message) => locale === "zh" ? message : EN_MESSAGES[message] ?? message,
  }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used inside LocaleProvider");
  return value;
}

export function LocalizedText({ zh, en, as: Tag = "span", className }: { zh: string; en: string; as?: "span" | "p" | "h1" | "h2"; className?: string }) {
  const { t } = useLocale();
  return <Tag className={className}>{t(zh, en)}</Tag>;
}

export function LocalizedDate({ value, withTime = false }: { value: string | Date; withTime?: boolean }) {
  const { dateLocale } = useLocale();
  const date = value instanceof Date ? value : new Date(value);
  return <>{withTime ? date.toLocaleString(dateLocale) : date.toLocaleDateString(dateLocale)}</>;
}
