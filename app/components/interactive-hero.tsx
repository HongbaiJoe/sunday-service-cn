"use client";

import { useRef } from "react";

export function InteractiveHero({ heroUrl }: { heroUrl: string }) {
  const heroRef = useRef<HTMLElement>(null);

  function moveTitle(event: React.PointerEvent<HTMLElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - 0.5;
    const y = (event.clientY - box.top) / box.height - 0.5;
    heroRef.current?.style.setProperty("--pointer-x", x.toFixed(3));
    heroRef.current?.style.setProperty("--pointer-y", y.toFixed(3));
  }

  function resetTitle() {
    heroRef.current?.style.setProperty("--pointer-x", "0");
    heroRef.current?.style.setProperty("--pointer-y", "0");
  }

  return (
    <section
      className="hero"
      ref={heroRef}
      onPointerMove={moveTitle}
      onPointerLeave={resetTitle}
      aria-labelledby="hero-title"
    >
      <img className="hero-vinyl" src={heroUrl} alt="" aria-hidden="true" />
      <h1 id="hero-title" className="hero-title">
        <span className="hero-line hero-line-one">SUNDAY</span>
        <span className="hero-line hero-line-two">SERVICE CN</span>
      </h1>
      <p className="hero-caption">中国最大的欧美音乐社群</p>
      <a className="scroll-cue" href="#latest" aria-label="向下浏览">
        <span>SCROLL</span>
        <span aria-hidden="true">↓</span>
      </a>
    </section>
  );
}
