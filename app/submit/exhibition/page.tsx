import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";
import { SubmissionForm } from "../../components/submission-form";

export const metadata = { title: "申请展览" };
export default function SubmitExhibitionPage() { return <main><SiteHeader /><section className="submission-hero exhibition-submit-hero"><p className="eyebrow">OPEN CALL · 展厅</p><h1>申请一场<br />线上展览</h1><p>主网站负责审核与建立入口，展览本身继续在你的独立网站中发生。</p></section><SubmissionForm type="exhibition" /><SiteFooter /></main>; }
