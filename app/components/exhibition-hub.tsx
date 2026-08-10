"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Exhibition = { id: string; title: string; summary: string; curatorialStatement: string; externalUrl?: string | null; coverUrl?: string | null; curator: string; updatedAt: string };

export function ExhibitionHub() {
  const [items, setItems] = useState<Exhibition[]>([]);
  useEffect(() => { void fetch("/api/exhibitions", { cache: "no-store" }).then((response) => response.json() as Promise<{ exhibitions: Exhibition[] }>).then((data) => setItems(data.exhibitions ?? [])); }, []);
  const featured = items[0];
  return <>
    {featured ? <section className="exhibition-feature"><div className="exhibition-word" aria-hidden="true">OPEN<br />ROOM</div><div className="exhibition-info"><p className="eyebrow">本月展览 · 001</p><h2>{featured.title}</h2><p>{featured.summary}</p><dl><dt>策展人</dt><dd>{featured.curator}</dd><dt>更新时间</dt><dd>{new Date(featured.updatedAt).toLocaleDateString("zh-CN")}</dd></dl>{featured.externalUrl ? <a className="system-button outline-light" href={featured.externalUrl} target="_blank" rel="noreferrer">进入独立展厅 ↗</a> : <span>独立展厅链接准备中</span>}</div></section> : null}
    <section className="exhibition-list">{items.slice(1).map((item, index) => <article key={item.id}><span>{String(index + 2).padStart(3, "0")}</span><h2>{item.title}</h2><p>{item.curator} · {item.summary}</p></article>)}</section>
    <section className="submission-callout"><p className="eyebrow">OPEN CALL · 展览征集</p><h2>提交你的独立展览计划</h2><p>提供主题、策展说明、封面和独立展厅网址。管理员审核通过后，入口会出现在这里。</p><Link className="system-button" href="/submit/exhibition">开始申请 ↗</Link></section>
  </>;
}
