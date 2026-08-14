import { getCurrentUser } from "../lib/auth";
import { SiteFooterClient } from "./site-footer-client";

export async function SiteFooter() {
  const user = await getCurrentUser();
  return <SiteFooterClient signedIn={Boolean(user)} />;
}
