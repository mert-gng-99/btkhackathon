export const STABLE_QUOTE_ASSETS = ["USDT", "USDC", "BUSD", "FDUSD", "TUSD", "DAI"];

export function splitSymbol(symbol: string): { baseAsset: string; quoteAsset: string } {
  const quoteAsset = STABLE_QUOTE_ASSETS.find((asset) => symbol.endsWith(asset));

  if (quoteAsset) {
    return {
      baseAsset: symbol.slice(0, -quoteAsset.length),
      quoteAsset
    };
  }

  return {
    baseAsset: symbol.slice(0, Math.max(0, symbol.length - 3)),
    quoteAsset: symbol.slice(-3)
  };
}

