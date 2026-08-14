import { HomeArchive } from "./components/home-archive";
import { InteractiveHero } from "./components/interactive-hero";
import { SiteFooter } from "./components/site-footer";
import { SiteHeader } from "./components/site-header";
import { getSiteAssets } from "./lib/site-assets";

export default async function Home() {
  const assets = await getSiteAssets();
  return (
    <main>
      <SiteHeader />
      <InteractiveHero heroUrl={assets["home.hero"].url} />
      <HomeArchive assets={assets} />

      <SiteFooter />
    </main>
  );
}
