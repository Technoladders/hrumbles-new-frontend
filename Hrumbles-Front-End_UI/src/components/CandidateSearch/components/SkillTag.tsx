import React from "react";
import { TECH_CAT_MAP, TECH_CATS } from "../constants/technologies";

interface SkillTagProps {
  skill: string;
  onRemove?: () => void;
  onClick?: () => void;
  size?: "xs" | "sm" | "lg";
  className?: string;
}

export const SkillTag: React.FC<SkillTagProps> = ({
  skill,
  onRemove,
  onClick,
  size = "sm",
  className = "",
}) => {
  const cat  = TECH_CAT_MAP[skill] || "Languages";
  const c    = TECH_CATS[cat] || { color: "#475569", bg: "#F8FAFC", border: "#E2E8F0", icon: "•" };

  const padding = size === "lg" ? "5px 12px"
                : size === "xs" ? "1px 6px"
                : "2px 8px";
  const fontSize = size === "lg" ? "0.74rem"
                 : size === "xs" ? "0.6rem"
                 : "0.65rem";

  return (
    <span
      onClick={onClick}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding,
        borderRadius: 5,
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        fontFamily: "var(--font-m)",
        fontSize,
        fontWeight: 500,
        whiteSpace: "nowrap",
        userSelect: "none",
        cursor: onClick ? "pointer" : "default",
        transition: "opacity 0.12s",
      }}
    >
      <span style={{ opacity: 0.55, fontSize: "0.75em" }}>{c.icon}</span>
      {skill}
      {onRemove && (
        <button
          onClick={e => { e.stopPropagation(); onRemove(); }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            color: "inherit",
            opacity: 0.5,
            fontSize: "1em",
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            marginLeft: 1,
          }}
        >
          ×
        </button>
      )}
    </span>
  );
};