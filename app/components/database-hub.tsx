"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useLocale } from "./locale-provider";

type Entry = { id: string; category: string; title: string; summary: string; body: string; categoryEn?: string | null; titleEn?: string | null; summaryEn?: string | null; bodyEn?: string | null; sourceUrl?: string | null; mediaUrl?: string | null; author: string; updatedAt: string };
const categories = [["全部", "All"], ["课程", "Courses"], ["人物", "Artists"], ["档案", "Archives"], ["流派", "Genres"], ["原创", "Originals"], ["歌曲", "Songs"]] as const;

export function DatabaseHub() {
  const { locale, t, dateLocale } = useLocale();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [entries, setEntries] = useState<Entry[]>([]);
  const [category, setCategory] = useState("全部");
  const [translated, setTranslated] = useState<Record<string, boolean>>({});
  useEffect(() => { void fetch("/api/library", { cache: "no-store" }).then((response) => response.json() as Promise<{ entries: Entry[] }>).then((data) => setEntries(data.entries ?? [])); }, []);

  const visible = entries.filter((entry) => {
    if (category !== "全部" && entry.category !== category) return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      const haystack = `${entry.title} ${entry.summary} ${entry.category} ${entry.author}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return <>
    <div className="filter-row" aria-label={t("资料分类", "Archive categories")}>{categories.map(([value, labelEn]) => <button className={value === category ? "active" : ""} onClick={() => setCategory(value)} type="button" key={value}>{t(value, labelEn)}</button>)}</div>
    <section className="library-grid record-grid">{visible.map((entry, index) => {
      const isBuiltIn = entry.id.startsWith("seed-");
      const hasEnglish = Boolean(entry.titleEn && entry.summaryEn);
      const showEnglish = hasEnglish && (isBuiltIn ? locale === "en" : Boolean(translated[entry.id]));
      const categoryLabel = showEnglish ? entry.categoryEn || entry.category : entry.category;
      const title = showEnglish ? entry.titleEn || entry.title : entry.title;
      const summary = showEnglish ? entry.summaryEn || entry.summary : entry.summary;
      const author = isBuiltIn && locale === "en" ? "SS/CN Editorial" : entry.author;
      return <article className={`library-record record-tone-${["lime", "paper", "orange", "blue", "black", "stone"][index % 6]}`} key={entry.id}>
        <div className="record-top"><span>{String(index + 1).padStart(2, "0")}</span><span>{categoryLabel}</span></div>
        <Link className="record-disc" href={`/database/article/${entry.id}`} aria-label={title || entry.title}>
          <img className="record-vinyl-base" src="/hero-vinyl.png" alt="" aria-hidden="true" />
          {entry.mediaUrl ? <span className="record-center-media"><LibraryMedia url={entry.mediaUrl} /></span> : <span className="record-label">{String(index + 1).padStart(2, "0")}<b>{categoryLabel}</b></span>}
        </Link>
        <div className="record-copy"><h2><Link className="article-link" href={`/database/article/${entry.id}`}>{title}</Link></h2><p>{summary}</p><small>{author} · {new Date(entry.updatedAt).toLocaleDateString(dateLocale)}</small><div className="record-actions"><Link className="text-link" href={`/database/article/${entry.id}`}>{t("阅读全文", "Read more")} ↗</Link>{!isBuiltIn && hasEnglish ? <button className="translation-toggle" type="button" onClick={() => setTranslated((current) => ({ ...current, [entry.id]: !current[entry.id] }))}>{translated[entry.id] ? t("显示原文", "Show original") : t("查看英文翻译", "View English translation")}</button> : null}</div></div>
      </article>;
    })}</section>
  </>;
}

function LibraryMedia({ url }: { url: string }) {
  const path = url.split("?")[0].toLowerCase();
  if (/\.(mp4|webm|mov)$/.test(path)) return <video src={url} controls preload="metadata" />;
  if (/\.(mp3|wav|m4a|ogg)$/.test(path)) return <audio src={url} controls preload="metadata" />;
  return <img src={url} alt="" />;
}
