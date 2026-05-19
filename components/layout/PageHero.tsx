"use client";

import type { ReactNode } from "react";

interface PageHeroProps {
  eyebrow: string;
  title: string | ReactNode;
  sub: string;
  scene: ReactNode;
  /** Optional small caption shown bottom-left of the cinematic frame */
  sceneLabel?: string;
  /** Optional cinematic loop caption shown bottom-right */
  sceneRight?: string;
  /** Optional badge color tone for the eyebrow pulse */
  eyebrowTone?: "amber" | "cyan" | "green" | "red";
}

const toneClass: Record<NonNullable<PageHeroProps["eyebrowTone"]>, string> = {
  amber: "",
  cyan: "tl-eyebrow-cyan",
  green: "tl-eyebrow-green",
  red: "tl-eyebrow-red"
};

export function PageHero({ eyebrow, title, sub, scene, sceneLabel, sceneRight, eyebrowTone = "amber" }: PageHeroProps) {
  return (
    <section className="tl-pagehero tl-reveal in">
      <div className="tl-hero" style={{ position: "relative", zIndex: 1 }}>
        <span className={`tl-eyebrow ${toneClass[eyebrowTone]}`} style={{ marginBottom: 4 }}>
          <span className="tl-pulse" />
          {eyebrow}
        </span>
        <h1 className="tl-display">{title}</h1>
        <p className="tl-sub" style={{ marginTop: 4 }}>{sub}</p>
      </div>

      <div className="tl-frame tl-pagehero-frame" aria-hidden="true">
        <div className="tl-pagehero-frame-grid" />
        {sceneLabel ? (
          <span className="tl-frame-badge">
            <span className="rec" />
            {sceneLabel}
          </span>
        ) : null}
        {scene}
        {sceneRight ? (
          <span
            style={{
              position: "absolute",
              bottom: 12,
              right: 14,
              fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
              fontSize: 10.5,
              letterSpacing: "0.06em",
              color: "var(--tl-ink-3)"
            }}
          >
            {sceneRight}
          </span>
        ) : null}
      </div>
    </section>
  );
}
