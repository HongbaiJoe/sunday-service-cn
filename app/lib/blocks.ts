/** 正文默认画布背景色（米色）。 */
export const DEFAULT_ARTICLE_BACKGROUND = "#d8d0c4";

/** 浮动文件块：嵌入正文后自由拖拽定位（坐标相对画布左上，像素）。 */
export type FloatBlock = {
  id: string;
  type: "image" | "video" | "audio";
  src: string;
  x: number;
  y: number;
  w: number;
};

/** 正文内容：流式富文本 + 画布背景色 + 浮动文件块（存 D1 的 blocks 字段，JSON 字符串）。 */
export type ArticleContent = {
  version: 3;
  html: string;
  background: string;
  floats: FloatBlock[];
};

/** 解析 blocks 字段；无效或旧格式返回 null（由调用方回退到纯文本渲染）。 */
export function parseContent(raw: string | null | undefined): ArticleContent | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<ArticleContent>;
    if (data && data.version === 3 && typeof data.html === "string") {
      return {
        version: 3,
        html: data.html,
        background: data.background || DEFAULT_ARTICLE_BACKGROUND,
        floats: Array.isArray(data.floats) ? (data.floats as FloatBlock[]) : [],
      };
    }
    return null;
  } catch {
    return null;
  }
}

/** 将纯文本正文包装成富文本内容（迁移/回退用）。 */
export function textToContent(text: string, background = DEFAULT_ARTICLE_BACKGROUND): ArticleContent {
  const paragraphs = text.split(/\n{2,}/).map((p) => `<p>${p.trim()}</p>`).join("");
  return { version: 3, html: paragraphs || `<p>${text}</p>`, background, floats: [] };
}

/** 从富文本 HTML 提取纯文本（用于列表/搜索/兼容旧的 body 字段）。 */
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h[1-6]|li|blockquote|div)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
