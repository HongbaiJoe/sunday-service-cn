import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";
import { SubmissionForm } from "../../components/submission-form";
import { getSiteAssets } from "../../lib/site-assets";
import { LocalizedText } from "../../components/locale-provider";

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
        <LocalizedText as="h1" className="localized-lines" zh={"提交一份\n音乐资料"} en={"SUBMIT A\nMUSIC ENTRY"} />
      </section>
      <SubmissionForm type="library" />
      <SiteFooter />
    </main>
  );
}
