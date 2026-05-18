export interface BinancePermissionShape {
  canTrade?: boolean;
  canWithdraw?: boolean;
  canDeposit?: boolean;
  permissions?: string[];
}

export interface ReadOnlyValidation {
  isReadOnly: boolean;
  blockers: string[];
  warnings: string[];
}

export function validateReadOnlyPermissions(account: BinancePermissionShape): ReadOnlyValidation {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (account.canTrade === true) {
    blockers.push("This API key appears to allow trading. Create a Binance API key with trading disabled.");
  }

  if (account.canWithdraw === true) {
    blockers.push("This API key appears to allow withdrawals. Withdrawal permission must be disabled.");
  }

  if (!Array.isArray(account.permissions)) {
    warnings.push("Binance did not return a detailed permissions list. The app still blocks trading and withdrawal flags when visible.");
  }

  return {
    isReadOnly: blockers.length === 0,
    blockers,
    warnings
  };
}

