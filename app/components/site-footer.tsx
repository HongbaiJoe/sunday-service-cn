import Link from "next/link";
import { getCurrentUser } from "../lib/auth";

export async function SiteFooter() {
  const user = await getCurrentUser();
  return (
    <footer className="site-footer">
      <div className="footer-name">SUNDAY SERVICE CN</div>
      <div className="footer-links">
        <Link href="/database">资料库</Link>
        <Link href="/exhibitions">展厅</Link>
        {user ? <Link href="/account">我的</Link> : <Link href="/login">登录/注册</Link>}
      </div>
    </footer>
  );
}
