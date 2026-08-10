import { PageIntro } from "../components/page-intro";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";

export const metadata = { title: "活动" };

const events = [
  ["08.24", "线上听歌会：重新听一遍 Donda", "线上 · 20:00"],
  ["09.06", "社区原创作品试听夜", "上海 · 场地待定"],
  ["09.20", "专辑封面研究展 · 开幕谈", "线上 · 19:30"],
  ["12.12", "2026 年度专辑投票", "社区活动 · 全天"],
] as const;

export default function EventsPage() {
  return (
    <main>
      <SiteHeader />
      <PageIntro index="04" title="活动" description="线上活动、线下聚会、音乐会同行与社区正在发生的事" variant="events" />
      <section className="event-list">
        {events.map(([date, title, detail], index) => (
          <article key={title}>
            <div className="event-date">{date}</div>
            <div><p className="eyebrow">EVENT {String(index + 1).padStart(2, "0")}</p><h2>{title}</h2></div>
            <p>{detail}</p>
            <button type="button" aria-label={`查看${title}`}>↗</button>
          </article>
        ))}
      </section>
      <SiteFooter />
    </main>
  );
}
