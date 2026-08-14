import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";
import { SubmissionForm } from "../../components/submission-form";
import { getSiteAssets } from "../../lib/site-assets";

export const metadata = { title: "提交资料" };

export default async function SubmitLibraryPage() {
  const assets = await getSiteAssets();
  const bgUrl = assets["submit.libraryBg"]?.url ?? "";
  return (
    <main>
      <SiteHeader />
      <section
        className="submission-hero"
        style={{
          justifyContent: "center",
          ...(bgUrl ? { backgroundImage: `url(${bgUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : {}),
        }}
      >
        <h1>提交一份<br />音乐资料</h1>
      </section>
      <SubmissionForm type="library" />
      <SiteFooter />
    </main>
  );
}
