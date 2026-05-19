"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useT } from "@/lib/i18n";
import { formatDateTime } from "@/lib/utils/dates";
import { formatNumber } from "@/lib/utils/numbers";
import type { NormalizedTrade, TradeSide } from "@/types";

type SortKey = "timestamp" | "symbol" | "price" | "quantity" | "quoteQuantity" | "fee";

interface TradeTableProps {
  trades: NormalizedTrade[];
  sessionId: string;
}

export function TradeTable({ trades, sessionId }: TradeTableProps) {
  const t = useT();
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
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }} className="lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="tl-card-title">{t.trades.table.title}</h2>
            <p className="tl-card-sub" style={{ marginTop: 4 }}>{t.trades.table.countShown(filtered.length, trades.length)}</p>
          </div>
          <Button variant="secondary" onClick={exportCsv}>
            <Download className="h-4 w-4" aria-hidden="true" />
            {t.trades.table.export}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_160px]" style={{ marginBottom: 18 }}>
          <div style={{ position: "relative" }}>
            <Search style={{ position: "absolute", left: 12, top: 36, width: 16, height: 16, color: "var(--tl-ink-3)", pointerEvents: "none" }} aria-hidden="true" />
            <Input
              label={t.trades.table.searchLabel}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.trades.table.searchPlaceholder}
              style={{ paddingLeft: 36 }}
            />
          </div>
          <label className="block">
            <span className="tl-label">{t.trades.table.symbolLabel}</span>
            <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="tl-input" style={{ cursor: "pointer" }}>
              <option value="ALL">{t.trades.table.allSymbols}</option>
              {symbols.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="tl-label">{t.trades.table.sideLabel}</span>
            <select value={side} onChange={(e) => setSide(e.target.value as TradeSide | "ALL")} className="tl-input" style={{ cursor: "pointer" }}>
              <option value="ALL">{t.trades.table.allSides}</option>
              <option value="BUY">{t.trades.table.buy}</option>
              <option value="SELL">{t.trades.table.sell}</option>
            </select>
          </label>
        </div>

        <div className="tl-table-wrap">
          <table className="tl-table">
            <thead>
              <tr>
                {[
                  ["timestamp", t.trades.table.time],
                  ["symbol", t.trades.table.symbol],
                  ["price", t.trades.table.price],
                  ["quantity", t.trades.table.qty],
                  ["quoteQuantity", t.trades.table.quote],
                  ["fee", t.trades.table.fee]
                ].map(([key, label]) => (
                  <th key={key}>
                    <button type="button" onClick={() => toggleSort(key as SortKey)}>{label}</button>
                  </th>
                ))}
                <th>{t.trades.table.sideCol}</th>
                <th>{t.trades.table.market}</th>
                <th>{t.trades.table.order}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 500).map((trade) => (
                <tr key={trade.id}>
                  <td style={{ whiteSpace: "nowrap", color: "var(--tl-ink-3)" }}>{formatDateTime(trade.timestamp)}</td>
                  <td className="tl-table-symbol">{trade.symbol}</td>
                  <td className="tl-numeric">{formatNumber(trade.price, { maximumFractionDigits: 8 })}</td>
                  <td className="tl-numeric">{formatNumber(trade.quantity, { maximumFractionDigits: 8 })}</td>
                  <td className="tl-numeric">{formatNumber(trade.quoteQuantity)}</td>
                  <td className="tl-numeric">
                    {formatNumber(trade.fee, { maximumFractionDigits: 8 })} {trade.feeAsset}
                  </td>
                  <td>
                    <span className={trade.side === "BUY" ? "tl-pill tl-pill-buy" : "tl-pill tl-pill-sell"}>
                      {trade.side === "BUY" ? t.trades.table.buy : t.trades.table.sell}
                    </span>
                  </td>
                  <td>
                    <span className="tl-pill" style={{ background: "rgba(91, 224, 230, 0.1)", color: "#C7F4F7", borderColor: "rgba(91, 224, 230, 0.3)" }}>
                      {trade.marketType === "spot" ? t.trades.market.spot : trade.marketType === "um_futures" ? t.trades.market.um : t.trades.market.coin}
                    </span>
                  </td>
                  <td style={{ color: "var(--tl-ink-3)" }}>{trade.orderId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 500 ? (
          <p style={{ marginTop: 10, fontSize: 12, color: "var(--tl-ink-3)" }}>{t.trades.table.truncated}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
