"use client";

import { DatabaseSearch } from "./database-search";
import { useLocale } from "./locale-provider";

export function PageIntro({
  title,
  titleEn,
  description,
  descriptionEn,
  variant,
}: {
  title: string;
  titleEn?: string;
  description?: string;
  descriptionEn?: string;
  variant: "community" | "database" | "exhibitions" | "events";
}) {
  const { t } = useLocale();
  const visibleTitle = t(title, titleEn ?? title);
  const visibleDescription = description ? t(description, descriptionEn ?? description) : undefined;
  return (
    <section className={`page-intro page-intro--${variant}`}>
      <div className="page-index" aria-hidden="true">{" "}</div>
      <div className="page-intro-copy">
        <h1 data-text={visibleTitle}>{visibleTitle}</h1>
        {visibleDescription ? <p>{visibleDescription}</p> : null}
      </div>
      {variant === "database" ? <DatabaseSearch /> : <IntroArtwork variant={variant} />}
    </section>
  );
}

function IntroArtwork({ variant }: { variant: "community" | "exhibitions" | "events" }) {
  const { t } = useLocale();
  if (variant === "community") {
    return (
      <div className="intro-art intro-community" aria-hidden="true">
        <div className="collage-card collage-card-a"><small>POST 031</small><b>{t("现在播放", "NOW PLAYING")}</b><span>4:32</span></div>
        <div className="collage-card collage-card-b"><small>OPEN NOTE</small><b>{t("专辑讨论", "ALBUM TALK")}</b><span>{t("38 回复", "38 REPLIES")}</span></div>
        <div className="collage-card collage-card-c"><small>NEW DEMO</small><b>{t("作品交换", "WORK SWAP")}</b><span>PLAY ↗</span></div>
      </div>
    );
  }

  if (variant === "exhibitions") {
    return (
      <div className="intro-art intro-exhibitions" aria-hidden="true">
        <div className="frame frame-back"><span>002</span></div>
        <div className="frame frame-mid"><span>OPEN<br />ROOM</span></div>
        <div className="frame frame-front"><small>EXHIBITION 001</small><b>PABLO<br />/ KING</b></div>
      </div>
    );
  }

  return (
    <div className="intro-art intro-events" aria-hidden="true">
      <div className="event-ticket ticket-a"><small>AUG</small><b>24</b><span>LISTENING ROOM</span></div>
      <div className="event-ticket ticket-b"><small>SEP</small><b>06</b><span>DEMO NIGHT</span></div>
      <div className="event-orbit"><i /><span>LIVE</span></div>
    </div>
  );
}
