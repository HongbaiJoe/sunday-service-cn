import { AboutContent } from "../components/about-content";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { getSiteAssets } from "../lib/site-assets";

export const metadata = { title: "关于" };

export default async function AboutPage() {
  const assets = await getSiteAssets();
  return (
    <main>
      <SiteHeader />
      <AboutContent assets={assets} />
      <SiteFooter />
    </main>
  );
}
