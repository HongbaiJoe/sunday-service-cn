"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useState } from "react";
import { parseContent } from "../lib/blocks";
import { RichContentRenderer } from "./block-renderer";
import { LocalizedDate, useLocale } from "./locale-provider";

export type LibraryArticleEntry = {
  id: string;
  category: string;
  categoryEn?: string | null;
  title: string;
  titleEn?: string | null;
  summary: string;
  summaryEn?: string | null;
  body: string;
  bodyEn?: string | null;
  sourceUrl?: string | null;
  mediaUrl?: string | null;
  blocks?: string | null;
  author: string;
  updatedAt: string;
};

export function LibraryArticle({ entry }: { entry: LibraryArticleEntry }) {
  const { locale, t } = useLocale();
  const [translated, setTranslated] = useState(false);
  const isBuiltIn = entry.id.startsWith("seed-");
  const hasEnglish = Boolean(entry.titleEn && entry.summaryEn && entry.bodyEn);
  const showEnglish = hasEnglish && (isBuiltIn ? locale === "en" : translated);
  const content = showEnglish ? null : parseContent(entry.blocks);
  const category = showEnglish ? entry.categoryEn || entry.category : entry.category;
  const title = showEnglish ? entry.titleEn || entry.title : entry.title;
  const summary = showEnglish ? entry.summaryEn || entry.summary : entry.summary;
  const body = showEnglish ? entry.bodyEn || entry.body : entry.body;
  const author = isBuiltIn && locale === "en" ? "SS/CN Editorial" : entry.author;

  return <article className="library-article">
    <Link className="back-link" href="/database">← {t("返回资料库", "Back to archive")}</Link>
    <p className="eyebrow">{category}</p>
    <h1>{title}</h1>
    <div className="post-byline">{author} · <LocalizedDate value={entry.updatedAt} /></div>
    <p className="library-article-summary">{summary}</p>
    {!isBuiltIn && hasEnglish ? <button className="translation-toggle" type="button" onClick={() => setTranslated((value) => !value)}>{translated ? t("显示原文", "Show original") : t("查看英文翻译", "View English translation")}</button> : null}
    {content ? <RichContentRenderer content={content} /> : <>{entry.mediaUrl ? <LibraryMedia url={entry.mediaUrl} /> : null}<div className="library-article-body"><p>{body}</p></div></>}
    {entry.sourceUrl ? <a className="text-link" href={entry.sourceUrl} target="_blank" rel="noreferrer">{t("查看来源", "View source")} ↗</a> : null}
  </article>;
}

function LibraryMedia({ url }: { url: string }) {
  const { t } = useLocale();
  const path = url.split("?")[0].toLowerCase();
  if (/\.(mp4|webm|mov)$/.test(path)) return <video src={url} controls preload="metadata" />;
  if (/\.(mp3|wav|m4a|ogg)$/.test(path)) return <audio src={url} controls preload="metadata" />;
  return <img src={url} alt={t("资料附件", "Archive attachment")} />;
}
