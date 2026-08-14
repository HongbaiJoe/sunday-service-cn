"use client";

import Link from "next/link";
import { useLocale } from "./locale-provider";

const links = [
  ["首页", "Home", "/"],
  ["资料库", "Archive", "/database"],
  ["展厅", "Exhibitions", "/exhibitions"],
  ["关于", "About", "/about"],
] as const;

export function SiteHeaderClient({ signedIn }: { signedIn: boolean }) {
  const { locale, t, toggleLocale } = useLocale();

  return (
    <header className="site-header">
      <button
        className="site-mark language-toggle"
        type="button"
        onClick={toggleLocale}
        aria-label={locale === "zh" ? "Switch interface to English" : "将界面切换为中文"}
      >
        {locale === "zh" ? "English" : "中文"}
      </button>
      <nav className="primary-nav" aria-label={t("主导航", "Primary navigation")}>
        {links.map(([zh, en, href]) => <Link key={href} href={href}>{t(zh, en)}</Link>)}
      </nav>
      <Link className="nav-action" href={signedIn ? "/account" : "/login"}>
        {signedIn ? t("我的", "Account") : t("登录/注册", "Log in / Join")}
      </Link>
    </header>
  );
}
