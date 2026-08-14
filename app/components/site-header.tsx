import { getCurrentUser } from "../lib/auth";
import { SiteHeaderClient } from "./site-header-client";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return <SiteHeaderClient signedIn={Boolean(user)} />;
}
