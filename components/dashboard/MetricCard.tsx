import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface MetricCardProps {
  label: string;
  value: string;
  detail?: string;
  icon?: ReactNode;
  tone?: "cyan" | "amber" | "emerald" | "rose" | "slate";
}

const iconTone: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  cyan: "tl-tone-cyan",
  amber: "tl-tone-amber",
  emerald: "tl-tone-green",
  rose: "tl-tone-red",
  slate: ""
};

export function MetricCard({ label, value, detail, icon, tone = "cyan" }: MetricCardProps) {
  return (
    <div className="tl-card">
      <div className="tl-card-pad" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p className="tl-label-mono">{label}</p>
          <p className="tl-numeric" style={{ marginTop: 8, fontSize: "clamp(22px, 2.4vw, 28px)", fontWeight: 600, color: "var(--tl-ink)", letterSpacing: "-0.02em" }}>
            {value}
          </p>
          {detail ? (
            <p
              style={{
                marginTop: 6,
                fontSize: 13,
                color: "var(--tl-ink-3)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
              title={detail}
            >
              {detail}
            </p>
          ) : null}
        </div>
        {icon ? (
          <span
            className={cn("tl-tone-" + (tone === "emerald" ? "green" : tone === "rose" ? "red" : tone), iconTone[tone])}
            style={{
              flexShrink: 0,
              padding: 8,
              borderRadius: 10,
              border: "1px solid var(--tl-line-strong)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            {icon}
          </span>
        ) : null}
      </div>
    </div>
  );
}
