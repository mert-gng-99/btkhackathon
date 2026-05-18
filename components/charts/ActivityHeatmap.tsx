"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useT } from "@/lib/i18n";
import type { AnalyticsData } from "@/types";

function intensity(count: number, max: number): string {
  if (count === 0 || max === 0) return "rgba(255, 255, 255, 0.02)";
  const ratio = count / max;
  if (ratio > 0.75) return "rgba(245, 181, 68, 0.9)";
  if (ratio > 0.5) return "rgba(91, 224, 230, 0.85)";
  if (ratio > 0.25) return "rgba(91, 224, 230, 0.45)";
  return "rgba(91, 224, 230, 0.18)";
}

export function ActivityHeatmap({ analytics }: { analytics: AnalyticsData }) {
  const t = useT();
  const max = Math.max(...analytics.heatmap.map((point) => point.trades), 0);
  const days = t.charts.days;

  return (
    <Card>
      <CardHeader>
        <h2 className="tl-card-title">{t.charts.heatmapTitle}</h2>
      </CardHeader>
      <CardContent>
        <div style={{ overflowX: "auto" }}>
          <div
            style={{
              display: "grid",
              minWidth: 760,
              gridTemplateColumns: "52px repeat(24, minmax(22px, 1fr))",
              gap: 4
            }}
          >
            <div />
            {Array.from({ length: 24 }, (_, hour) => (
              <div key={hour} style={{ textAlign: "center", fontSize: 10, color: "var(--tl-ink-3)" }}>
                {hour}
              </div>
            ))}
            {days.map((day, dayIndex) => (
              <div style={{ display: "contents" }} key={day}>
                <div style={{ display: "flex", alignItems: "center", fontSize: 11, color: "var(--tl-ink-3)" }}>{day}</div>
                {Array.from({ length: 24 }, (_, hour) => {
                  const point = analytics.heatmap.find((item) => item.dayOfWeek === dayIndex && item.hour === hour);
                  return (
                    <div
                      key={`${day}-${hour}`}
                      title={`${day} ${hour}:00 UTC · ${point?.trades ?? 0}`}
                      style={{
                        height: 20,
                        borderRadius: 4,
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        background: intensity(point?.trades ?? 0, max)
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
