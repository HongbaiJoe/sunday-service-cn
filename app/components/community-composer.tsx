"use client";

import { FormEvent, useState } from "react";

type DraftPost = {
  id: number;
  text: string;
  fileName?: string;
};

export function CommunityComposer() {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [posts, setPosts] = useState<DraftPost[]>([]);

  function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = text.trim();
    if (!clean && !fileName) return;
    setPosts((current) => [
      { id: Date.now(), text: clean || "分享了一份媒体内容", fileName },
      ...current,
    ]);
    setText("");
    setFileName("");
  }

  return (
    <div className="composer-wrap">
      <form className="composer" onSubmit={publish}>
        <label htmlFor="new-post">现在在听什么？</label>
        <textarea
          id="new-post"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="写下你的想法、评分或正在制作的作品……"
          rows={4}
        />
        <div className="composer-tools">
          <label className="file-button" htmlFor="media-upload">
            ＋ 图片 / 视频
          </label>
          <input
            id="media-upload"
            type="file"
            accept="image/*,video/*"
            onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
          />
          <span className="file-name">{fileName}</span>
          <button type="submit">发布</button>
        </div>
      </form>

      {posts.map((post) => (
        <article className="prototype-post" key={post.id}>
          <span>刚刚发布</span>
          <p>{post.text}</p>
          {post.fileName ? <small>附件：{post.fileName}</small> : null}
        </article>
      ))}
    </div>
  );
}
