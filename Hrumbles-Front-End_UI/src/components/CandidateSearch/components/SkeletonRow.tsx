import React from "react";

const Skel: React.FC<{ w: number | string; h: number; r?: number }> = ({ w, h, r = 4 }) => (
  <div
    className="cs-skel-bg"
    style={{ width: w, height: h, borderRadius: r, background: "#E2E8F0", flexShrink: 0 }}
  />
);

export const SkeletonRow: React.FC = () => (
  <div style={{
    background: "#fff",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "14px 18px",
    display: "flex",
    alignItems: "center",
    gap: 16,
  }}>
    <Skel w={40} h={40} r={9} />
    <div style={{ flex: "0 0 190px" }}>
      <Skel w="55%" h={12} />
      <div style={{ height: 6 }} />
      <Skel w="80%" h={10} />
    </div>
    <div style={{ flex: "0 0 160px" }}>
      <Skel w="70%" h={12} />
      <div style={{ height: 6 }} />
      <Skel w="50%" h={10} />
    </div>
    <div style={{ flex: 1, display: "flex", gap: 6 }}>
      {[72, 60, 78, 54].map((w, i) => <Skel key={i} w={w} h={20} r={5} />)}
    </div>
    <Skel w={56} h={20} r={10} />
  </div>
);

export const SkeletonCard: React.FC = () => (
  <div style={{
    background: "#fff",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "18px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  }}>
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <Skel w={42} h={42} r={10} />
      <div style={{ flex: 1 }}>
        <Skel w="55%" h={13} />
        <div style={{ height: 6 }} />
        <Skel w="75%" h={10} />
      </div>
    </div>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {[68, 54, 72, 58].map((w, i) => <Skel key={i} w={w} h={20} r={5} />)}
    </div>
  </div>
);