"use client";

import Link from "next/link";
import { useLocale } from "./locale-provider";

export function SiteFooterClient({ signedIn }: { signedIn: boolean }) {
  const { t } = useLocale();
  return (
    <footer className="site-footer">
      <div className="footer-name">SUNDAY SERVICE CN</div>
      <div className="footer-links">
        <Link href="/database">{t("资料库", "Archive")}</Link>
        <Link href="/exhibitions">{t("展厅", "Exhibitions")}</Link>
        <Link href={signedIn ? "/account" : "/login"}>{signedIn ? t("我的", "Account") : t("登录/注册", "Log in / Join")}</Link>
      </div>
    </footer>
  );
}
