"use client";

import Link from "next/link";
import { useEffect } from "react";
import "./showcase.css";
import { useI18n } from "@/lib/i18n";

const heroCandles = [
  { delay: -5.5, x: 80, wickY1: 180, wickY2: 310, rectY: 210, rectH: 70, color: "#5BD5A0" },
  { delay: -5, x: 120, wickY1: 200, wickY2: 330, rectY: 240, rectH: 60, color: "#FF6B6B" },
  { delay: -4.6, x: 160, wickY1: 170, wickY2: 320, rectY: 200, rectH: 90, color: "#5BD5A0" },
  { delay: -4.2, x: 200, wickY1: 140, wickY2: 290, rectY: 170, rectH: 100, color: "#5BD5A0" },
  { delay: -3.8, x: 240, wickY1: 160, wickY2: 310, rectY: 200, rectH: 80, color: "#FF6B6B" },
  { delay: -3.4, x: 280, wickY1: 120, wickY2: 270, rectY: 150, rectH: 100, color: "#5BD5A0" },
  { delay: -3, x: 320, wickY1: 100, wickY2: 250, rectY: 130, rectH: 100, color: "#5BD5A0" },
  { delay: -2.6, x: 360, wickY1: 130, wickY2: 280, rectY: 160, rectH: 100, color: "#FF6B6B" },
  { delay: -2.2, x: 400, wickY1: 90, wickY2: 240, rectY: 120, rectH: 100, color: "#5BD5A0" },
  { delay: -1.8, x: 440, wickY1: 60, wickY2: 210, rectY: 90, rectH: 100, color: "#5BD5A0" },
  { delay: -1.4, x: 480, wickY1: 80, wickY2: 230, rectY: 110, rectH: 100, color: "#FF6B6B" },
  { delay: -1, x: 520, wickY1: 50, wickY2: 200, rectY: 80, rectH: 100, color: "#5BD5A0" },
  { delay: -0.6, x: 560, wickY1: 20, wickY2: 170, rectY: 50, rectH: 100, color: "#5BD5A0" },
  { delay: -0.2, x: 600, wickY1: 40, wickY2: 190, rectY: 70, rectH: 100, color: "#F5B544" }
];

const volBars = [-2.4, -2.1, -1.8, -1.5, -1.2, -0.9, -0.6, -0.3, 0, 0.3];

const dashBars = [
  { delay: -3.8, x: 10, h: 60, color: "#5BE0E6", op: 0.85 },
  { delay: -3.4, x: 50, h: 92, color: "#5BE0E6", op: 0.85 },
  { delay: -3, x: 90, h: 48, color: "#5BE0E6", op: 0.85 },
  { delay: -2.6, x: 130, h: 120, color: "#F5B544", op: 0.9 },
  { delay: -2.2, x: 170, h: 78, color: "#5BE0E6", op: 0.85 },
  { delay: -1.8, x: 210, h: 100, color: "#5BE0E6", op: 0.85 },
  { delay: -1.4, x: 250, h: 64, color: "#5BE0E6", op: 0.85 },
  { delay: -1, x: 290, h: 86, color: "#5BE0E6", op: 0.85 },
  { delay: -0.6, x: 330, h: 110, color: "#F5B544", op: 0.9 },
  { delay: -0.2, x: 370, h: 72, color: "#5BE0E6", op: 0.85 },
  { delay: 0.2, x: 410, h: 56, color: "#5BE0E6", op: 0.85 },
  { delay: 0.6, x: 450, h: 94, color: "#5BE0E6", op: 0.85 },
  { delay: 1, x: 490, h: 68, color: "#5BE0E6", op: 0.85 },
  { delay: 1.4, x: 530, h: 82, color: "#5BE0E6", op: 0.85 }
];

const streamSymbols = [
  "BTCUSDT", "SOLUSDT", "ETHUSDT", "BNBUSDT", "ARBUSDT", "OPUSDT",
  "DOGEUSDT", "LINKUSDT", "AVAXUSDT", "XRPUSDT", "ADAUSDT", "MATICUSDT"
];

export default function ShowcasePage() {
  const { locale, toggleLocale, dict } = useI18n();
  const t = dict.home;

  useEffect(() => {
    const reveals = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const revealObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("in");
        });
      },
      { threshold: 0.05 }
    );
    reveals.forEach((r) => revealObs.observe(r));

    requestAnimationFrame(() => {
      reveals.forEach((r) => {
        const rect = r.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) r.classList.add("in");
      });
    });

    const progress = document.getElementById("tl-progress");
    const updateProgress = () => {
      if (!progress) return;
      const h = document.documentElement;
      const pct = (h.scrollTop || document.body.scrollTop) / ((h.scrollHeight - h.clientHeight) || 1);
      progress.style.width = `${Math.min(100, Math.max(0, pct * 100))}%`;
    };
    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();

    const countObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          if (el.dataset.counted === "1") return;
          el.dataset.counted = "1";
          const to = parseFloat(el.dataset.countTo || "0");
          const dec = to % 1 !== 0 ? 1 : 0;
          const start = performance.now();
          const dur = 1400;
          const tick = (t: number) => {
            const p = Math.min(1, (t - start) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = (to * eased).toFixed(dec);
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.5 }
    );
    document.querySelectorAll<HTMLElement>("[data-count-to]").forEach((el) => countObs.observe(el));

    const tickerSymbols = [
      "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "ARBUSDT", "OPUSDT",
      "AVAXUSDT", "LINKUSDT", "DOGEUSDT", "XRPUSDT", "ADAUSDT", "MATICUSDT",
      "ATOMUSDT", "LTCUSDT", "TRXUSDT"
    ];
    let scanned = 847;
    let trades = 12418;
    let idx = 0;
    const interval = window.setInterval(() => {
      scanned = Math.min(1362, scanned + Math.floor(Math.random() * 3) + 1);
      trades += Math.floor(Math.random() * 18) + 4;
      idx = (idx + 1) % tickerSymbols.length;
      const sc = document.getElementById("tl-sym-scanned");
      const cur = document.getElementById("tl-sym-current");
      const tf = document.getElementById("tl-trades-found");
      if (sc) sc.textContent = `${scanned.toLocaleString()} / 1,362`;
      if (cur) cur.textContent = tickerSymbols[idx];
      if (tf) tf.textContent = trades.toLocaleString();
      if (scanned >= 1362) scanned = 847;
    }, 900);

    return () => {
      window.removeEventListener("scroll", updateProgress);
      revealObs.disconnect();
      countObs.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div className="app-showcase">
      <div className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          <span>{dict.common.appName}</span>
          <span className="label-mono" style={{ marginLeft: 8, color: "var(--ink-3)" }}>{dict.common.version} · /showcase</span>
        </div>
        <nav className="topnav">
          <a href="#hero">{t.nav.overview}</a>
          <a href="#read-only">{t.nav.security}</a>
          <a href="#analytics">{t.nav.analytics}</a>
          <a href="#coach">{t.nav.coach}</a>
          <a href="#sync">{t.nav.sync}</a>
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={toggleLocale}
            aria-label={dict.language.toggleLabel}
            title={dict.language.toggleLabel}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 10px",
              border: "1px solid var(--line-strong)",
              borderRadius: 8,
              background: "rgba(255, 255, 255, 0.04)",
              color: "var(--ink-2)",
              fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.08em",
              cursor: "pointer",
              minHeight: 32
            }}
          >
            <span style={{ color: locale === "en" ? "var(--amber)" : "inherit" }}>{dict.language.short.en}</span>
            <span aria-hidden="true">·</span>
            <span style={{ color: locale === "tr" ? "var(--amber)" : "inherit" }}>{dict.language.short.tr}</span>
          </button>
          <Link href="/connect" className="topcta">{dict.common.openApp} →</Link>
        </div>
      </div>

      <div className="progress" id="tl-progress" />

      <main className="deck">
        {/* ============ HERO ============ */}
        <section className="hero-section" id="hero">
          <div className="grid-overlay" />

          <div className="hero-video-wrap" aria-hidden="true">
            <div className="video-frame hero-fill">
              <div className="scene-chart">
                <div className="grid" />
                <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
                  <defs>
                    <linearGradient id="priceFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#F5B544" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#F5B544" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  <g transform="translate(0,200)">
                    {heroCandles.map((c, i) => (
                      <g key={i} className="candle" style={{ animationDelay: `${c.delay}s` }}>
                        <line x1={c.x} y1={c.wickY1} x2={c.x} y2={c.wickY2} stroke={c.color} strokeWidth="1.5" />
                        <rect x={c.x - 8} y={c.rectY} width="16" height={c.rectH} fill={c.color} opacity={c.color === "#F5B544" ? 0.95 : 0.85} />
                      </g>
                    ))}
                  </g>

                  <path
                    className="price-line"
                    d="M 50 620 L 200 580 L 380 540 L 560 470 L 740 510 L 920 430 L 1100 380 L 1280 410 L 1460 320 L 1560 290"
                    fill="none"
                    stroke="#F5B544"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.9"
                  />
                  <path
                    d="M 50 620 L 200 580 L 380 540 L 560 470 L 740 510 L 920 430 L 1100 380 L 1280 410 L 1460 320 L 1560 290 L 1560 900 L 50 900 Z"
                    fill="url(#priceFill)"
                    opacity="0.4"
                  />

                  <g transform="translate(0, 780)" opacity="0.7">
                    {volBars.map((delay, i) => (
                      <rect
                        key={i}
                        className="hero-vol-bar"
                        style={{ animationDelay: `${delay}s` }}
                        x={80 + i * 80}
                        y="0"
                        width="14"
                        height="80"
                        fill="#5BE0E6"
                        opacity="0.55"
                      />
                    ))}
                  </g>

                  {[0, -1, -2, -3].map((delay, i) => (
                    <circle
                      key={i}
                      r="3"
                      fill={i % 2 === 0 ? "#5BE0E6" : "#F5B544"}
                      className="flow-dot"
                      style={{
                        offsetPath:
                          "path('M -50 500 C 300 380, 500 600, 800 420 S 1300 280, 1700 360')",
                        animationDelay: `${delay}s`
                      }}
                    />
                  ))}
                </svg>
              </div>
            </div>
          </div>

          <div className="hero hero-inner stagger reveal" data-reveal>
            <span className="eyebrow"><span className="pulse" />{t.hero.eyebrow}</span>
            <h1 className="display">{t.hero.title[0]}<br />{t.hero.title[1]}</h1>
            <p className="sub">{t.hero.sub}</p>
            <div className="ctas">
              <Link className="btn btn-primary" href="/connect">
                {t.hero.ctaPrimary} <span className="arrow">→</span>
              </Link>
              <Link className="btn btn-ghost" href="/ai-coach">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 2 L11 7 L3 12 Z" fill="currentColor" /></svg>
                {t.hero.ctaSecondary}
              </Link>
            </div>
            <div className="trust">
              <div className="item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12h12M3 6h12M3 18h12M21 9l-3 3 3 3" /><line x1="14" y1="6" x2="22" y2="14" />
                </svg>
                {t.hero.trust.noWithdrawals}
              </div>
              <div className="item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                {t.hero.trust.noTrading}
              </div>
              <div className="item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" />
                </svg>
                {t.hero.trust.secretsDiscarded}
              </div>
              <div className="item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
                </svg>
                {t.hero.trust.openSource}
              </div>
            </div>
          </div>

          <div className="scroll-hint" aria-hidden="true">
            <span>{t.hero.scroll}</span>
            <span className="chev" />
          </div>
        </section>

        {/* ============ INTRO BAND ============ */}
        <section className="section tight" style={{ paddingTop: 80, paddingBottom: 40 }}>
          <div className="container">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr 1fr 1fr",
                gap: 32,
                alignItems: "end",
                padding: "32px 0",
                borderTop: "1px solid var(--line)",
                borderBottom: "1px solid var(--line)"
              }}
            >
              <div>
                <div className="label-mono" style={{ marginBottom: 8 }}>{t.intro.whatItIs}</div>
                <div style={{ fontSize: 17, lineHeight: 1.5, color: "var(--ink-2)", maxWidth: 380 }}>
                  {t.intro.whatItIsBody}
                </div>
              </div>
              <div>
                <div className="label-mono" style={{ marginBottom: 6 }}>{t.intro.markets}</div>
                <div style={{ fontSize: 15, color: "var(--ink)" }}>{t.intro.marketsBody}</div>
              </div>
              <div>
                <div className="label-mono" style={{ marginBottom: 6 }}>{t.intro.stack}</div>
                <div style={{ fontSize: 15, color: "var(--ink)" }}>{t.intro.stackBody}</div>
              </div>
              <div>
                <div className="label-mono" style={{ marginBottom: 6 }}>{t.intro.status}</div>
                <div className="mono" style={{ fontSize: 15, color: "var(--green)" }}>● {t.intro.statusBody}</div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ READ-ONLY ============ */}
        <section className="section" id="read-only">
          <div className="grid-overlay" />
          <div className="two-col l60">
            <div className="reveal" data-reveal>
              <div className="video-frame">
                <span className="video-badge"><span className="rec" />{t.security.keyCard.loopName}</span>
                <div className="scene-keys">
                  <div className="key-card swap">
                    <div className="row"><span className="k">{t.security.keyCard.apiKey}</span><span className="v mono">····7F4A · 9E2C</span></div>
                    <div className="row"><span className="k">{t.security.keyCard.accountScope}</span><span className="v">{t.security.keyCard.scopeValue}</span></div>
                    <div className="row flash-red"><span className="k">{t.security.keyCard.enableTrading}</span><span className="v">{t.security.keyCard.denied}</span></div>
                    <div className="row flash-red"><span className="k">{t.security.keyCard.enableWithdrawals}</span><span className="v">{t.security.keyCard.denied}</span></div>
                    <div className="row flash-green"><span className="k">{t.security.keyCard.enableReading}</span><span className="v">{t.security.keyCard.ok}</span></div>
                    <div className="key-status" style={{ background: "rgba(91,213,160,0.1)", color: "var(--green)", border: "1px solid rgba(91,213,160,0.25)" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12l4 4 10-10" /></svg>
                      {t.security.keyCard.accepted}
                    </div>
                    <div className="stamp-x">✕</div>
                    <div className="stamp-check">✓</div>
                  </div>
                </div>
                <div className="video-caption"><span>{t.security.keyCard.loopName}</span><span>00:04 / 00:08</span></div>
              </div>
            </div>

            <div className="reveal stagger" data-reveal>
              <span className="label-mono">{t.security.eyebrow}</span>
              <h2 className="heading">{t.security.title[0]}<br />{t.security.title[1]}</h2>
              <p className="sub" style={{ marginBottom: 18 }}>{t.security.sub}</p>

              {t.security.bullets.map((bullet, i) => (
                <div className="bullet" key={i}>
                  <span className="icon">
                    {i === 0 ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    ) : i === 1 ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 6h16M4 12h16M4 18h10" />
                      </svg>
                    )}
                  </span>
                  <div>
                    <div className="title">{bullet.title}</div>
                    <div className="desc">{bullet.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ ANALYTICS ============ */}
        <section className="section" id="analytics">
          <div className="grid-overlay" />
          <div className="center-col stagger reveal" data-reveal>
            <span className="label-mono">{t.analytics.eyebrow}</span>
            <h2 className="heading" style={{ maxWidth: 1100 }}>{t.analytics.title[0]}<br />{t.analytics.title[1]}</h2>
            <p className="sub" style={{ marginBottom: 36 }}>{t.analytics.sub}</p>

            <div style={{ position: "relative", width: "min(1120px, 100%)" }}>
              <div className="video-frame">
                <span className="video-badge"><span className="rec" />{t.analytics.dash.loopName}</span>
                <div className="scene-dash">
                  <div className="dash-kpi">
                    <div className="k">{t.analytics.dash.volume}</div>
                    <div className="v numeric"><span data-count-to="92.4">0.0</span><span className="u">{t.analytics.dash.volumeUnit}</span></div>
                    <div className="d">{t.analytics.kpiDeltas.volume}</div>
                  </div>
                  <div className="dash-kpi">
                    <div className="k">{t.analytics.dash.fees}</div>
                    <div className="v numeric"><span data-count-to="81.7">0.0</span><span className="u">{t.analytics.dash.feesUnit}</span></div>
                    <div className="d" style={{ color: "var(--amber)" }}>{t.analytics.kpiDeltas.feesStable}</div>
                  </div>
                  <div className="dash-kpi">
                    <div className="k">{t.analytics.dash.rapidTrades}</div>
                    <div className="v numeric"><span data-count-to="41">0</span></div>
                    <div className="d" style={{ color: "var(--red)" }}>{t.analytics.kpiDeltas.rapidClusters}</div>
                  </div>

                  <div className="dash-chart">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div>
                        <div className="k" style={{ color: "var(--ink-3)", fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}>{t.analytics.dash.volumeChart}</div>
                        <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{t.analytics.dash.volumeChartSub}</div>
                      </div>
                      <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{t.analytics.dash.peak} <span style={{ color: "var(--cyan)" }}>14.2K</span></div>
                    </div>
                    <svg viewBox="0 0 600 140" preserveAspectRatio="none" style={{ width: "100%", height: 120 }}>
                      <g transform="translate(0,140) scale(1,-1)">
                        {dashBars.map((b, i) => (
                          <rect
                            key={i}
                            className="bar"
                            style={{ animationDelay: `${b.delay}s` }}
                            x={b.x}
                            y="0"
                            width="26"
                            height={b.h}
                            fill={b.color}
                            opacity={b.op}
                            rx="3"
                          />
                        ))}
                      </g>
                    </svg>
                  </div>

                  <div className="dash-donut">
                    <div className="k" style={{ alignSelf: "flex-start", color: "var(--ink-3)", fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}>{t.analytics.dash.symbolConcentration}</div>
                    <svg className="donut-ring" width="120" height="120" viewBox="0 0 100 100" style={{ margin: "8px 0" }}>
                      <circle className="track" cx="50" cy="50" r="40" />
                      <circle className="arc" cx="50" cy="50" r="40" />
                    </svg>
                    <div style={{ textAlign: "center", marginTop: -8 }}>
                      <div className="numeric" style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>
                        68<span style={{ color: "var(--ink-3)", fontSize: 13 }}>%</span>
                      </div>
                      <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 2 }}>{t.analytics.dash.dominance}</div>
                    </div>
                  </div>
                </div>

                <div className="callout callout-1"><span className="pin">◆</span>{t.analytics.callouts.concentration}</div>
                <div className="callout callout-2 right"><span className="pin">◆</span>{t.analytics.callouts.spotPnl}</div>
                <div className="callout callout-3"><span className="pin">◆</span>{t.analytics.callouts.rapidTrades}</div>

                <div className="video-caption">
                  <span>{t.analytics.dash.loopName}</span>
                  <span style={{ color: "var(--cyan)" }}>{t.analytics.dash.spotPnlValue}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ AI COACH ============ */}
        <section className="section" id="coach">
          <div className="grid-overlay" />
          <div className="two-col r60">
            <div className="reveal stagger" data-reveal>
              <span className="label-mono">{t.coach.eyebrow}</span>
              <h2 className="heading">{t.coach.title[0]}<br />{t.coach.title[1]}</h2>
              <p className="sub" style={{ marginBottom: 14 }}>{t.coach.sub}</p>
              <p className="sub" style={{ marginBottom: 24, color: "var(--ink-3)", fontSize: 14 }}>{t.coach.subNote}</p>

              {t.coach.bullets.map((bullet, i) => (
                <div className="bullet" key={i}>
                  <span className="icon">
                    {i === 0 ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 7h16M4 12h16M4 17h10" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="9" /><path d="M9 12l2 2 4-4" />
                      </svg>
                    )}
                  </span>
                  <div>
                    <div className="title">{bullet.title}</div>
                    <div className="desc">{bullet.desc}</div>
                  </div>
                </div>
              ))}
              <p className="mono" style={{ color: "var(--ink-3)", fontSize: 11, marginTop: 24 }}>{t.coach.footnote}</p>
            </div>

            <div className="reveal" data-reveal>
              <div
                className="video-frame"
                style={{ background: "radial-gradient(500px 400px at center, rgba(91,224,230,0.08), transparent 70%)" }}
              >
                <span className="video-badge"><span className="rec" />{t.coach.eyebrow} · BTCUSDT</span>
                <div className="scene-coach">
                  <div className="phone">
                    <div className="phone-header">
                      <div className="av" />
                      <div>
                        <div className="nm">{t.coach.phone.name}</div>
                        <div className="mono" style={{ fontSize: 9.5, color: "var(--ink-3)" }}>{t.coach.phone.status}</div>
                      </div>
                      <div className="st">{t.coach.phone.online}</div>
                    </div>
                    <div className="phone-body">
                      <div className="msg user msg-anim delay-1">{t.coach.phone.msg1}</div>
                      <div className="msg ai msg-anim delay-2">
                        {t.coach.phone.msg2Pre}
                        <span className="mono numeric" style={{ color: "var(--amber)" }}>38.2K</span>{t.coach.phone.msg2Mid}
                        <span className="mono">3.1×</span>{t.coach.phone.msg2Mid2}<span className="mono">0.04%</span>{t.coach.phone.msg2End}
                        <span className="mono numeric" style={{ color: "var(--amber)" }}>+15.3 USDT</span>{t.coach.phone.msg2End2}
                        <div className="citations">
                          <span className="cite">{t.coach.phone.cite1}</span>
                          <span className="cite">{t.coach.phone.cite2}</span>
                          <span className="cite">{t.coach.phone.cite3}</span>
                        </div>
                      </div>
                      <div className="msg user msg-anim delay-3">{t.coach.phone.msg3}</div>
                      <div className="msg ai msg-anim delay-3" style={{ animationDelay: "6s" }}>
                        <div className="typing"><span /><span /><span /></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="video-caption"><span>{t.coach.phone.loopName}</span><span>{t.coach.phone.loopSub}</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ SYNC ============ */}
        <section className="section" id="sync">
          <div className="grid-overlay" />
          <div className="two-col l60">
            <div className="reveal" data-reveal>
              <div className="video-frame">
                <span className="video-badge"><span className="rec" />{t.sync.ui.jobId}</span>
                <div className="scene-sync">
                  <div>
                    <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{t.sync.ui.progress}</div>
                    <div className="sync-row">
                      <div className="sync-bar"><div className="fill" /></div>
                      <div className="numeric" style={{ fontWeight: 500, color: "var(--amber)" }}>62<span style={{ color: "var(--ink-3)" }}>%</span></div>
                    </div>
                  </div>

                  <div className="sync-ticker">
                    <span className="lk">{t.sync.ui.symbolsScanned}</span><span className="lv numeric" id="tl-sym-scanned">847 / 1,362</span>
                    <span className="lk">{t.sync.ui.currentSymbol}</span><span className="lv" id="tl-sym-current" style={{ color: "var(--cyan)" }}>SOLUSDT</span>
                    <span className="lk">{t.sync.ui.tradesFound}</span><span className="lv numeric" id="tl-trades-found" style={{ color: "var(--amber)" }}>12,418</span>
                    <span className="lk">{t.sync.ui.markets}</span><span className="lv">{t.sync.ui.marketsValue}</span>
                  </div>

                  <div>
                    <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{t.sync.ui.activeStream}</div>
                    <div className="symbol-stream">
                      <div className="track">
                        {[...streamSymbols, ...streamSymbols].map((s, i) => (
                          <div key={i} className={`symbol-chip${s === "SOLUSDT" ? " hot" : ""}`}>{s}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="video-caption"><span>{t.sync.ui.loopName}</span><span>{t.sync.ui.timeLeft}</span></div>
              </div>
            </div>

            <div className="reveal stagger" data-reveal>
              <span className="label-mono">{t.sync.eyebrow}</span>
              <h2 className="heading">{t.sync.title.map((line, i) => (
                <span key={i}>{line}{i < t.sync.title.length - 1 ? <br /> : null}</span>
              ))}</h2>
              <p className="sub" style={{ marginBottom: 18 }}>{t.sync.sub}</p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {t.sync.tags.map((tag) => (
                  <span key={tag} className="symbol-chip">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ============ STACK & FOOTER ============ */}
        <section className="section footer" id="stack">
          <div className="grid-overlay" />
          <div className="center-col reveal stagger" data-reveal>
            <span className="label-mono">{t.footer.eyebrow}</span>
            <h2 className="heading" style={{ maxWidth: 900 }}>{t.footer.title[0]}<br />{t.footer.title[1]}</h2>

            <div className="stack-row">
              {t.footer.stack.map((label, i) => (
                <div key={label} className="stack-chip">
                  <span className="d" style={i === t.footer.stack.length - 1 ? { background: "var(--amber)" } : undefined} />
                  {label}
                </div>
              ))}
            </div>

            <div className="reassure-grid">
              {t.footer.reassureCards.map((card, i) => (
                <div className="reassure-card" key={card.title}>
                  <div className="ic">
                    {i === 0 ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 6h16M4 12h16M4 18h10" /><circle cx="20" cy="18" r="2" />
                      </svg>
                    ) : i === 1 ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="8" r="4" /><path d="M4 22c0-4.4 3.6-8 8-8s8 3.6 8 8" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                      </svg>
                    )}
                  </div>
                  <div className="t">{card.title}</div>
                  <div className="b">{card.body}</div>
                </div>
              ))}
            </div>

            <div className="final-cta">
              <div>
                <h3>{t.footer.cta.title[0]}<br />{t.footer.cta.title[1]}</h3>
                <p>{t.footer.cta.sub}</p>
              </div>
              <Link className="btn-final" href="/connect">
                {t.footer.cta.button} <span>→</span>
              </Link>
            </div>

            <div className="foot">
              <div>{t.footer.meta}</div>
              <div>
                <a href="#gh">{t.footer.links.github}</a>
                <a href="mailto:security@hackathon.mertgungor.me">{t.footer.links.security}</a>
                <a href="#disclosure">{t.footer.links.disclosure}</a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
