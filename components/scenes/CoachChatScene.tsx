"use client";

import { useT } from "@/lib/i18n";

export function CoachChatScene() {
  const t = useT();
  const phone = t.home.coach.phone;
  return (
    <div className="tl-scene-coach">
      <div className="bubble user">{phone.msg1}</div>
      <div className="bubble ai first">
        {phone.msg2Pre}
        <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", color: "var(--tl-amber)" }}>38.2K</span>
        {phone.msg2Mid}
        <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}>3.1×</span>
        {phone.msg2Mid2}
        <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}>0.04%</span>
        {phone.msg2End}
        <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", color: "var(--tl-amber)" }}>+15.3 USDT</span>
        {phone.msg2End2}
        <div className="cites">
          <span className="cite">{phone.cite1}</span>
          <span className="cite">{phone.cite2}</span>
          <span className="cite">{phone.cite3}</span>
        </div>
      </div>
      <div className="bubble user">{phone.msg3}</div>
      <div className="typing" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
