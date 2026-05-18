"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import type { AnalyticsData } from "@/types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function intensity(count: number, max: number): string {
  if (count === 0 || max === 0) {
    return "bg-slate-900";
  }
  const ratio = count / max;
  if (ratio > 0.75) return "bg-amber-300";
  if (ratio > 0.5) return "bg-cyan-300";
  if (ratio > 0.25) return "bg-cyan-600";
  return "bg-slate-600";
}

export function ActivityHeatmap({ analytics }: { analytics: AnalyticsData }) {
  const max = Math.max(...analytics.heatmap.map((point) => point.trades), 0);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-white">Activity heatmap by UTC day and hour</h2>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="grid min-w-[760px] grid-cols-[52px_repeat(24,minmax(22px,1fr))] gap-1">
            <div />
            {Array.from({ length: 24 }, (_, hour) => (
              <div key={hour} className="text-center text-[10px] text-slate-500">
                {hour}
              </div>
            ))}
            {DAYS.map((day, dayIndex) => (
              <div className="contents" key={day}>
                <div className="flex items-center text-xs text-slate-500">{day}</div>
                {Array.from({ length: 24 }, (_, hour) => {
                  const point = analytics.heatmap.find((item) => item.dayOfWeek === dayIndex && item.hour === hour);
                  return (
                    <div
                      key={`${day}-${hour}`}
                      title={`${day} ${hour}:00 UTC - ${point?.trades ?? 0} trades`}
                      className={`h-5 rounded-sm border border-slate-800 ${intensity(point?.trades ?? 0, max)}`}
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

