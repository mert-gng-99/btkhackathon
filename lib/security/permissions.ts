import type { BinanceApiRestrictionsResponse } from "@/lib/binance/binanceTypes";

export interface ReadOnlyValidation {
  isReadOnly: boolean;
  blockers: string[];
  warnings: string[];
}

export function validateReadOnlyPermissions(restrictions: BinanceApiRestrictionsResponse): ReadOnlyValidation {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (restrictions.enableReading !== true) {
    blockers.push("Enable Reading must be enabled for read-only trade analysis.");
  }

  const riskyFlags: Array<[keyof BinanceApiRestrictionsResponse, string]> = [
    ["enableSpotAndMarginTrading", "Spot & Margin Trading"],
    ["enableWithdrawals", "Withdrawals"],
    ["enableInternalTransfer", "Internal Transfer"],
    ["permitsUniversalTransfer", "Universal Transfer"],
    ["enableMargin", "Margin"],
    ["enableFutures", "Futures"],
    ["enableVanillaOptions", "Vanilla Options"],
    ["enableFixApiTrade", "FIX API Trade"],
    ["enablePortfolioMarginTrading", "Portfolio Margin Trading"]
  ];

  for (const [flag, label] of riskyFlags) {
    if (restrictions[flag] === true) {
      blockers.push(`${label} permission is enabled. Disable it and keep only Enable Reading for this app.`);
    }
  }

  if (restrictions.ipRestrict === false) {
    warnings.push("This API key is not restricted to trusted IPs. Read-only analysis can continue, but IP restriction is safer when you deploy.");
  }

  return {
    isReadOnly: blockers.length === 0,
    blockers,
    warnings
  };
}
