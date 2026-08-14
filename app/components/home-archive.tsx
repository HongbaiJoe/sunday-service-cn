"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { SiteAsset } from "../lib/site-assets-meta";
import { useLocale } from "./locale-provider";

const PANEL_COUNT = 3;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function HomeArchive({ assets }: { assets: Record<string, SiteAsset> }) {
  const { t } = useLocale();
  const archiveRef = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      frame.current = null;
      const archive = archiveRef.current;
      if (!archive) return;
      const bounds = archive.getBoundingClientRect();
      const distance = Math.max(archive.offsetHeight - window.innerHeight, 1);
      setProgress(clamp(-bounds.top / distance, 0, 1) * (PANEL_COUNT - 1));
    };

    const requestUpdate = () => {
      if (frame.current === null) frame.current = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    };
  }, []);

  function panelStyle(index: number) {
    const turned = clamp(progress - index, 0, 1);
    const waiting = clamp(index - progress, 0, PANEL_COUNT);
    const direction = index % 2 === 0 ? -1 : 1;
    return {
      zIndex: PANEL_COUNT - index,
      opacity: 1 - turned * 0.16,
      pointerEvents: Math.round(progress) === index ? "auto" : "none",
      transform: `translate3d(${turned * direction * 3.5}%, ${turned * -112 + waiting * 2.1}%, 0) rotateX(${turned * 8}deg) rotateZ(${turned * direction * 1.8}deg) scale(${1 - waiting * 0.012})`,
    } as const;
  }

  return (
    <div className="home-archive" id="latest" ref={archiveRef}>
      <div className="home-archive-sticky">
        <div className="archive-stack-label" aria-hidden="true">{" "}</div>

        <section className="home-story story-paper archive-panel" style={panelStyle(0)}>
          <div className="story-index">{" "}</div>
          <div className="story-copy">
            <p className="eyebrow">{" "}</p>
            <h2>{t("如何听懂 Gospel Choir 的声部与律动", "How to hear the parts and pulse of a Gospel Choir")}</h2>
            <p className="story-meta">{t("入门课程 · 6 个章节 · 编辑推荐", "Intro course · 6 chapters · Editor's pick")}</p>
            <Link className="text-link" href="/database">{t("查看课程", "View course")} <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="type-poster" aria-hidden="true"><span>SOPRANO</span><span>ALTO</span><span>TENOR</span><b>CHOIR</b></div>
        </section>

        <section className="home-story story-cobalt archive-panel" style={panelStyle(1)}>
          <div className="story-index">{" "}</div>
          <div className="story-copy">
            <p className="eyebrow">{" "}</p>
            <h2>{t("从 The Life of Pablo 到 Jesus Is King", "From The Life of Pablo to Jesus Is King")}</h2>
            <p className="story-meta">{t("歌词、采样与福音叙事的对照研究", "A study of lyrics, samples and gospel narratives")}</p>
            <Link className="text-link" href="/exhibitions">{t("前往展厅入口", "Enter exhibitions")} <span aria-hidden="true">↗</span></Link>
          </div>
          <figure className="story-image image-cutout image-kanye">
            <img src={assets["archive.kanye"].url} alt={t("Kanye West 演出人物抠图", "Kanye West performance cutout")} width="1010" height="1557" />
            <figcaption>KANYE WEST / 2013</figcaption>
          </figure>
        </section>

        <section className="artist-strip archive-panel" aria-label={t("人物专题预览", "Artist feature preview")} style={panelStyle(2)}>
          <div className="artist-strip-copy">
            <p className="eyebrow">{" "}</p>
            <h2>Lauryn Hill</h2>
            <p>{t("歌声、写作与现场表达", "Voice, writing and live expression")}</p>
            <Link className="text-link" href="/database">{t("查看人物条目", "View artist entry")} <span aria-hidden="true">↗</span></Link>
          </div>
          <img className="artist-cutout" src={assets["archive.lauryn"].url} alt={t("Lauryn Hill 演出人物抠图", "Lauryn Hill performance cutout")} width="1173" height="1341" />
        </section>
      </div>
    </div>
  );
}
