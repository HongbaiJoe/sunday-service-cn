import { PageIntro } from "../components/page-intro";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { EventsList } from "../components/events-list";

export const metadata = { title: "活动" };

export default function EventsPage() {
  return (
    <main>
      <SiteHeader />
      <PageIntro title="活动" titleEn="EVENTS" description="线上活动、线下聚会、音乐会同行与社区正在发生的事" descriptionEn="Online events, offline gatherings, concert meetups and everything happening across the community." variant="events" />
      <EventsList />
      <SiteFooter />
    </main>
  );
}
