/* eslint-disable @next/next/no-img-element */
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";

export const metadata = { title: "关于" };

export default function AboutPage() {
  return (
    <main>
      <SiteHeader />
      <section className="about-hero">
        <p className="eyebrow">ABOUT · 关于</p>
        <h1>从深圳<br />开始</h1>
        <div className="about-lead">
          <p>Sunday Service CN 最初由一群热爱音乐的人在深圳组建。我们从线下合唱团开始，一起排练、听歌，也在一次次见面里认识彼此。</p>
          <p>后来，我们决定把这份交流延伸到线上，让不在同一座城市的人也能参与进来。这里可以自由分享对音乐的看法、自己的作品和正在筹备的展览。</p>
          <p>我们希望它保持开放、直接，也一直保留线下合唱团带来的连接感。</p>
        </div>
      </section>
      <section className="about-photos" aria-label="Sunday Service CN 现场照片">
        <figure className="about-photo about-photo-main">
          <img src="/images/about-blue-light-zine.png" alt="蓝色投影与装置现场的纸刊拼贴作品" width="971" height="1619" />
          <figcaption>01 · BLUE LIGHT, GATHERED</figcaption>
        </figure>
        <figure className="about-photo about-photo-side">
          <img src="/images/about-sunday-wall-zine.png" alt="Sunday Service Shenzhen 海报墙的纸刊拼贴作品" width="971" height="1619" />
          <figcaption>02 · VOICES BECOME A ROOM</figcaption>
        </figure>
        <p className="about-photo-note">Community<br />Memory</p>
      </section>
      <section className="about-grid">
        <div><span>01</span><h2>讨论</h2><p>从一张新专辑，到一段现场录音，再到一套完整的音乐研究。</p></div>
        <div><span>02</span><h2>分享</h2><p>发布自己的声音、图片、视频和创作过程。</p></div>
        <div><span>03</span><h2>展览</h2><p>独立展览拥有自己的空间，主网站负责连接观众与策展人。</p></div>
      </section>
      <SiteFooter />
    </main>
  );
}
