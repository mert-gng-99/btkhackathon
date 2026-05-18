"use client";

import { useT } from "@/lib/i18n";

const BAR_HEIGHTS = [42, 65, 38, 88, 56, 72, 50, 80, 95, 60, 48, 78, 52, 70];

export function DashboardKpiScene() {
  const t = useT();
  const d = t.home.analytics.dash;
  return (
    <div className="tl-scene-dash">
      <div className="kpi-row">
        <div className="kpi">
          <div className="lbl">{d.volume}</div>
          <div className="val">92.4{d.volumeUnit.replace(/^[\s·]*K\s*/, " K ").trim().startsWith("K") ? " K" : ""}<span style={{ fontSize: 11, color: "var(--tl-ink-3)", marginLeft: 4 }}>{d.volumeUnit.replace("K USDT", "USDT").replace("K", "")}</span></div>
          <div className="delta up">{t.home.analytics.kpiDeltas.volume}</div>
        </div>
        <div className="kpi">
          <div className="lbl">{d.fees}</div>
          <div className="val">81.7<span style={{ fontSize: 11, color: "var(--tl-ink-3)", marginLeft: 4 }}>{d.feesUnit}</span></div>
          <div className="delta flat">{t.home.analytics.kpiDeltas.feesStable}</div>
        </div>
        <div className="kpi">
          <div className="lbl">{d.rapidTrades}</div>
          <div className="val">41</div>
          <div className="delta" style={{ color: "var(--tl-red)" }}>{t.home.analytics.kpiDeltas.rapidClusters}</div>
        </div>
      </div>

      <div className="bars">
        {BAR_HEIGHTS.map((h, i) => {
          const isPeak = i === 8;
          return (
            <div
              key={i}
              className="bar"
              style={{
                height: `${h}%`,
                background: isPeak ? "var(--tl-amber)" : "var(--tl-cyan)",
                opacity: isPeak ? 0.92 : 0.7,
                animationDelay: `${0.45 + i * 0.04}s`
              }}
            />
          );
        })}
      </div>

      <div className="donut">
        <svg width="86" height="86" viewBox="0 0 100 100">
          <circle className="track" cx="50" cy="50" r="40" />
          <circle className="arc" cx="50" cy="50" r="40" />
        </svg>
        <div className="val">68<span style={{ fontSize: 11, color: "var(--tl-ink-3)" }}>%</span></div>
        <div className="lbl">{d.dominance}</div>
      </div>
    </div>
  );
}
