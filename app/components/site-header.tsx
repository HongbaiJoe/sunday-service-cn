import Link from "next/link";

const links = [
  ["首页", "/"],
  ["社区", "/community"],
  ["资料库", "/database"],
  ["展厅", "/exhibitions"],
  ["活动", "/events"],
  ["关于", "/about"],
] as const;

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="site-mark" href="/" aria-label="Sunday Service CN 首页">
        SS/CN
      </Link>
      <nav className="primary-nav" aria-label="主导航">
        {links.map(([label, href]) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
      </nav>
      <Link className="nav-action" href="/account">账户</Link>
    </header>
  );
}
