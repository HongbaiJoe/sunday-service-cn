/* eslint-disable @next/next/no-img-element */
import type { ArticleContent, FloatBlock } from "../lib/blocks";

/** 正文渲染：流式富文本 + 画布背景色 + 浮动文件块，编辑画布与详情页共用，保证所见即所得。 */
export function RichContentRenderer({ content, className }: { content: ArticleContent; className?: string }) {
  return (
    <div className={`rich-content ${className ?? ""}`} style={{ background: content.background }}>
      <div className="rich-canvas">
        <div className="rich-content-inner" dangerouslySetInnerHTML={{ __html: content.html }} />
        {content.floats.length ? (
          <div className="float-layer">
            {content.floats.map((block) => <FloatView key={block.id} block={block} />)}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FloatView({ block }: { block: FloatBlock }) {
  return (
    <div className={`float-block float-${block.type}`} style={{ left: `${block.x * 100}%`, top: block.y, width: `${block.w * 100}%` }}>
      {block.type === "image" ? <img src={block.src} alt="" /> : block.type === "video" ? <video src={block.src} controls preload="metadata" /> : <audio src={block.src} controls />}
    </div>
  );
}
