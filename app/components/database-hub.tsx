"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useState } from "react";

type Entry = { id: string; category: string; title: string; summary: string; body: string; sourceUrl?: string | null; mediaUrl?: string | null; author: string; updatedAt: string };
const categories = ["全部", "课程", "人物", "档案", "流派", "原创", "歌曲"];

export function DatabaseHub() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [category, setCategory] = useState("全部");
  useEffect(() => { void fetch(`/api/library${category === "全部" ? "" : `?category=${encodeURIComponent(category)}`}`, { cache: "no-store" }).then((response) => response.json() as Promise<{ entries: Entry[] }>).then((data) => setEntries(data.entries ?? [])); }, [category]);
  return <>
    <div className="filter-row" aria-label="资料分类">{categories.map((item) => <button className={item === category ? "active" : ""} onClick={() => setCategory(item)} type="button" key={item}>{item}</button>)}<Link className="submit-inline" href="/submit/library">＋ 提交资料</Link></div>
    <section className="library-grid dynamic-library">{entries.map((entry, index) => <article className={`library-card tone-${["lime", "photo", "orange", "blue", "black", "paper"][index % 6]}`} key={entry.id}><div className="card-top"><span>{String(index + 1).padStart(2, "0")}</span><span>{entry.category}</span></div>{entry.mediaUrl ? <LibraryMedia url={entry.mediaUrl} /> : <div className="card-art" aria-hidden="true">{entry.category}</div>}<h2>{entry.title}</h2><p>{entry.summary}</p><small>{entry.author} · {new Date(entry.updatedAt).toLocaleDateString("zh-CN")}</small>{entry.sourceUrl ? <a className="text-link" href={entry.sourceUrl} target="_blank" rel="noreferrer">查看来源 ↗</a> : null}</article>)}</section>
  </>;
}

function LibraryMedia({ url }: { url: string }) {
  const path = url.split("?")[0].toLowerCase();
  if (/\.(mp4|webm|mov)$/.test(path)) return <video src={url} controls preload="metadata" />;
  if (/\.(mp3|wav|m4a|ogg)$/.test(path)) return <audio src={url} controls preload="metadata" />;
  return <img src={url} alt="资料附件" />;
}
