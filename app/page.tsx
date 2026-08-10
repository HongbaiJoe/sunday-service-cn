import { HomeArchive } from "./components/home-archive";
import { InteractiveHero } from "./components/interactive-hero";
import { SiteFooter } from "./components/site-footer";
import { SiteHeader } from "./components/site-header";

export default function Home() {
  return (
    <main>
      <SiteHeader />
      <InteractiveHero />
      <HomeArchive />

      <SiteFooter />
    </main>
  );
}
