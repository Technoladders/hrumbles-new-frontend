import React from "react";
import { SkillTag } from "./SkillTag";

interface ActiveFilterBarProps {
  skills: string[];
  titles: string[];
  locations: string[];
  seniorities: string[];
  onRemoveSkill: (s: string) => void;
  onRemoveTitle: (t: string) => void;
  onRemoveLocation: (l: string) => void;
  onRemoveSeniority: (s: string) => void;
}

const RemoveChip: React.FC<{
  label: string;
  color: string;
  bg: string;
  border: string;
  onRemove: () => void;
}> = ({ label, color, bg, border, onRemove }) => (
  <span
    className="cs-chip-in"
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "2px 9px",
      borderRadius: 20,
      background: bg,
      border: `1px solid ${border}`,
      fontSize: "0.65rem",
      color,
      fontWeight: 500,
      fontFamily: "var(--font-b)",
      whiteSpace: "nowrap",
    }}
  >
    {label}
    <button
      onClick={onRemove}
      style={{
        background: "none", border: "none", cursor: "pointer",
        padding: 0, color: "inherit", opacity: 0.55, fontSize: "0.95rem", lineHeight: 1,
      }}
    >
      ×
    </button>
  </span>
);

export const ActiveFilterBar: React.FC<ActiveFilterBarProps> = ({
  skills, titles, locations, seniorities,
  onRemoveSkill, onRemoveTitle, onRemoveLocation, onRemoveSeniority,
}) => {
  const total = skills.length + titles.length + locations.length + seniorities.length;
  if (!total) return null;

  return (
    <div style={{
      padding: "8px 24px",
      background: "#fff",
      borderBottom: "1px solid var(--border)",
      display: "flex",
      alignItems: "center",
      gap: 7,
      flexWrap: "wrap",
      minHeight: 44,
    }}>
      <span style={{
        fontFamily: "var(--font-m)",
        fontSize: "0.56rem",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "1.2px",
        color: "var(--text-3)",
        whiteSpace: "nowrap",
      }}>
        Active filters:
      </span>

      {skills.map(s => (
        <span key={s} className="cs-chip-in">
          <SkillTag skill={s} onRemove={() => onRemoveSkill(s)} size="xs" />
        </span>
      ))}

      {titles.map(t => (
        <RemoveChip
          key={t} label={`🎯 ${t}`}
          color="#6D28D9" bg="rgba(124,58,237,0.08)" border="rgba(124,58,237,0.22)"
          onRemove={() => onRemoveTitle(t)}
        />
      ))}

      {locations.map(l => (
        <RemoveChip
          key={l} label={`📍 ${l}`}
          color="#0E7490" bg="rgba(8,145,178,0.08)" border="rgba(8,145,178,0.22)"
          onRemove={() => onRemoveLocation(l)}
        />
      ))}

      {seniorities.map(s => (
        <RemoveChip
          key={s} label={s.replace("_", " ")}
          color="#1D4ED8" bg="rgba(37,99,235,0.08)" border="rgba(37,99,235,0.22)"
          onRemove={() => onRemoveSeniority(s)}
        />
      ))}
    </div>
  );
};