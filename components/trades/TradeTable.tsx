"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { formatDateTime } from "@/lib/utils/dates";
import { formatNumber } from "@/lib/utils/numbers";
import type { NormalizedTrade, TradeSide } from "@/types";

type SortKey = "timestamp" | "symbol" | "price" | "quantity" | "quoteQuantity" | "fee";

interface TradeTableProps {
  trades: NormalizedTrade[];
  sessionId: string;
}

export function TradeTable({ trades, sessionId }: TradeTableProps) {
  const [search, setSearch] = useState("");
  const [symbol, setSymbol] = useState("ALL");
  const [side, setSide] = useState<TradeSide | "ALL">("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const symbols = useMemo(() => Array.from(new Set(trades.map((trade) => trade.symbol))).sort(), [trades]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const rows = trades.filter((trade) => {
      const matchesSearch =
        !needle ||
        trade.symbol.toLowerCase().includes(needle) ||
        trade.orderId.toLowerCase().includes(needle) ||
        trade.tradeId.toLowerCase().includes(needle);
      const matchesSymbol = symbol === "ALL" || trade.symbol === symbol;
      const matchesSide = side === "ALL" || trade.side === side;
      return matchesSearch && matchesSymbol && matchesSide;
    });

    return [...rows].sort((a, b) => {
      const aValue = sortKey === "timestamp" || sortKey === "symbol" ? a[sortKey] : Number(a[sortKey]);
      const bValue = sortKey === "timestamp" || sortKey === "symbol" ? b[sortKey] : Number(b[sortKey]);
      const result = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      return sortDirection === "asc" ? result : -result;
    });
  }, [search, side, sortDirection, sortKey, symbol, trades]);

  function toggleSort(nextKey: SortKey) {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection("desc");
  }

  function exportCsv() {
    window.location.href = `/api/export/trades?sessionId=${encodeURIComponent(sessionId)}`;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">All normalized trades</h2>
            <p className="mt-1 text-sm text-slate-500">{filtered.length} of {trades.length} trades shown</p>
          </div>
          <Button type="button" variant="secondary" onClick={exportCsv}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_160px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-9 h-4 w-4 text-slate-500" aria-hidden="true" />
            <Input label="Search" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Symbol, order ID, trade ID" />
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">Symbol</span>
            <select
              value={symbol}
              onChange={(event) => setSymbol(event.target.value)}
              className="h-10 w-full cursor-pointer rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-cyanData"
            >
              <option value="ALL">All symbols</option>
              {symbols.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">Side</span>
            <select
              value={side}
              onChange={(event) => setSide(event.target.value as TradeSide | "ALL")}
              className="h-10 w-full cursor-pointer rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-cyanData"
            >
              <option value="ALL">All sides</option>
              <option value="BUY">Buy</option>
              <option value="SELL">Sell</option>
            </select>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                {[
                  ["timestamp", "Time"],
                  ["symbol", "Symbol"],
                  ["price", "Price"],
                  ["quantity", "Qty"],
                  ["quoteQuantity", "Quote"],
                  ["fee", "Fee"]
                ].map(([key, label]) => (
                  <th key={key} className="py-3 pr-4">
                    <button type="button" onClick={() => toggleSort(key as SortKey)} className="cursor-pointer text-left hover:text-white">
                      {label}
                    </button>
                  </th>
                ))}
                <th className="py-3 pr-4">Side</th>
                <th className="py-3 pr-4">Order</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 500).map((trade) => (
                <tr key={trade.id} className="border-b border-slate-900 text-slate-300 hover:bg-slate-900/70">
                  <td className="whitespace-nowrap py-3 pr-4 text-slate-400">{formatDateTime(trade.timestamp)}</td>
                  <td className="py-3 pr-4 font-medium text-white">{trade.symbol}</td>
                  <td className="numeric py-3 pr-4">{formatNumber(trade.price, { maximumFractionDigits: 8 })}</td>
                  <td className="numeric py-3 pr-4">{formatNumber(trade.quantity, { maximumFractionDigits: 8 })}</td>
                  <td className="numeric py-3 pr-4">{formatNumber(trade.quoteQuantity)}</td>
                  <td className="numeric py-3 pr-4">{formatNumber(trade.fee, { maximumFractionDigits: 8 })} {trade.feeAsset}</td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-md px-2 py-1 text-xs font-semibold ${trade.side === "BUY" ? "bg-emerald-400/10 text-emerald-200" : "bg-rose-400/10 text-rose-200"}`}>
                      {trade.side}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-slate-500">{trade.orderId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 500 ? <p className="text-xs text-slate-500">Showing first 500 filtered rows for browser performance. Export CSV includes all rows.</p> : null}
      </CardContent>
    </Card>
  );
}

