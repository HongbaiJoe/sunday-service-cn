"use client";

import { useLocale } from "./locale-provider";

const events = [
  ["08.24", "线上听歌会：重新听一遍 Donda", "Online listening room: Donda, again", "线上 · 20:00", "Online · 20:00"],
  ["09.06", "社区原创作品试听夜", "Community demo night", "上海 · 场地待定", "Shanghai · Venue TBA"],
  ["09.20", "专辑封面研究展 · 开幕谈", "Album-cover studies · Opening talk", "线上 · 19:30", "Online · 19:30"],
  ["12.12", "2026 年度专辑投票", "2026 album of the year vote", "社区活动 · 全天", "Community event · All day"],
] as const;

export function EventsList() {
  const { t } = useLocale();
  return <section className="event-list">{events.map(([date, zhTitle, enTitle, zhDetail, enDetail], index) => (
    <article key={zhTitle}>
      <div className="event-date">{date}</div>
      <div><p className="eyebrow">EVENT {String(index + 1).padStart(2, "0")}</p><h2>{t(zhTitle, enTitle)}</h2></div>
      <p>{t(zhDetail, enDetail)}</p>
      <button type="button" aria-label={t(`查看${zhTitle}`, `View ${enTitle}`)}>↗</button>
    </article>
  ))}</section>;
}
