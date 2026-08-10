/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";

export const metadata = { title: "Kendrick Lamar 专辑排序" };

export default function PostPage() {
  return (
    <main>
      <SiteHeader />
      <article className="post-detail">
        <Link className="back-link" href="/community">← 返回社区</Link>
        <p className="eyebrow"># KENDRICK LAMAR · 专辑讨论</p>
        <h1>你会如何排列 Kendrick Lamar 的五张录音室专辑？</h1>
        <div className="post-byline">李默 · 2026.08.10 · 8 分钟阅读</div>
        <img src="/images/kendrick-lamar.jpg" alt="Kendrick Lamar 肖像" width="989" height="1318" />
        <div className="post-copy">
          <p>我最近重新完整听了一遍 Kendrick Lamar 的录音室作品。这里不是一份“客观榜单”，而是从叙事完整度、制作细节与重听价值出发的一次个人排序。</p>
          <h2>01 · To Pimp a Butterfly</h2>
          <p>它仍然是我心中最完整的一张：爵士、放克和说唱之间没有明显边界，专辑结构也经得起从头到尾的连续聆听。</p>
          <h2>02 · good kid, m.A.A.d city</h2>
          <p>叙事最直接、角色最鲜明。即使已经熟悉故事，每次回听仍会注意到新的环境声和段落连接。</p>
        </div>
      </article>
      <section className="reply-section">
        <h2>回复 · 38</h2>
        <div className="reply"><b>Saint.wav</b><p>我会把 DAMN. 放在第二，但第一名完全同意。</p></div>
        <div className="reply"><b>南方公园</b><p>想看你把 mixtape 也加入以后再排一次。</p></div>
        <textarea aria-label="回复内容" placeholder="写下你的回复……" rows={3} />
        <button type="button">回复</button>
      </section>
      <SiteFooter />
    </main>
  );
}
