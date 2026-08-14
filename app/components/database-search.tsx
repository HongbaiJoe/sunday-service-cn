"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

/** 资料库搜索框（放在资料库标题右侧，通过 URL ?q= 与列表联动）。 */
export function DatabaseSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";

  return (
    <div className="search-box-wrap">
      <div className="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input
          type="search"
          value={query}
          onChange={(event) => {
            const value = event.target.value;
            const params = new URLSearchParams(searchParams.toString());
            if (value) params.set("q", value); else params.delete("q");
            const qs = params.toString();
            router.replace(qs ? `/database?${qs}` : "/database", { scroll: false });
          }}
          placeholder="搜索歌曲、人物、流派、课程…"
          aria-label="搜索资料库"
        />
      </div>
      <Link className="submit-inline" href="/submit/library">＋ 提交资料</Link>
    </div>
  );
}
