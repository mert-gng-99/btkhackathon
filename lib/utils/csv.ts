import type { NormalizedTrade } from "@/types";

function escapeCsv(value: string | number | boolean): string {
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function tradesToCsv(trades: NormalizedTrade[]): string {
  const headers = [
    "timestamp",
    "exchange",
    "marketType",
    "symbol",
    "side",
    "price",
    "quantity",
    "quoteQuantity",
    "fee",
    "feeAsset",
    "orderId",
    "tradeId",
    "isMaker"
  ];

  const rows = trades.map((trade) =>
    [
      trade.timestamp,
      trade.exchange,
      trade.marketType,
      trade.symbol,
      trade.side,
      trade.price,
      trade.quantity,
      trade.quoteQuantity,
      trade.fee,
      trade.feeAsset,
      trade.orderId,
      trade.tradeId,
      trade.isMaker
    ]
      .map(escapeCsv)
      .join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}
