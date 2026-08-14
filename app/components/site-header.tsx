import Link from "next/link";
import { getCurrentUser } from "../lib/auth";

const links = [
  ["首页", "/"],
  ["资料库", "/database"],
  ["展厅", "/exhibitions"],
  ["关于", "/about"],
] as const;

export async function SiteHeader() {
  const user = await getCurrentUser();

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
      {user ? (
        <Link className="nav-action" href="/account">我的</Link>
      ) : (
        <Link className="nav-action" href="/login">登录/注册</Link>
      )}
    </header>
  );
}
