import React from "react";
import { TECH_CATS } from "../../constants/technologies";
import { QUICK_SEARCHES } from "../../constants/filters";

interface IdleStateProps {
  onQuickSearch: (skills: string[]) => void;
}

export const IdleState: React.FC<IdleStateProps> = ({ onQuickSearch }) => (
  <div style={{
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    minHeight: "64vh", textAlign: "center",
    animation: "cs-fadeUp 0.5s ease",
    padding: "0 24px",
  }}>
    <div style={{
      width: 76, height: 76, borderRadius: 22,
      background: "linear-gradient(135deg,#EFF6FF,#E0F2FE)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "2.2rem", marginBottom: 26,
      boxShadow: "0 8px 28px rgba(37,99,235,0.1)",
    }}>
      🔍
    </div>

    <div style={{ fontFamily: "var(--font-d)", fontSize: "1.55rem", fontWeight: 800, color: "var(--text)", marginBottom: 10, letterSpacing: "-0.3px" }}>
      Find candidates by tech stack
    </div>
    <div style={{ fontSize: "0.86rem", color: "var(--text-2)", maxWidth: 440, lineHeight: 1.75, marginBottom: 10 }}>
      Specify the exact technologies you need — Python, Kubernetes, PyTorch, or 1,500+ more —
      and instantly surface professionals with those verified skills.
    </div>
    <div style={{ fontSize: "0.76rem", color: "var(--text-3)", marginBottom: 32, fontFamily: "var(--font-m)" }}>
      Results show first name + obfuscated last name. Use enrichment for full contact details.
    </div>

    {/* Quick search presets */}
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginBottom: 48 }}>
      {QUICK_SEARCHES.map(p => (
        <button
          key={p.label}
          onClick={() => onQuickSearch(p.skills)}
          className="cs-qs-btn"
          style={{
            padding: "9px 16px", borderRadius: 10, background: "#fff",
            border: "1px solid var(--border)", cursor: "pointer",
            fontFamily: "var(--font-b)", fontSize: "0.78rem", color: "var(--text-2)",
            transition: "all 0.15s",
          }}
        >
          Try: <strong>{p.label}</strong> →
        </button>
      ))}
    </div>

    {/* Category legend */}
    <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center", maxWidth: 540 }}>
      {Object.entries(TECH_CATS).map(([cat, c]) => (
        <span key={cat} style={{
          padding: "4px 12px", borderRadius: 20,
          background: c.bg, color: c.color, border: `1px solid ${c.border}`,
          fontFamily: "var(--font-m)", fontSize: "0.62rem", fontWeight: 500,
        }}>
          {c.icon} {cat}
        </span>
      ))}
    </div>
  </div>
);