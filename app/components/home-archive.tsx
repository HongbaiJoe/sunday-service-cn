"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const PANEL_COUNT = 4;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function HomeArchive() {
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
        <div className="archive-stack-label" aria-hidden="true">COMMUNITY FILES · 01—04</div>

        <section className="home-story story-ink archive-panel" style={panelStyle(0)}>
          <div className="story-index">01 / 最新讨论</div>
          <div className="story-copy">
            <p className="eyebrow">COMMUNITY · 社区</p>
            <h2>你会如何排列 Kendrick Lamar 的五张录音室专辑？</h2>
            <p className="story-meta">音乐讨论 · 38 条回复 · 今天 14:20</p>
            <Link className="text-link" href="/community/kendrick-ranking">进入讨论 <span aria-hidden="true">↗</span></Link>
          </div>
          <figure className="story-image image-cutout image-kendrick">
            <img src="/images/kendrick-lamar.jpg" alt="Kendrick Lamar 肖像" width="989" height="1318" />
            <figcaption>KENDRICK LAMAR / 2018</figcaption>
          </figure>
        </section>

        <section className="home-story story-paper archive-panel" style={panelStyle(1)}>
          <div className="story-index">02 / 推荐课程</div>
          <div className="story-copy">
            <p className="eyebrow">DATABASE · 资料库</p>
            <h2>如何听懂 Gospel Choir 的声部与律动</h2>
            <p className="story-meta">入门课程 · 6 个章节 · 编辑推荐</p>
            <Link className="text-link" href="/database">查看课程 <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="type-poster" aria-hidden="true"><span>SOPRANO</span><span>ALTO</span><span>TENOR</span><b>CHOIR</b></div>
        </section>

        <section className="home-story story-cobalt archive-panel" style={panelStyle(2)}>
          <div className="story-index">03 / 本月展览</div>
          <div className="story-copy">
            <p className="eyebrow">EXHIBITION · 展厅</p>
            <h2>从 The Life of Pablo 到 Jesus Is King</h2>
            <p className="story-meta">歌词、采样与福音叙事的对照研究</p>
            <Link className="text-link" href="/exhibitions">前往展厅入口 <span aria-hidden="true">↗</span></Link>
          </div>
          <figure className="story-image image-cutout image-kanye">
            <img src="/images/kanye-west.jpg" alt="Kanye West 演出照片" width="385" height="592" />
            <figcaption>KANYE WEST / 2013</figcaption>
          </figure>
        </section>

        <section className="artist-strip archive-panel" aria-label="人物专题预览" style={panelStyle(3)}>
          <div className="artist-strip-copy">
            <p className="eyebrow">ARCHIVE NOTE · 资料摘录</p>
            <h2>Lauryn Hill</h2>
            <p>歌声、写作与现场表达</p>
            <Link className="text-link" href="/database">查看人物条目 <span aria-hidden="true">↗</span></Link>
          </div>
          <img src="/images/lauryn-hill.jpg" alt="Lauryn Hill 演出照片" width="525" height="600" />
        </section>
      </div>
    </div>
  );
}
