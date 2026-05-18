import type { NormalizedTrade } from "@/types";

const SYMBOLS = [
  { symbol: "BTCUSDT", basePrice: 67500 },
  { symbol: "ETHUSDT", basePrice: 3550 },
  { symbol: "SOLUSDT", basePrice: 155 },
  { symbol: "BNBUSDT", basePrice: 590 },
  { symbol: "LINKUSDT", basePrice: 16 }
];

function seededRandom(seed: number): number {
  const value = Math.sin(seed) * 10000;
  return value - Math.floor(value);
}

export function buildDemoTrades(): NormalizedTrade[] {
  const trades: NormalizedTrade[] = [];
  const start = Date.now() - 45 * 24 * 60 * 60 * 1000;
  let orderId = 100000;
  let tradeId = 500000;

  for (let index = 0; index < 144; index += 1) {
    const symbolMeta = SYMBOLS[index % SYMBOLS.length];
    const cluster = index % 9 === 0;
    const hourBias = index % 5 === 0 ? 2 : (9 + index * 3) % 24;
    const timestamp = new Date(start + index * 7.5 * 60 * 60 * 1000 + hourBias * 60 * 60 * 1000 + (cluster ? 12 * 60 * 1000 : 0));
    const side = index % 3 === 0 || index % 11 === 0 ? "SELL" : "BUY";
    const volatility = (seededRandom(index + 8) - 0.42) * 0.08;
    const price = symbolMeta.basePrice * (1 + volatility + index * 0.0009);
    const quoteQuantity = 65 + seededRandom(index + 40) * 900 + (index % 17 === 0 ? 1800 : 0);
    const quantity = quoteQuantity / price;
    const fee = quoteQuantity * 0.001;

    trades.push({
      id: `demo:binance:${symbolMeta.symbol}:${tradeId}`,
      sessionId: "demo",
      exchange: "binance",
      symbol: symbolMeta.symbol,
      orderId: String(orderId),
      tradeId: String(tradeId),
      side,
      price: Number(price.toFixed(symbolMeta.symbol === "BTCUSDT" ? 2 : 4)),
      quantity: Number(quantity.toFixed(8)),
      quoteQuantity: Number(quoteQuantity.toFixed(2)),
      fee: Number(fee.toFixed(6)),
      feeAsset: index % 7 === 0 ? "BNB" : "USDT",
      timestamp: timestamp.toISOString(),
      isBuyer: side === "BUY",
      isMaker: index % 4 === 0
    });

    orderId += 1;
    tradeId += 1;
  }

  return trades.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

