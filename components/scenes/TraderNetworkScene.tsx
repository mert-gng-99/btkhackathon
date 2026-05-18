"use client";

export function TraderNetworkScene() {
  // You = center amber node, peers = surrounding cyan nodes.
  const cx = 240;
  const cy = 180;
  const peers = [
    { x: 80, y: 70 },
    { x: 400, y: 60 },
    { x: 100, y: 290 },
    { x: 410, y: 300 },
    { x: 250, y: 50 },
    { x: 240, y: 320 }
  ];

  return (
    <div className="tl-scene-network">
      <svg viewBox="0 0 480 360" preserveAspectRatio="xMidYMid meet">
        {/* Edges first so nodes render on top */}
        {peers.map((p, i) => (
          <line key={`edge-${i}`} className="edge" x1={cx} y1={cy} x2={p.x} y2={p.y} />
        ))}

        {/* Concentric guide rings */}
        <circle cx={cx} cy={cy} r="80" fill="none" stroke="rgba(255,255,255,0.05)" />
        <circle cx={cx} cy={cy} r="135" fill="none" stroke="rgba(255,255,255,0.04)" />

        {/* You — center */}
        <circle className="node you" cx={cx} cy={cy} r="14" />
        <circle className="pulse-ring" cx={cx} cy={cy} r="18" />

        {/* Peers */}
        {peers.map((p, i) => (
          <circle key={`node-${i}`} className="node" cx={p.x} cy={p.y} r="9" />
        ))}
      </svg>
    </div>
  );
}
