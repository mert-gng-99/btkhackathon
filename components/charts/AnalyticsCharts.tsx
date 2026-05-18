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
import { formatCompact, formatNumber } from "@/lib/utils/numbers";
import type { AnalyticsData } from "@/types";

const COLORS = ["#22d3ee", "#f59e0b", "#34d399", "#fb7185", "#a78bfa", "#38bdf8", "#f472b6", "#cbd5e1"];

function chartTooltipStyle() {
  return {
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#f8fafc"
  };
}

export function AnalyticsCharts({ analytics }: { analytics: AnalyticsData }) {
  const sideData = [
    { name: "Buys", value: analytics.buySell.buys },
    { name: "Sells", value: analytics.buySell.sells }
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
          <h2 className="text-base font-semibold text-white">Trading activity over time</h2>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.activityByDate}>
                <defs>
                  <linearGradient id="activity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1f2937" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} minTickGap={28} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <Tooltip contentStyle={chartTooltipStyle()} formatter={(value) => formatNumber(Number(value))} />
                <Area type="monotone" dataKey="trades" stroke="#22d3ee" fill="url(#activity)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-white">Monthly volume</h2>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.activityByMonth}>
                <CartesianGrid stroke="#1f2937" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} tickFormatter={formatCompact} />
                <Tooltip contentStyle={chartTooltipStyle()} formatter={(value) => `${formatNumber(Number(value))} USDT`} />
                <Bar dataKey="volume" radius={[4, 4, 0, 0]} fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-white">Traded asset share</h2>
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
                <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-white">Buy vs sell and fees</h2>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sideData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82}>
                    <Cell fill="#34d399" />
                    <Cell fill="#fb7185" />
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle()} />
                  <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={feeData}>
                  <CartesianGrid stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <Tooltip contentStyle={chartTooltipStyle()} formatter={(value) => formatNumber(Number(value))} />
                  <Bar dataKey="value" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

