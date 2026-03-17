import React from "react";
import { ApolloCandidate } from "../types";
import { SkillTag } from "./SkillTag";

const AVATAR_PALETTE = [
  "#2563EB","#7C3AED","#0891B2","#059669",
  "#DC2626","#D97706","#DB2777","#EA580C",
];

const avatarColor = (id: string) =>
  AVATAR_PALETTE[parseInt(id.replace(/\D/g, "").slice(-2) || "0") % AVATAR_PALETTE.length];

const initials = (fn: string, ln: string) =>
  ((fn?.[0] || "") + (ln?.[0] || "")).toUpperCase();

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  } catch { return ""; }
};

interface CandidateRowProps {
  candidate: ApolloCandidate;
  matchedSkills: string[];     // the skills used as search filters — shown as "Matched via"
  selected: boolean;
  onClick: () => void;
  view: "list" | "card";
}

export const CandidateRow: React.FC<CandidateRowProps> = ({
  candidate: c,
  matchedSkills,
  selected,
  onClick,
  view,
}) => {
  const color  = avatarColor(c.id);
  const init   = initials(c.first_name, c.last_name_obfuscated);
  const title  = c.title || "Title not listed";
  const org    = c.organization?.name || "—";

  // Build location hint from boolean flags
  const locParts: string[] = [];
  if (c.has_city)    locParts.push("City");
  if (c.has_state)   locParts.push("State");
  if (c.has_country) locParts.push("Country");
  const locLabel = locParts.length ? `📍 Location on file` : "📍 Location unavailable";

  const selectedStyle: React.CSSProperties = selected
    ? { background: "#EFF6FF", border: "1.5px solid #2563EB", boxShadow: "0 0 0 3px rgba(37,99,235,0.1)" }
    : { background: "#fff", border: "1.5px solid var(--border)" };

  if (view === "card") {
    return (
      <div
        onClick={onClick}
        className="cs-card"
        style={{
          ...selectedStyle,
          borderRadius: 12,
          padding: "18px",
          cursor: "pointer",
          transition: "all 0.15s ease",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10, flexShrink: 0,
            background: color, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "0.88rem", fontWeight: 800,
            color: "#fff", fontFamily: "var(--font-d)",
          }}>
            {init}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text)" }}>
              {c.first_name} {c.last_name_obfuscated}
            </div>
            <div style={{ fontSize: "0.74rem", color: "#2563EB", fontWeight: 500, marginTop: 2 }}>
              {title}
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-3)", marginTop: 3 }}>
              {org} · {locLabel}
            </div>
          </div>
          {c.has_email && (
            <span style={{
              fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.5px", padding: "3px 8px", borderRadius: 20,
              background: "rgba(16,185,129,0.08)", color: "#059669",
              border: "1px solid rgba(16,185,129,0.22)", whiteSpace: "nowrap",
            }}>
              ✓ Contact
            </span>
          )}
        </div>

        {/* Matched skills */}
        {matchedSkills.length > 0 && (
          <div>
            <div style={{ fontSize: "0.56rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-3)", marginBottom: 5 }}>
              Matched via
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {matchedSkills.map(s => <SkillTag key={s} skill={s} />)}
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 4 }}>
          <span style={{ fontSize: "0.62rem", color: "var(--text-3)", fontFamily: "var(--font-m)" }}>
            Updated {formatDate(c.last_refreshed_at)}
          </span>
          <span style={{ fontSize: "0.64rem", color: "#2563EB", fontFamily: "var(--font-m)", fontWeight: 600 }}>
            VIEW →
          </span>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div
      onClick={onClick}
      className="cs-row"
      style={{
        ...selectedStyle,
        borderRadius: 10,
        padding: "12px 18px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 16,
        transition: "border-color 0.14s ease",
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 9, flexShrink: 0,
        background: color, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: "0.82rem", fontWeight: 800,
        color: "#fff", fontFamily: "var(--font-d)",
      }}>
        {init}
      </div>

      <div style={{ flex: "0 0 190px", minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: "0.86rem", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {c.first_name} {c.last_name_obfuscated}
        </div>
        <div style={{ fontSize: "0.71rem", color: "var(--text-2)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {title}
        </div>
      </div>

      <div style={{ flex: "0 0 170px", minWidth: 0 }}>
        <div style={{ fontSize: "0.78rem", fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {org}
        </div>
        <div style={{ fontSize: "0.68rem", color: "var(--text-3)", marginTop: 2 }}>
          {locLabel}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: 4, overflow: "hidden" }}>
        {matchedSkills.slice(0, 4).map(s => <SkillTag key={s} skill={s} />)}
        {matchedSkills.length > 4 && (
          <span style={{ fontSize: "0.62rem", color: "var(--text-3)", fontFamily: "var(--font-m)", alignSelf: "center" }}>
            +{matchedSkills.length - 4}
          </span>
        )}
      </div>

      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
        {c.has_email && (
          <span
            title="Contact data available"
            style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981", display: "block" }}
          />
        )}
        {c.has_direct_phone === "Yes" && (
          <span
            title="Direct phone available"
            style={{ fontSize: "0.65rem", color: "var(--text-3)" }}
          >
            📞
          </span>
        )}
        <span style={{ fontSize: "0.62rem", color: "var(--text-3)", fontFamily: "var(--font-m)" }}>
          VIEW →
        </span>
      </div>
    </div>
  );
};