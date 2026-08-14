"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "./locale-provider";

type Exhibition = { id: string; title: string; summary: string; curatorialStatement: string; titleEn?: string | null; summaryEn?: string | null; curatorialStatementEn?: string | null; externalUrl?: string | null; coverUrl?: string | null; curator: string; updatedAt: string };

export function ExhibitionHub() {
  const { locale, t, dateLocale } = useLocale();
  const [items, setItems] = useState<Exhibition[]>([]);
  const [translated, setTranslated] = useState<Record<string, boolean>>({});
  useEffect(() => { void fetch("/api/exhibitions", { cache: "no-store" }).then((response) => response.json() as Promise<{ exhibitions: Exhibition[] }>).then((data) => setItems(data.exhibitions ?? [])); }, []);
  const featured = items[0];
  const featuredBuiltIn = Boolean(featured?.id.startsWith("seed-"));
  const featuredHasEnglish = Boolean(featured?.titleEn && featured?.summaryEn);
  const featuredEnglish = Boolean(featured && featuredHasEnglish && (featuredBuiltIn ? locale === "en" : translated[featured.id]));
  return <>
    {featured ? <section className="exhibition-feature"><div className="exhibition-word" aria-hidden="true">OPEN<br />ROOM</div><div className="exhibition-info"><p className="eyebrow">{t("本月展览", "EXHIBITION OF THE MONTH")} · 001</p><h2>{featuredEnglish ? featured.titleEn : featured.title}</h2><p>{featuredEnglish ? featured.summaryEn : featured.summary}</p><dl><dt>{t("策展人", "Curator")}</dt><dd>{featuredBuiltIn && locale === "en" ? "SS/CN Editorial" : featured.curator}</dd><dt>{t("更新时间", "Updated")}</dt><dd>{new Date(featured.updatedAt).toLocaleDateString(dateLocale)}</dd></dl>{!featuredBuiltIn && featuredHasEnglish ? <button className="translation-toggle exhibition-translation-toggle" type="button" onClick={() => setTranslated((current) => ({ ...current, [featured.id]: !current[featured.id] }))}>{translated[featured.id] ? t("显示原文", "Show original") : t("查看英文翻译", "View English translation")}</button> : null}{featured.externalUrl ? <a className="system-button outline-light" href={featured.externalUrl} target="_blank" rel="noreferrer">{t("进入独立展厅", "Enter exhibition")} ↗</a> : <span>{t("独立展厅链接准备中", "Exhibition link coming soon")}</span>}</div></section> : null}
    <section className="exhibition-list">{items.slice(1).map((item, index) => { const builtIn = item.id.startsWith("seed-"); const hasEnglish = Boolean(item.titleEn && item.summaryEn); const showEnglish = hasEnglish && (builtIn ? locale === "en" : translated[item.id]); return <article key={item.id}><span>{String(index + 2).padStart(3, "0")}</span><h2>{showEnglish ? item.titleEn : item.title}</h2><p>{builtIn && locale === "en" ? "SS/CN Editorial" : item.curator} · {showEnglish ? item.summaryEn : item.summary}</p>{!builtIn && hasEnglish ? <button className="translation-toggle" type="button" onClick={() => setTranslated((current) => ({ ...current, [item.id]: !current[item.id] }))}>{translated[item.id] ? t("显示原文", "Show original") : t("查看英文翻译", "View English translation")}</button> : null}</article>; })}</section>
    <section className="submission-callout"><p className="eyebrow">OPEN CALL · {t("展览征集", "EXHIBITIONS")}</p><h2>{t("提交你的独立展览计划", "Propose an independent online exhibition")}</h2><p>{t("提供主题、策展说明、封面和独立展厅网址。管理员审核通过后，入口会出现在这里。", "Share the theme, curatorial note, cover and exhibition URL. Once approved, its entrance will appear here.")}</p><Link className="system-button" href="/submit/exhibition">{t("开始申请", "Start proposal")} ↗</Link></section>
  </>;
}
