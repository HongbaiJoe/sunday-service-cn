import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";
import { SubmissionForm } from "../../components/submission-form";

export const metadata = { title: "提交资料" };
export default function SubmitLibraryPage() { return <main><SiteHeader /><section className="submission-hero"><p className="eyebrow">SUBMIT · 资料库</p><h1>提交一份<br />音乐资料</h1><p>可以是歌曲档案、人物资料、课程、流派研究或社区原创。</p></section><SubmissionForm type="library" /><SiteFooter /></main>; }
