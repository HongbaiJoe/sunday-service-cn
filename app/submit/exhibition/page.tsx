import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";
import { SubmissionForm } from "../../components/submission-form";
import { LocalizedText } from "../../components/locale-provider";

export const metadata = { title: "申请展览" };
export default function SubmitExhibitionPage() { return <main><SiteHeader /><section className="submission-hero exhibition-submit-hero"><LocalizedText as="p" className="eyebrow" zh="OPEN CALL · 展厅" en="OPEN CALL · EXHIBITIONS" /><LocalizedText as="h1" className="localized-lines" zh={"申请一场\n线上展览"} en={"PROPOSE AN\nEXHIBITION"} /><LocalizedText as="p" zh="主网站负责审核与建立入口，展览本身继续在你的独立网站中发生。" en="The main site reviews proposals and creates the entrance; the exhibition itself remains on your independent website." /></section><SubmissionForm type="exhibition" /><SiteFooter /></main>; }
