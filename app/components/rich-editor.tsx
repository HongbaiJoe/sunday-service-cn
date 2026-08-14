"use client";

import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Placeholder from "@tiptap/extension-placeholder";
import { FontSize } from "../lib/tiptap-font-size";
import { uploadMedia } from "../lib/client-upload";
import { DEFAULT_ARTICLE_BACKGROUND, type ArticleContent, type FloatBlock } from "../lib/blocks";

/** 阻止按钮抢占焦点/清除选区（桌面 + 触屏都有效）。 */
function keepFocus(event: React.PointerEvent | React.MouseEvent) {
  event.preventDefault();
}

type ToolOption = { label: string; value: string; previewStyle?: CSSProperties };

/**
 * 自定义下拉控件：用按钮实现，避免原生 select 打开时让编辑器失焦、
 * 丢失选区导致字体/字号切换无反应（移动端尤其明显）。
 * previewStyle 用于字体下拉：选项名称直接用该字体渲染（所见即所得）。
 */
function ToolDropdown({ label, options, getActiveValue, onApply }: {
  label: string;
  options: ToolOption[];
  getActiveValue: () => string;
  onApply: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocumentPointerDown(event: Event) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDocumentPointerDown);
    return () => document.removeEventListener("pointerdown", onDocumentPointerDown);
  }, [open]);

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      if (next) setActive(getActiveValue()); // 打开时读取当前选区样式，保证显示最新值
      return next;
    });
  }

  function pick(value: string) {
    setActive(value);
    setOpen(false);
    onApply(value);
  }

  const activeOption = options.find((option) => option.value === active);
  const activeLabel = activeOption?.label ?? "默认";

  return (
    <div className={`tool-dropdown${open ? " open" : ""}`} ref={rootRef}>
      <button type="button" className="tool-dropdown-trigger" onPointerDown={keepFocus} onMouseDown={keepFocus} onClick={toggle} aria-haspopup="listbox" aria-expanded={open} aria-label={label} title={label}>
        <span className="tool-dropdown-value" style={activeOption?.previewStyle}>{activeLabel}</span>
        <span className="tool-dropdown-caret" aria-hidden="true">▾</span>
      </button>
      {open ? (
        <div className="tool-dropdown-menu" role="listbox" aria-label={label}>
          {options.map((option) => (
            <button key={option.value} type="button" role="option" aria-selected={option.value === active} className={`tool-dropdown-option${option.value === active ? " active" : ""}`} style={option.previewStyle} onPointerDown={keepFocus} onMouseDown={keepFocus} onClick={() => pick(option.value)}>
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const FONT_OPTIONS: ToolOption[] = [
  { label: "默认字体", value: "" },
  ...[
    ["衬线 Serif", "Georgia, 'Times New Roman', 'Songti SC', serif"],
    ["无衬线 Sans", "Arial, Helvetica, 'PingFang SC', 'Microsoft YaHei', sans-serif"],
    ["等宽 Mono", "'Courier New', Consolas, monospace"],
    ["标题 Impact", "Impact, 'Arial Black', sans-serif"],
    ["黑体 Hei", "SimHei, '黑体', 'Microsoft YaHei', sans-serif"],
    ["宋体 Song", "SimSun, '宋体', 'Noto Serif SC', serif"],
    ["楷体 Kai", "KaiTi, '楷体', 'STKaiti', serif"],
    ["仿宋 FangSong", "FangSong, '仿宋', 'STFangsong', serif"],
    ["圆体 Round", "'YouYuan', '幼圆', 'PingFang SC', sans-serif"],
    ["窄体 Condensed", "'Arial Narrow', 'Helvetica Condensed', 'PingFang SC', sans-serif"],
    ["超粗 Black", "'Arial Black', 'Segoe UI Black', 'PingFang SC', sans-serif"],
    ["手写 Script", "'Segoe Script', 'Bradley Hand', 'Comic Sans MS', cursive"],
    ["隶书 LiShu", "LiSu, '隶书', 'STLiti', serif"],
    ["华文行楷 XingKai", "STXingkai, '华文行楷', KaiTi, cursive"],
    ["华文新魏 XinWei", "STXinwei, '华文新魏', SimHei, serif"],
    ["华文彩云 CaiYun", "STCaiyun, '华文彩云', SimHei, sans-serif"],
    ["华文琥珀 HuPo", "STHupo, '华文琥珀', SimHei, sans-serif"],
    ["等线 DengXian", "DengXian, '等线', 'Microsoft YaHei', sans-serif"],
    ["微软雅黑 YaHei", "'Microsoft YaHei', '微软雅黑', 'PingFang SC', sans-serif"],
    ["经典宋 Palatino", "Palatino, 'Palatino Linotype', 'Book Antiqua', serif"],
    ["加拉蒙 Garamond", "Garamond, 'Times New Roman', 'Songti SC', serif"],
    ["世纪哥特 Century Gothic", "'Century Gothic', Futura, 'PingFang SC', sans-serif"],
    ["富兰克林 Franklin Gothic", "'Franklin Gothic Medium', 'Arial Narrow', 'PingFang SC', sans-serif"],
    ["吉尔无衬线 Gill Sans", "'Gill Sans', 'Trebuchet MS', 'PingFang SC', sans-serif"],
    ["特雷布切 Trebuchet", "'Trebuchet MS', Verdana, 'PingFang SC', sans-serif"],
    ["凡尔登 Verdana", "Verdana, Geneva, 'PingFang SC', sans-serif"],
    ["塔霍玛 Tahoma", "Tahoma, 'Segoe UI', 'PingFang SC', sans-serif"],
    ["打字机 Typewriter", "'Lucida Console', Monaco, monospace"],
    ["纸莎草 Papyrus", "Papyrus, 'Segoe Script', cursive"],
  ].map(([label, value]) => ({ label, value, previewStyle: { fontFamily: value } })),
];

const SIZE_VALUES = ["12px", "14px", "16px", "18px", "20px", "24px", "30px", "36px"];

const SIZE_OPTIONS: ToolOption[] = [
  { label: "默认", value: "" },
  ...SIZE_VALUES.map((size) => ({ label: size, value: size })),
];

const TEXT_COLORS = ["#1a1a1a", "#ffffff", "#888888", "#c0392b", "#185fa5", "#0a7d33"];

const BG_COLORS = ["#d8d0c4", "#ffffff", "#f0efeb", "#b8b8b8", "#1a1a1a"];

type EditorContextValue = {
  editor: Editor;
  content: ArticleContent;
  update: (partial: Partial<ArticleContent>) => void;
  insertFile: (kind: FloatBlock["type"], file: File) => void;
};

const EditorContext = createContext<EditorContextValue | null>(null);

function useEditorContext(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("RichEditor context missing");
  return ctx;
}

/** 容器：创建 TipTap 编辑器并提供 context，children 里可自由摆放工具栏与画布。 */
export function RichEditor({ value, onChange, children }: { value: ArticleContent; onChange: (content: ArticleContent) => void; children: ReactNode }) {
  const [content, setContent] = useState<ArticleContent>(value);

  const contentRef = useRef<ArticleContent>(value);
  const mountedRef = useRef(false);

  useEffect(() => { mountedRef.current = true; }, []);

  const editor = useEditor({
    // v3 默认不在事务后重渲染，导致加粗/颜色等按钮的 active 状态无反馈；开启后每个事务（含选区变化）都会刷新工具栏
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit, // v3 已内置 Underline
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Placeholder.configure({ placeholder: "在这里编辑正文……" }),
    ],
    content: value.html,
    onUpdate: ({ editor }) => {
      // 挂载阶段的初始同步不通知父组件，避免渲染期调用父组件 setState
      if (!mountedRef.current) return;
      const html = editor.getHTML();
      if (html === contentRef.current.html) return; // 仅选区变化等未改变内容时跳过
      const next = { ...contentRef.current, html };
      contentRef.current = next;
      setContent(next);
      onChange(next);
    },
  });

  function update(partial: Partial<ArticleContent>) {
    const next = { ...contentRef.current, ...partial };
    contentRef.current = next;
    setContent(next);
    onChange(next);
  }

  async function insertFile(kind: FloatBlock["type"], file: File) {
    const src = (await uploadMedia(file)).url;
    if (!src) throw new Error("上传失败，请重试");
    const block: FloatBlock = { id: crypto.randomUUID(), type: kind, src, x: 0.05, y: 0, w: 0.4 };
    const next = { ...contentRef.current, floats: [...contentRef.current.floats, block] };
    contentRef.current = next;
    setContent(next);
    onChange(next);
  }

  if (!editor) return null;

  return (
    <EditorContext.Provider value={{ editor, content, update, insertFile }}>
      {children}
    </EditorContext.Provider>
  );
}

/** 工具栏（放在页面左侧功能区）。 */
export function EditorToolbar() {
  const { editor, content, update, insertFile } = useEditorContext();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const colorPickerRef = useRef<HTMLInputElement>(null);
  const bgColorPickerRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<{ from: number; to: number } | null>(null);
  const [mediaError, setMediaError] = useState("");

  // 插入媒体（带错误提示，避免静默失败）
  async function insertWithFeedback(kind: FloatBlock["type"], file: File) {
    setMediaError("");
    try {
      await insertFile(kind, file);
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : "插入失败，请重试");
    }
  }

  // 原生颜色选择器打开前保存选区，选择后恢复再应用格式
  function saveSelection() {
    const { from, to } = editor.state.selection;
    selectionRef.current = { from, to };
  }

  function runOnSelection(command: (chain: ReturnType<typeof editor.chain>) => ReturnType<typeof editor.chain>) {
    const sel = selectionRef.current;
    let chain = editor.chain().focus();
    if (sel) chain = chain.setTextSelection({ from: sel.from, to: sel.to });
    command(chain).run();
  }

  // 字体/字号：有选区时应用到选区；光标落在已有样式内时扩展到该样式范围；否则作为后续输入样式
  function applyTextStyle(kind: "fontFamily" | "fontSize", value: string) {
    const { from, to } = editor.state.selection;
    let chain = editor.chain().focus();
    if (from === to) chain = chain.extendMarkRange("textStyle");
    if (kind === "fontFamily") {
      if (value) chain.setFontFamily(value).run();
      else chain.unsetFontFamily().run();
    } else if (value) {
      chain.setFontSize(value).run();
    } else {
      chain.unsetFontSize().run();
    }
  }

  function getTextStyleAttr(attr: "fontFamily" | "fontSize"): string {
    return (editor.getAttributes("textStyle")[attr] as string | undefined) ?? "";
  }

  return (
    <div className="rich-toolbar" role="toolbar" aria-label="正文格式" onPointerDown={(event) => { const target = event.target as HTMLElement; if (target.closest("input, select")) return; event.preventDefault(); }} onMouseDown={(event) => { const tag = (event.target as HTMLElement).tagName; if (tag !== "SELECT" && tag !== "INPUT") event.preventDefault(); }}>
      <div className="tool-group">
        <span className="tool-label">字体</span>
        <ToolDropdown label="字体" options={FONT_OPTIONS} getActiveValue={() => getTextStyleAttr("fontFamily")} onApply={(value) => applyTextStyle("fontFamily", value)} />
      </div>
      <div className="tool-group">
        <span className="tool-label">字号</span>
        <ToolDropdown label="字号" options={SIZE_OPTIONS} getActiveValue={() => getTextStyleAttr("fontSize")} onApply={(value) => applyTextStyle("fontSize", value)} />
      </div>
      <div className="tool-group">
        <span className="tool-label">文字颜色</span>
        <div className="tool-row">
          {TEXT_COLORS.map((color) => <button key={color} type="button" className={`color-dot${editor.isActive("textStyle", { color }) ? " active" : ""}`} style={{ background: color }} onClick={() => editor.chain().focus().setColor(color).run()} aria-label={`文字颜色 ${color}`} />)}
          <button type="button" className="color-picker-swatch" onPointerDown={(event) => { keepFocus(event); saveSelection(); }} onMouseDown={keepFocus} onClick={() => colorPickerRef.current?.click()} title="自定义文字颜色" aria-label="自定义文字颜色"><span aria-hidden="true" /></button>
          <input ref={colorPickerRef} type="color" className="color-picker-input" onPointerDown={saveSelection} onChange={(event) => runOnSelection((chain) => chain.setColor(event.target.value))} tabIndex={-1} aria-hidden="true" title="自定义文字颜色" />
        </div>
      </div>
      <div className="tool-group">
        <span className="tool-label">字体样式</span>
        <div className="tool-row">
          <button type="button" className={editor.isActive("bold") ? "active" : ""} onClick={() => editor.chain().focus().toggleBold().run()} title="加粗" aria-pressed={editor.isActive("bold")}>B</button>
          <button type="button" className={editor.isActive("italic") ? "active" : ""} onClick={() => editor.chain().focus().toggleItalic().run()} title="斜体" aria-pressed={editor.isActive("italic")}>I</button>
          <button type="button" className={editor.isActive("underline") ? "active" : ""} onClick={() => editor.chain().focus().toggleUnderline().run()} title="下划线" aria-pressed={editor.isActive("underline")}>U</button>
        </div>
      </div>
      <div className="tool-group">
        <span className="tool-label">标题层级</span>
        <div className="tool-row">
          <button type="button" className={editor.isActive("heading", { level: 2 }) ? "active" : ""} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="二级标题" aria-pressed={editor.isActive("heading", { level: 2 })}>H2</button>
          <button type="button" className={editor.isActive("heading", { level: 3 }) ? "active" : ""} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="三级标题" aria-pressed={editor.isActive("heading", { level: 3 })}>H3</button>
        </div>
      </div>
      <div className="tool-group">
        <span className="tool-label">对齐</span>
        <div className="tool-row">
          <button type="button" className={editor.isActive({ textAlign: "left" }) ? "active" : ""} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="左对齐" aria-pressed={editor.isActive({ textAlign: "left" })}>左</button>
          <button type="button" className={editor.isActive({ textAlign: "center" }) ? "active" : ""} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="居中" aria-pressed={editor.isActive({ textAlign: "center" })}>中</button>
          <button type="button" className={editor.isActive({ textAlign: "right" }) ? "active" : ""} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="右对齐" aria-pressed={editor.isActive({ textAlign: "right" })}>右</button>
        </div>
      </div>
      <div className="tool-group">
        <span className="tool-label">背景色</span>
        <div className="tool-row">
          {BG_COLORS.map((color) => <button key={color} type="button" className={`color-dot bg-dot${content.background === color ? " active" : ""}`} style={{ background: color }} onClick={() => update({ background: color })} aria-label={`背景色 ${color}`} />)}
          <button type="button" className="color-picker-swatch" onPointerDown={keepFocus} onMouseDown={keepFocus} onClick={() => bgColorPickerRef.current?.click()} title="自定义背景色" aria-label="自定义背景色"><span aria-hidden="true" /></button>
          <input ref={bgColorPickerRef} type="color" className="color-picker-input" value={content.background} onChange={(event) => update({ background: event.target.value })} tabIndex={-1} aria-hidden="true" title="自定义背景色" />
        </div>
      </div>
      <div className="tool-group">
        <span className="tool-label">插入媒体</span>
        <div className="tool-col">
          <button type="button" onClick={() => imageInputRef.current?.click()}>图片</button>
          <button type="button" onClick={() => videoInputRef.current?.click()}>视频</button>
          <button type="button" onClick={() => audioInputRef.current?.click()}>音频</button>
          {mediaError ? <span className="tool-error">{mediaError}</span> : null}
        </div>
      </div>
      <input ref={imageInputRef} type="file" accept="image/*" className="tool-file-input" tabIndex={-1} aria-hidden="true" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void insertWithFeedback("image", file); }} />
      <input ref={videoInputRef} type="file" accept="video/*" className="tool-file-input" tabIndex={-1} aria-hidden="true" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void insertWithFeedback("video", file); }} />
      <input ref={audioInputRef} type="file" accept="audio/*" className="tool-file-input" tabIndex={-1} aria-hidden="true" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void insertWithFeedback("audio", file); }} />
    </div>
  );
}

/** 画布（放在中间区域）。 */
export function EditorCanvas() {
  const { editor, content, update } = useEditorContext();
  return (
    <div className="rich-canvas" style={{ background: content.background }}>
      <EditorContent editor={editor} className="rich-editor-content" />
      <FloatLayer floats={content.floats} onChange={(floats) => update({ floats })} />
    </div>
  );
}

function FloatLayer({ floats, onChange }: { floats: FloatBlock[]; onChange: (floats: FloatBlock[]) => void }) {
  return (
    <div className="float-layer">
      {floats.map((block) => (
        <FloatItem key={block.id} block={block} onUpdate={(next) => onChange(floats.map((b) => (b.id === next.id ? next : b)))} onRemove={() => onChange(floats.filter((b) => b.id !== block.id))} />
      ))}
    </div>
  );
}

function FloatItem({ block, onUpdate, onRemove }: { block: FloatBlock; onUpdate: (block: FloatBlock) => void; onRemove: () => void }) {
  const [drag, setDrag] = useState<null | { mode: "move" | "resize"; startX: number; startY: number; orig: FloatBlock; width: number }>(null);

  function start(event: React.PointerEvent, mode: "move" | "resize") {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.closest(".rich-canvas")?.getBoundingClientRect();
    if (!rect) return;
    setDrag({ mode, startX: event.clientX, startY: event.clientY, orig: block, width: rect.width });
  }

  function onMove(event: PointerEvent) {
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (drag.mode === "move") {
      onUpdate({ ...drag.orig, x: Math.max(0, Math.min(1 - drag.orig.w, drag.orig.x + dx / drag.width)), y: Math.max(0, drag.orig.y + dy) });
    } else {
      const w = Math.max(0.15, Math.min(1 - drag.orig.x, drag.orig.w + dx / drag.width));
      onUpdate({ ...drag.orig, w });
    }
  }

  function end() { setDrag(null); }

  useEffect(() => {
    if (!drag) return;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", end);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", end);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag]);

  return (
    <div
      className={`float-block float-${block.type}${drag ? " dragging" : ""}`}
      style={{ left: `${block.x * 100}%`, top: block.y, width: `${block.w * 100}%` }}
      onPointerDown={(event) => start(event, "move")}
    >
      {block.type === "image" ? <img src={block.src} alt="" draggable={false} /> : block.type === "video" ? <video src={block.src} controls preload="metadata" /> : <audio src={block.src} controls />}
      <button type="button" className="float-remove" onClick={onRemove} aria-label="删除">×</button>
      <span className="float-resize" onPointerDown={(event) => start(event, "resize")} aria-hidden="true" />
    </div>
  );
}
