import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-name">SUNDAY SERVICE CN</div>
      <div className="footer-links">
        <Link href="/community">社区</Link>
        <Link href="/database">资料库</Link>
        <Link href="/exhibitions">展厅</Link>
        <Link href="/events">活动</Link>
        <Link href="/account">账户</Link>
      </div>
      <p>中文原型 · 2026</p>
    </footer>
  );
}
