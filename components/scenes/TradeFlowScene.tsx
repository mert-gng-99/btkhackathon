"use client";

const TOP = [
  { sym: "BTCUSDT", side: "buy", amt: "+0.024" },
  { sym: "ETHUSDT", side: "sell", amt: "-0.42" },
  { sym: "SOLUSDT", side: "buy", amt: "+3.10" },
  { sym: "BNBUSDT", side: "buy", amt: "+0.15" },
  { sym: "ARBUSDT", side: "sell", amt: "-128.4" },
  { sym: "OPUSDT", side: "buy", amt: "+82.5" },
  { sym: "AVAXUSDT", side: "sell", amt: "-12.3" },
  { sym: "LINKUSDT", side: "buy", amt: "+24.8" }
];

const BOTTOM = [
  { sym: "DOGEUSDT", side: "buy", amt: "+1,420" },
  { sym: "XRPUSDT", side: "sell", amt: "-300" },
  { sym: "ADAUSDT", side: "buy", amt: "+540" },
  { sym: "MATICUSDT", side: "sell", amt: "-210" },
  { sym: "ATOMUSDT", side: "buy", amt: "+18.7" },
  { sym: "LTCUSDT", side: "sell", amt: "-0.85" },
  { sym: "TRXUSDT", side: "buy", amt: "+1,200" },
  { sym: "NEARUSDT", side: "sell", amt: "-92.4" }
];

function Row({ sym, side, amt }: { sym: string; side: string; amt: string }) {
  return (
    <span className={`row ${side}`}>
      <span className="dot" />
      <span style={{ color: "var(--tl-ink)" }}>{sym}</span>
      <span>{amt}</span>
    </span>
  );
}

export function TradeFlowScene() {
  return (
    <div className="tl-scene-trades">
      <div className="tape">
        <div className="track">
          {[...TOP, ...TOP, ...TOP].map((r, i) => (
            <Row key={`t-${i}`} {...r} />
          ))}
        </div>
      </div>
      <div className="tape">
        <div className="track">
          {[...BOTTOM, ...BOTTOM, ...BOTTOM].map((r, i) => (
            <Row key={`b-${i}`} {...r} />
          ))}
        </div>
      </div>
      <div className="tape">
        <div className="track">
          {[...TOP.slice().reverse(), ...TOP.slice().reverse(), ...TOP.slice().reverse()].map((r, i) => (
            <Row key={`m-${i}`} {...r} />
          ))}
        </div>
      </div>
    </div>
  );
}
