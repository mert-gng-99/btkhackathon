"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useT } from "@/lib/i18n";
import { formatCompact, formatNumber } from "@/lib/utils/numbers";
import type { AnalyticsData } from "@/types";

const COLORS = ["#5BE0E6", "#F5B544", "#5BD5A0", "#FF6B6B", "#B79CFF", "#7DD3FC", "#F0ABFC", "#CBD5E1"];

function chartTooltipStyle() {
  return {
    background: "rgba(11, 18, 32, 0.96)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: "10px",
    color: "#E7ECF3",
    boxShadow: "0 20px 40px -20px rgba(0,0,0,0.6)"
  };
}

const AXIS_COLOR = "#6B7589";

export function AnalyticsCharts({ analytics }: { analytics: AnalyticsData }) {
  const t = useT();
  const sideData = [
    { name: t.charts.buys, value: analytics.buySell.buys },
    { name: t.charts.sells, value: analytics.buySell.sells }
  ];
  const assetData = analytics.mostTradedSymbols.map((symbol) => ({
    name: symbol.symbol,
    value: symbol.volume
  }));
  const feeData = analytics.feesByAsset.map((fee) => ({
    name: fee.asset,
    value: fee.amount
  }));

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <h2 className="tl-card-title">{t.charts.activityOverTime}</h2>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.activityByDate}>
                <defs>
                  <linearGradient id="activity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5BE0E6" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#5BE0E6" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: AXIS_COLOR, fontSize: 11 }} minTickGap={28} />
                <YAxis tick={{ fill: AXIS_COLOR, fontSize: 11 }} />
                <Tooltip contentStyle={chartTooltipStyle()} formatter={(value) => formatNumber(Number(value))} />
                <Area type="monotone" dataKey="trades" stroke="#5BE0E6" fill="url(#activity)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="tl-card-title">{t.charts.monthlyVolume}</h2>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.activityByMonth}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: AXIS_COLOR, fontSize: 11 }} />
                <YAxis tick={{ fill: AXIS_COLOR, fontSize: 11 }} tickFormatter={formatCompact} />
                <Tooltip contentStyle={chartTooltipStyle()} formatter={(value) => `${formatNumber(Number(value))} USDT`} />
                <Bar dataKey="volume" radius={[4, 4, 0, 0]} fill="#F5B544" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="tl-card-title">{t.charts.tradedAssetShare}</h2>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={assetData} dataKey="value" nameKey="name" innerRadius={64} outerRadius={94} paddingAngle={2}>
                  {assetData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle()} formatter={(value) => `${formatNumber(Number(value))} USDT`} />
                <Legend wrapperStyle={{ color: "#A8B2C4", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="tl-card-title">{t.charts.buyVsSellFees}</h2>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sideData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82}>
                    <Cell fill="#5BD5A0" />
                    <Cell fill="#FF6B6B" />
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle()} />
                  <Legend wrapperStyle={{ color: "#A8B2C4", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={feeData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: AXIS_COLOR, fontSize: 11 }} />
                  <YAxis tick={{ fill: AXIS_COLOR, fontSize: 11 }} />
                  <Tooltip contentStyle={chartTooltipStyle()} formatter={(value) => formatNumber(Number(value))} />
                  <Bar dataKey="value" fill="#B79CFF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
