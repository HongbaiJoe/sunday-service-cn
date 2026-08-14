"use client";

/* eslint-disable @next/next/no-img-element */
import type { SiteAsset } from "../lib/site-assets-meta";
import { useLocale } from "./locale-provider";

export function AboutContent({ assets }: { assets: Record<string, SiteAsset> }) {
  const { t } = useLocale();
  return <>
    <section className="about-hero">
      <p className="eyebrow">ABOUT · {t("关于", "ABOUT")}</p>
      <h1>{t("从深圳\n开始", "STARTED IN\nSHENZHEN")}</h1>
      <div className="about-lead">
        <p>{t("Sunday Service CN 最初由一群热爱音乐的人在深圳组建。我们从线下合唱团开始，一起排练、听歌，也在一次次见面里认识彼此。", "Sunday Service CN began in Shenzhen with a group of people who love music. We started as an offline choir—rehearsing, listening and getting to know one another in person.")}</p>
        <p>{t("后来，我们决定把这份交流延伸到线上，让不在同一座城市的人也能参与进来。这里可以自由分享对音乐的看法、自己的作品和正在筹备的展览。", "We later brought that exchange online so people in different cities could take part. Here, members can freely share thoughts on music, their own work and exhibitions in progress.")}</p>
        <p>{t("我们希望它保持开放、直接，也一直保留线下合唱团带来的连接感。", "We want it to stay open and direct, while keeping the sense of connection that came from the choir.")}</p>
      </div>
    </section>
    <section className="about-photos" aria-label={t("Sunday Service CN 现场照片", "Sunday Service CN community photographs")}>
      <figure className="about-photo about-photo-main"><img src={assets["about.blueLight"].url} alt={t(assets["about.blueLight"].alt, "Paper-zine collage of a blue-light projection installation")} width="971" height="1619" /><figcaption>BLUE LIGHT, GATHERED</figcaption></figure>
      <figure className="about-photo about-photo-side"><img src={assets["about.wall"].url} alt={t(assets["about.wall"].alt, "Paper-zine collage of the Sunday Service Shenzhen poster wall")} width="971" height="1619" /><figcaption>VOICES BECOME A ROOM</figcaption></figure>
      <p className="about-photo-note">Community<br />Memory</p>
    </section>
    <section className="about-grid">
      <div><h2>{t("讨论", "Discuss")}</h2><p>{t("从一张新专辑，到一段现场录音，再到一套完整的音乐研究。", "From a new album or live recording to a complete piece of music research.")}</p></div>
      <div><h2>{t("分享", "Share")}</h2><p>{t("发布自己的声音、图片、视频和创作过程。", "Publish your sound, images, videos and creative process.")}</p></div>
      <div><h2>{t("展览", "Exhibit")}</h2><p>{t("独立展览拥有自己的空间，主网站负责连接观众与策展人。", "Independent exhibitions live in their own spaces; the main site connects audiences and curators.")}</p></div>
    </section>
  </>;
}
