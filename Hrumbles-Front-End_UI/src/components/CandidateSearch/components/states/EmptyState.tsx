import React from "react";

interface EmptyStateProps {
  onClearAll: () => void;
}

const TIPS = [
  "Remove one or two skills — start with only the must-haves",
  "Use broader job titles (e.g. 'Engineer' instead of 'Backend Engineer')",
  "Expand location to a full country rather than a city",
  "Remove seniority filters to surface all experience levels",
  "Try closely related technologies (e.g. 'FastAPI' if 'Flask' returns nothing)",
];

export const EmptyState: React.FC<EmptyStateProps> = ({ onClearAll }) => (
  <div style={{
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    minHeight: "58vh", textAlign: "center",
    animation: "cs-fadeUp 0.4s ease",
    padding: "0 24px",
  }}>
    <div style={{ fontSize: "3rem", marginBottom: 18 }}>🌐</div>
    <div style={{ fontFamily: "var(--font-d)", fontSize: "1.3rem", fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>
      No matches for this combination
    </div>
    <div style={{ fontSize: "0.84rem", color: "var(--text-2)", maxWidth: 360, lineHeight: 1.75, marginBottom: 28 }}>
      Your filter combination returned zero results. Adjust a few parameters below to widen the search.
    </div>

    <div style={{
      padding: "18px 22px", borderRadius: 12, background: "#fff",
      border: "1px solid var(--border)", maxWidth: 380, width: "100%", textAlign: "left",
    }}>
      <div style={{ fontFamily: "var(--font-d)", fontSize: "0.8rem", fontWeight: 700, color: "var(--text)", marginBottom: 14 }}>
        How to broaden your search
      </div>
      {TIPS.map((tip, i) => (
        <div key={i} style={{ fontSize: "0.76rem", color: "var(--text-2)", display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 9 }}>
          <span style={{ color: "#2563EB", flexShrink: 0, fontWeight: 700 }}>→</span>
          {tip}
        </div>
      ))}
    </div>

    <button
      onClick={onClearAll}
      style={{
        marginTop: 18, padding: "9px 22px", borderRadius: 9,
        border: "1px solid rgba(37,99,235,0.25)", background: "rgba(37,99,235,0.05)",
        color: "#2563EB", fontFamily: "var(--font-b)", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
      }}
    >
      Reset all filters
    </button>
  </div>
);