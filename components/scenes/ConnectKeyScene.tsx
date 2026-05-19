"use client";

import { useT } from "@/lib/i18n";

export function ConnectKeyScene() {
  const t = useT();
  const k = t.home.security.keyCard;
  return (
    <div className="tl-scene-keys">
      <div className="keycard">
        <div className="row">
          <span className="k">{k.apiKey}</span>
          <span className="v">····7F4A · 9E2C</span>
        </div>
        <div className="row">
          <span className="k">{k.accountScope}</span>
          <span className="v">{k.scopeValue}</span>
        </div>
        <div className="row denied">
          <span className="k">{k.enableTrading}</span>
          <span className="v">{k.denied}</span>
        </div>
        <div className="row denied">
          <span className="k">{k.enableWithdrawals}</span>
          <span className="v">{k.denied}</span>
        </div>
        <div className="row ok">
          <span className="k">{k.enableReading}</span>
          <span className="v">{k.ok}</span>
        </div>
        <span className="stamp" aria-hidden="true">✓</span>
      </div>
    </div>
  );
}
